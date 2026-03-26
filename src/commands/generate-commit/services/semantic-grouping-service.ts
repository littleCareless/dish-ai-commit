import { AIModel, AIProvider, AIRequestParams } from "@/ai/types";
import { SemanticCommitGroup } from "@/commands/generate-commit/types";
import { normalizeCommitMessage } from "@/commands/generate-commit/utils/commit-formatter";
import { Logger } from "@/utils/logger";
import * as path from "path";
import { z } from "zod";

const RawSemanticGroupSchema = z.object({
  title: z.string().trim().min(1),
  reason: z.string().trim().optional().default(""),
  files: z.array(z.string().trim().min(1)).min(1),
  commitMessage: z.string().trim().optional().default(""),
});

const RawSemanticGroupingResponseSchema = z.object({
  groups: z.array(RawSemanticGroupSchema).min(1),
});

type RawSemanticGroup = z.infer<typeof RawSemanticGroupSchema>;

interface FileChangeDescription {
  filePath: string;
  description: string;
}

export interface SemanticGroupingInput {
  aiProvider: AIProvider;
  requestParams: AIRequestParams;
  selectedModel: AIModel;
  fileChanges: FileChangeDescription[];
  repositoryPath?: string;
  language: string;
}

interface FileLookup {
  full: Map<string, string>;
  relative: Map<string, string[]>;
  baseName: Map<string, string[]>;
}

const CHINESE_LANGUAGE_PATTERN = /(chinese|中文|汉语|简体|繁体)/i;

export class SemanticGroupingService {
  constructor(private readonly logger: Logger) {}

  async groupChanges(input: SemanticGroupingInput): Promise<SemanticCommitGroup[]> {
    if (input.fileChanges.length <= 1) {
      return this.buildHeuristicGroups(
        input.fileChanges,
        input.repositoryPath,
        input.language,
      );
    }

    const fallbackGroups = this.buildHeuristicGroups(
      input.fileChanges,
      input.repositoryPath,
      input.language,
    );

    try {
      const rawGroups = await this.groupWithAI(input);
      const normalizedGroups = this.normalizeGroups(
        rawGroups,
        input.fileChanges,
        input.repositoryPath,
        input.language,
      );

      if (normalizedGroups.length >= 2) {
        return normalizedGroups;
      }

      if (normalizedGroups.length === 1 && input.fileChanges.length <= 6) {
        return normalizedGroups;
      }

      return fallbackGroups;
    } catch (error) {
      this.logger.warn("Semantic grouping generation failed, fallback to heuristic groups", {
        operation: "SemanticGroupingService.groupChanges",
        data: {
          error: error instanceof Error ? error.message : String(error),
          fileCount: input.fileChanges.length,
        },
      });
      return fallbackGroups;
    }
  }

  private async groupWithAI(input: SemanticGroupingInput): Promise<RawSemanticGroup[]> {
    const response = await input.aiProvider.generateCommit({
      ...input.requestParams,
      model: input.selectedModel,
      diff: "",
      messages: [
        {
          role: "system",
          content: this.buildSystemPrompt(input.language),
        },
        {
          role: "user",
          content: this.buildUserPrompt(input.fileChanges, input.repositoryPath),
        },
      ],
    });

    return this.parseAIResponse(response.content);
  }

  private buildSystemPrompt(language: string): string {
    return [
      "You are a commit-planning assistant.",
      `All natural language fields MUST be in ${language}.`,
      "Return strict JSON only and do not include markdown fences or any additional text.",
      "JSON schema:",
      '{ "groups": [ { "title": "string", "reason": "string", "files": ["path"], "commitMessage": "conventional commit subject line" } ] }',
      "Rules:",
      "1) Group files by semantic intent, not by alphabetical order.",
      "2) Keep group count between 2 and 8 when possible.",
      "3) Every file must appear exactly once in groups.files.",
      "4) commitMessage must be one single-line conventional commit subject.",
      "5) Do not invent file paths.",
    ].join("\n");
  }

