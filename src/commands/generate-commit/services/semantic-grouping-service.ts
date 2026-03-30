import { AIModel, AIProvider, AIRequestParams } from "@/ai/types";
import { SemanticCommitGroup } from "@/commands/generate-commit/types";
import { Logger } from "@/utils/logger";
import * as path from "path";
import { z } from "zod";

const RawSemanticGroupSchema = z.object({
  title: z.string().trim().min(1),
  reason: z.string().trim().optional().default(""),
  files: z.array(z.string().trim().min(1)).min(1),
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

export interface SemanticGroupingResult {
  groups: SemanticCommitGroup[];
  fallbackUsed: boolean;
  fallbackReason?: string;
}

interface FileLookup {
  full: Map<string, string>;
  relative: Map<string, string[]>;
  baseName: Map<string, string[]>;
}

const CHINESE_LANGUAGE_PATTERN = /(chinese|中文|汉语|简体|繁体)/i;
const MIN_GROUP_COUNT = 2;
const MAX_GROUP_COUNT = 8;

class SemanticGroupingValidationError extends Error {}

export class SemanticGroupingService {
  constructor(private readonly logger: Logger) {}

  async groupChanges(input: SemanticGroupingInput): Promise<SemanticGroupingResult> {
    if (input.fileChanges.length <= 1) {
      return {
        groups: this.buildHeuristicGroups(
          input.fileChanges,
          input.repositoryPath,
          input.language,
        ),
        fallbackUsed: true,
        fallbackReason: "single_file_or_empty_selection",
      };
    }

    const fallbackGroups = this.buildHeuristicGroups(
      input.fileChanges,
      input.repositoryPath,
      input.language,
    );

    let firstError: Error | undefined;
    try {
      const firstAttemptGroups = await this.groupWithAI(input);
      const normalized = this.normalizeAndValidateAiGroups(
        firstAttemptGroups,
        input.fileChanges,
        input.repositoryPath,
      );
      return {
        groups: normalized,
        fallbackUsed: false,
      };
    } catch (error) {
      firstError = error instanceof Error ? error : new Error(String(error));
      this.logger.warn("Semantic grouping first AI attempt failed", {
        operation: "SemanticGroupingService.groupChanges",
        data: {
          error: firstError.message,
          fileCount: input.fileChanges.length,
        },
      });
    }

    try {
      const secondAttemptGroups = await this.groupWithAI(
        input,
        firstError?.message || "Unknown validation failure",
      );
      const normalized = this.normalizeAndValidateAiGroups(
        secondAttemptGroups,
        input.fileChanges,
        input.repositoryPath,
      );
      return {
        groups: normalized,
        fallbackUsed: false,
      };
    } catch (error) {
      const secondError = error instanceof Error ? error : new Error(String(error));
      const fallbackReason = `first_attempt=${firstError?.message || "unknown"}; second_attempt=${secondError.message}`;
      this.logger.warn("Semantic grouping AI attempts failed, fallback to heuristic groups", {
        operation: "SemanticGroupingService.groupChanges",
        data: {
          fileCount: input.fileChanges.length,
          fallbackReason,
        },
      });
      return {
        groups: fallbackGroups,
        fallbackUsed: true,
        fallbackReason,
      };
    }
  }

  private async groupWithAI(
    input: SemanticGroupingInput,
    retryFeedback?: string,
  ): Promise<RawSemanticGroup[]> {
    const response = await input.aiProvider.generateCommit({
      ...input.requestParams,
      model: input.selectedModel,
      diff: "",
      messages: [
        {
          role: "system",
          content: this.buildSystemPrompt(input.language, retryFeedback),
        },
        {
          role: "user",
          content: this.buildUserPrompt(
            input.fileChanges,
            input.repositoryPath,
            retryFeedback,
          ),
        },
      ],
    });

    return this.parseAIResponse(response.content);
  }

  private buildSystemPrompt(language: string, retryFeedback?: string): string {
    const feedbackSection = retryFeedback
      ? [
          "Previous response failed validation:",
          retryFeedback,
          "You MUST correct all issues and regenerate valid JSON.",
        ].join("\n")
      : "";

    return [
      "You are a senior commit-planning assistant.",
      "Do deep semantic analysis before grouping.",
      `All natural language fields MUST be in ${language}.`,
      "Return strict JSON only and do not include markdown fences or additional text.",
      "JSON schema:",
      '{ "groups": [ { "title": "string", "reason": "string", "files": ["path"] } ] }',
      "Rules:",
      "1) Group files by semantic intent, not by path proximity.",
      "2) Keep group count between 2 and 8 when possible.",
      "3) Every file must appear exactly once in groups.files.",
      "4) Do not invent file paths.",
      "5) Use concise, high-signal titles and reasons.",
      feedbackSection,
    ]
      .filter(Boolean)
      .join("\n");
  }

  private buildUserPrompt(
    fileChanges: FileChangeDescription[],
    repositoryPath?: string,
    retryFeedback?: string,
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

    const retrySection = retryFeedback
      ? [
          "",
          "Previous output was invalid.",
          `Validation error: ${this.escapePromptText(retryFeedback)}`,
          "Fix the issue and output valid JSON only.",
        ].join("\n")
      : "";

    return [
      "Analyze these changed files and group them for separate commits:",
      lines.join("\n"),
      retrySection,
      "",
      "Output JSON only.",
    ]
      .filter(Boolean)
      .join("\n");
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

    throw new SemanticGroupingValidationError("semantic_grouping_json_parse_failed");
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

  private normalizeAndValidateAiGroups(
    rawGroups: RawSemanticGroup[],
    fileChanges: FileChangeDescription[],
    repositoryPath: string | undefined,
  ): SemanticCommitGroup[] {
    const totalFiles = fileChanges.length;
    const minGroups = Math.min(MIN_GROUP_COUNT, totalFiles);
    const maxGroups = Math.min(MAX_GROUP_COUNT, totalFiles);
    if (rawGroups.length < minGroups || rawGroups.length > maxGroups) {
      throw new SemanticGroupingValidationError(
        `invalid_group_count:${rawGroups.length},expected:${minGroups}-${maxGroups}`,
      );
    }

    const lookup = this.buildFileLookup(fileChanges, repositoryPath);
    const consumed = new Set<string>();
    const normalizedGroups: SemanticCommitGroup[] = [];

    for (const rawGroup of rawGroups) {
      const resolvedFiles: string[] = [];

      for (const candidate of rawGroup.files) {
        const resolved = this.resolveFilePath(candidate, lookup, repositoryPath);
        if (!resolved) {
          throw new SemanticGroupingValidationError(`invalid_file_path:${candidate}`);
        }
        if (consumed.has(resolved)) {
          throw new SemanticGroupingValidationError(`duplicate_file_path:${resolved}`);
        }
        consumed.add(resolved);
        resolvedFiles.push(resolved);
      }

      if (resolvedFiles.length === 0) {
        throw new SemanticGroupingValidationError(
          `empty_group:${rawGroup.title || "untitled"}`,
        );
      }

      const title = this.normalizeTitle(
        rawGroup.title,
        resolvedFiles[0],
        repositoryPath,
      );
      const reason = rawGroup.reason?.trim() || title;

      normalizedGroups.push({
        id: `group-${normalizedGroups.length + 1}`,
        title,
        reason,
        files: resolvedFiles,
        commitMessage: this.buildPendingCommitMessage(reason),
      });
    }

    if (consumed.size !== totalFiles) {
      const expectedFiles = fileChanges.map((item) => item.filePath);
      const missingFiles = expectedFiles.filter((file) => !consumed.has(file));
      throw new SemanticGroupingValidationError(
        `file_coverage_mismatch:missing=${missingFiles.join(",")}`,
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
    if (effectiveBuckets.size <= 1 && fileChanges.length > 1) {
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
    language: string,
    repositoryPath?: string,
  ): SemanticCommitGroup {
    const normalizedKey = this.normalizePath(key) || "changes";
    const title = normalizedKey === "root" ? "root" : normalizedKey;
    const reason = this.buildFallbackReason(title, files, repositoryPath, language);

    return {
      id: `group-${index}`,
      title,
      reason,
      files,
      commitMessage: this.buildPendingCommitMessage(reason),
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
      return `按路径/类型自动分组：${preview}${suffix}`;
    }

    return `Fallback grouped by related area "${title}" using path/type signals.`;
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

  private buildPendingCommitMessage(reason: string): string {
    return reason || "pending semantic commit message generation";
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
      .slice(0, 500);
  }

  private isChineseLanguage(language: string): boolean {
    return CHINESE_LANGUAGE_PATTERN.test(language || "");
  }
}