  private buildUserPrompt(
    fileChanges: FileChangeDescription[],
    repositoryPath?: string,
  ): string {
    const lines = fileChanges.map((item, index) => {
      const relativePath = this.toRelativePath(item.filePath, repositoryPath);
      const extension = path.extname(relativePath).replace(/^\./, "") || "none";
      const directory = path.dirname(relativePath);
      const normalizedDirectory =
        directory === "." || directory === "" ? "(root)" : directory;

      return [
        `${index + 1}. path="${relativePath}"`,
        `dir="${normalizedDirectory}"`,
        `ext="${extension}"`,
        `description="${this.escapePromptText(item.description)}"`,
      ].join(" | ");
    });

    return [
      "Analyze these changed files and group them for separate commits:",
      lines.join("\n"),
      "",
      "Output JSON only.",
    ].join("\n");
  }

  private parseAIResponse(content: string): RawSemanticGroup[] {
    const candidates = this.extractJsonCandidates(content);
    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);
        const normalizedPayload = Array.isArray(parsed)
          ? { groups: parsed }
          : parsed;
        const result =
          RawSemanticGroupingResponseSchema.safeParse(normalizedPayload);
        if (result.success) {
          return result.data.groups;
        }
      } catch {
        continue;
      }
    }

    throw new Error("Semantic grouping JSON parse failed");
  }

  private extractJsonCandidates(content: string): string[] {
    const candidates: string[] = [];
    const trimmed = (content || "").trim();
    if (trimmed) {
      candidates.push(trimmed);
    }

    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (codeBlockMatch?.[1]?.trim()) {
      candidates.push(codeBlockMatch[1].trim());
    }

    const objectStart = trimmed.indexOf("{");
    const objectEnd = trimmed.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) {
      candidates.push(trimmed.slice(objectStart, objectEnd + 1));
    }

    const arrayStart = trimmed.indexOf("[");
    const arrayEnd = trimmed.lastIndexOf("]");
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      candidates.push(trimmed.slice(arrayStart, arrayEnd + 1));
    }

    return [...new Set(candidates)];
  }

  private normalizeGroups(
    rawGroups: RawSemanticGroup[],
    fileChanges: FileChangeDescription[],
    repositoryPath: string | undefined,
    language: string,
  ): SemanticCommitGroup[] {
    const lookup = this.buildFileLookup(fileChanges, repositoryPath);
    const fileDescriptions = new Map(
      fileChanges.map((item) => [item.filePath, item.description]),
    );
    const consumed = new Set<string>();
    const normalizedGroups: SemanticCommitGroup[] = [];

    for (const rawGroup of rawGroups) {
      const resolvedFiles: string[] = [];
      for (const file of rawGroup.files) {
        const resolved = this.resolveFilePath(file, lookup, repositoryPath);
        if (!resolved || consumed.has(resolved)) {
          continue;
        }
        consumed.add(resolved);
        resolvedFiles.push(resolved);
      }

      if (resolvedFiles.length === 0) {
        continue;
      }

      const title = this.normalizeTitle(
        rawGroup.title,
        resolvedFiles[0],
        repositoryPath,
      );
      const reason = rawGroup.reason?.trim() || title;
      const commitMessage = this.normalizeGroupCommitMessage(
        rawGroup.commitMessage,
        title,
        resolvedFiles,
        fileDescriptions,
        language,
      );

      normalizedGroups.push({
        id: `group-${normalizedGroups.length + 1}`,
        title,
        reason,
        files: resolvedFiles,
        commitMessage,
      });
    }

    const missingFiles = fileChanges
      .map((item) => item.filePath)
      .filter((filePath) => !consumed.has(filePath));

    if (missingFiles.length > 0) {
      normalizedGroups.push(
        this.buildFallbackGroup(
          normalizedGroups.length + 1,
          "misc",
          missingFiles,
          fileDescriptions,
          language,
          repositoryPath,
        ),
      );
    }

    return normalizedGroups;
  }

  private buildFileLookup(
    fileChanges: FileChangeDescription[],
    repositoryPath?: string,
  ): FileLookup {
    const lookup: FileLookup = {
      full: new Map<string, string>(),
      relative: new Map<string, string[]>(),
      baseName: new Map<string, string[]>(),
    };

    for (const item of fileChanges) {
      const normalizedFull = this.normalizePath(item.filePath);
      lookup.full.set(normalizedFull, item.filePath);

      const relativePath = this.toRelativePath(item.filePath, repositoryPath);
      const normalizedRelative = this.normalizePath(relativePath);
      const relativeEntries = lookup.relative.get(normalizedRelative) ?? [];
      relativeEntries.push(item.filePath);
      lookup.relative.set(normalizedRelative, relativeEntries);

      const baseName = path.basename(normalizedRelative);
      const baseNameEntries = lookup.baseName.get(baseName) ?? [];
      baseNameEntries.push(item.filePath);
      lookup.baseName.set(baseName, baseNameEntries);
    }

    return lookup;
  }

  private resolveFilePath(
    candidate: string,
    lookup: FileLookup,
    repositoryPath?: string,
  ): string | undefined {
    const normalizedCandidate = this.normalizePath(candidate);

    const fromFull = lookup.full.get(normalizedCandidate);
    if (fromFull) {
      return fromFull;
    }

    const relativeCandidates = lookup.relative.get(normalizedCandidate);
    if (relativeCandidates?.length === 1) {
      return relativeCandidates[0];
    }

    if (repositoryPath && path.isAbsolute(candidate)) {
      const relative = this.normalizePath(path.relative(repositoryPath, candidate));
      const fromRelative = lookup.relative.get(relative);
      if (fromRelative?.length === 1) {
        return fromRelative[0];
      }
    }

    const suffixMatches = Array.from(lookup.relative.entries())
      .filter(([relativePath]) => {
        return (
          relativePath === normalizedCandidate ||
          relativePath.endsWith(`/${normalizedCandidate}`) ||
          normalizedCandidate.endsWith(`/${relativePath}`)
        );
      })
      .flatMap(([, files]) => files);

    if (suffixMatches.length === 1) {
      return suffixMatches[0];
    }

    const baseName = path.basename(normalizedCandidate);
    const fromBaseName = lookup.baseName.get(baseName);
    if (fromBaseName?.length === 1) {
      return fromBaseName[0];
    }

    return undefined;
  }

  private buildHeuristicGroups(
    fileChanges: FileChangeDescription[],
    repositoryPath: string | undefined,
    language: string,
  ): SemanticCommitGroup[] {
    const descriptionMap = new Map(
      fileChanges.map((item) => [item.filePath, item.description]),
    );
    const topLevelBuckets = new Map<string, string[]>();

    for (const item of fileChanges) {
      const relativePath = this.toRelativePath(item.filePath, repositoryPath);
      const segments = this.normalizePath(relativePath).split("/").filter(Boolean);
      const key =
        segments.length > 1
          ? segments[0]
          : path.extname(relativePath).replace(/^\./, "") || "root";
      const bucket = topLevelBuckets.get(key) ?? [];
      bucket.push(item.filePath);
      topLevelBuckets.set(key, bucket);
    }

    let effectiveBuckets = topLevelBuckets;
    if (effectiveBuckets.size <= 1 && fileChanges.length > 6) {
      const extensionBuckets = new Map<string, string[]>();
      for (const item of fileChanges) {
        const extension =
          path.extname(item.filePath).replace(/^\./, "").toLowerCase() || "misc";
        const bucket = extensionBuckets.get(extension) ?? [];
        bucket.push(item.filePath);
        extensionBuckets.set(extension, bucket);
      }
      if (extensionBuckets.size > 1) {
        effectiveBuckets = extensionBuckets;
      }
    }

    const groups: SemanticCommitGroup[] = [];
    for (const [key, files] of effectiveBuckets.entries()) {
      groups.push(
        this.buildFallbackGroup(
          groups.length + 1,
          key,
          files,
          descriptionMap,
          language,
          repositoryPath,
        ),
      );
    }

    if (groups.length === 0 && fileChanges.length > 0) {
      groups.push(
        this.buildFallbackGroup(
          1,
          "changes",
          fileChanges.map((item) => item.filePath),
          descriptionMap,
          language,
          repositoryPath,
        ),
      );
    }

    return groups;
  }

  private buildFallbackGroup(
    index: number,
    key: string,
    files: string[],
    descriptions: Map<string, string>,
    language: string,
    repositoryPath?: string,
  ): SemanticCommitGroup {
    const normalizedKey = this.normalizePath(key) || "changes";
    const title = normalizedKey === "root" ? "root" : normalizedKey;
    const reason = this.buildFallbackReason(title, files, repositoryPath, language);
    const commitMessage = this.normalizeGroupCommitMessage(
      "",
      title,
      files,
      descriptions,
      language,
    );

    return {
      id: `group-${index}`,
      title,
      reason,
      files,
      commitMessage,
    };
  }

  private buildFallbackReason(
    title: string,
    files: string[],
    repositoryPath: string | undefined,
    language: string,
  ): string {
    if (this.isChineseLanguage(language)) {
      const preview = files
        .slice(0, 3)
        .map((file) => this.toRelativePath(file, repositoryPath))
        .join("、");
      const suffix = files.length > 3 ? "等文件" : "";
      return `按路径/类型分组：${preview}${suffix}`;
    }

    return `Grouped by related area "${title}" based on file paths and change type.`;
  }

  private normalizeTitle(
    title: string,
    fallbackFilePath: string,
    repositoryPath?: string,
  ): string {
    const normalized = title?.trim();
    if (normalized) {
      return normalized;
    }

    const relativePath = this.toRelativePath(fallbackFilePath, repositoryPath);
    const segments = this.normalizePath(relativePath).split("/").filter(Boolean);
    if (segments.length > 1) {
      return segments[0];
    }

    return path.extname(relativePath).replace(/^\./, "") || "changes";
  }

  private normalizeGroupCommitMessage(
    rawCommitMessage: string,
    title: string,
    files: string[],
    descriptions: Map<string, string>,
    language: string,
  ): string {
    const normalized = normalizeCommitMessage(rawCommitMessage);
    const firstLine = normalized.split(/\r?\n/).map((line) => line.trim())[0] || "";
    if (firstLine) {
      return firstLine;
    }

    const type = this.inferCommitType(files, descriptions);
    const scope = this.toScope(title);
    if (this.isChineseLanguage(language)) {
      return `${type}(${scope}): ${this.getChineseSubject(type, title)}`;
    }
    return `${type}(${scope}): update ${title} related changes`;
  }

  private inferCommitType(
    files: string[],
    descriptions: Map<string, string>,
  ): "feat" | "fix" | "refactor" | "docs" | "test" | "chore" {
    const mergedText = files
      .map((file) => descriptions.get(file) || "")
      .join(" ")
      .toLowerCase();

    if (/(fix|bug|hotfix|修复|错误|异常|缺陷)/i.test(mergedText)) {
      return "fix";
    }
    if (/(refactor|cleanup|重构|优化结构|整理)/i.test(mergedText)) {
      return "refactor";
    }
    if (/(test|spec|测试|用例)/i.test(mergedText)) {
      return "test";
    }
    if (/(doc|readme|文档|说明)/i.test(mergedText)) {
      return "docs";
    }
    if (/(add|new|introduce|support|新增|增加|支持)/i.test(mergedText)) {
      return "feat";
    }

    return "chore";
  }

  private getChineseSubject(type: string, title: string): string {
    if (type === "fix") {
      return `修复${title}相关改动`;
    }
    if (type === "feat") {
      return `完善${title}相关能力`;
    }
    if (type === "refactor") {
      return `重构${title}相关代码`;
    }
    if (type === "docs") {
      return `更新${title}相关文档`;
    }
    if (type === "test") {
      return `补充${title}相关测试`;
    }
    return `调整${title}相关改动`;
  }

  private toScope(title: string): string {
    const normalized = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return normalized || "changes";
  }

  private toRelativePath(filePath: string, repositoryPath?: string): string {
    if (repositoryPath && path.isAbsolute(filePath)) {
      const relative = path.relative(repositoryPath, filePath);
      if (
        relative &&
        !relative.startsWith("..") &&
        !path.isAbsolute(relative)
      ) {
        return this.normalizePath(relative);
      }
    }

    return this.normalizePath(filePath);
  }

  private normalizePath(filePath: string): string {
    return (filePath || "")
      .replace(/\\/g, "/")
      .replace(/^\.\//, "")
      .trim();
  }

  private escapePromptText(text: string): string {
    return (text || "")
      .replace(/\r?\n+/g, " ")
      .replace(/"/g, '\\"')
      .trim()
      .slice(0, 320);
  }

  private isChineseLanguage(language: string): boolean {
    return CHINESE_LANGUAGE_PATTERN.test(language || "");
  }
}
