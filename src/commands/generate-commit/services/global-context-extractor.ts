import * as path from "path";
import { ISCMProvider } from "../../../scm/scm-provider";
import { AIModel, AIProvider } from "../../../ai/types";
import { Logger } from "../../../utils/logger";
import {
  DiffStructureExtractor,
  FileSummary,
} from "../../../utils/diff/diff-structure-extractor";
import { tokenizerService } from "../../../utils/tokenizer";

/**
 * 全局上下文提取器
 * 负责为分层提交生成全局功能上下文，支持四级降级策略
 */
export class GlobalContextExtractor {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance("GlobalContextExtractor");
  }

  /**
   * 提取全局上下文
   * @param selectedFiles - 选中的文件列表
   * @param scmProvider - SCM 提供者
   * @param selectedModel - 选中的 AI 模型
   * @param aiProvider - AI 提供者
   * @returns 全局上下文字符串
   */
  async extractGlobalContext(
    selectedFiles: string[],
    scmProvider: ISCMProvider,
    selectedModel: AIModel,
    aiProvider: AIProvider
  ): Promise<string> {
    const maxTokenBudget = this.calculateTokenBudget(
      selectedModel,
      selectedFiles.length
    );

    if (maxTokenBudget < 200) {
      // 级别0: 完全跳过全局上下文提取
      this.logger.warn(
        "Model context too small, skipping global context extraction"
      );
      return "";
    }

    const fileOverviews = await this.generateFileOverviews(
      selectedFiles,
      scmProvider
    );
    const estimatedTokens = this.estimateTokens(fileOverviews);

    this.logger.info(
      `Global context extraction: budget=${maxTokenBudget}, estimated=${estimatedTokens}, files=${selectedFiles.length}`
    );

    if (estimatedTokens <= maxTokenBudget) {
      // 级别1: 完整上下文(最佳体验)
      return this.generateFullContext(fileOverviews, aiProvider);
    }

    if (estimatedTokens <= maxTokenBudget * 1.5) {
      // 级别2: 适度压缩
      return this.generateCompactContext(fileOverviews);
    }

    if (estimatedTokens <= maxTokenBudget * 2) {
      // 级别3: 最小化上下文
      return this.generateMinimalContext(fileOverviews);
    }

    // 级别4: 超级压缩
    return this.generateUltraMinimalContext(fileOverviews);
  }

  /**
   * 计算 Token 预算
   */
  private calculateTokenBudget(model: AIModel, fileCount: number): number {
    const maxTokens = model.maxTokens?.input ?? 8192;
    // 为全局上下文分配10%的预算,最少200,最多1000
    const baseBudget = Math.min(Math.max(maxTokens * 0.1, 200), 1000);
    // 文件越多,全局上下文越重要,适当增加预算
    return fileCount > 5 ? baseBudget * 1.5 : baseBudget;
  }

  /**
   * 为所有文件生成概览
   */
  private async generateFileOverviews(
    selectedFiles: string[],
    scmProvider: ISCMProvider
  ): Promise<FileSummary[]> {
    const overviews: FileSummary[] = [];

    for (const filePath of selectedFiles) {
      try {
        const fileDiff = await scmProvider.getDiff([filePath]);
        if (fileDiff) {
          const overview = await DiffStructureExtractor.extractStructuralSummary(
            fileDiff,
            filePath
          );
          overviews.push(overview);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to generate overview for ${filePath}:${error}`
        );
        // 创建兜底概览
        overviews.push({
          filePath,
          changedClasses: [],
          changedFunctions: [],
          changeType: "modified",
          estimatedTokens: 20,
        });
      }
    }

    return overviews;
  }

  /**
   * 估算 token 数量
   */
  private estimateTokens(fileOverviews: FileSummary[]): number {
    return fileOverviews.reduce(
      (total, overview) => total + overview.estimatedTokens,
      0
    );
  }

  /**
   * 级别1: 生成完整上下文
   */
  private async generateFullContext(
    fileOverviews: FileSummary[],
    aiProvider: AIProvider
  ): Promise<string> {
    try {
      const prompt = this.buildFullContextPrompt();
      const formattedOverviews = this.formatFileOverviews(fileOverviews);

      const response = await aiProvider.generateCommit({
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: formattedOverviews },
        ],
        diff: formattedOverviews,
        additionalContext: "",
        model: { 
          id: "gpt-4", 
          name: "GPT-4",
          provider: "openai" as any,
          maxTokens: { input: 8192, output: 2048 } 
        } // 临时模型对象
      });

      return response.content;
    } catch (error) {
      this.logger.warn(
        `Failed to generate full context, falling back to compact: ${error}`
      );
      return this.generateCompactContext(fileOverviews);
    }
  }

  /**
   * 级别2: 适度压缩上下文
   */
  private generateCompactContext(fileOverviews: FileSummary[]): string {
    const lines = fileOverviews.map((file) => {
      const classes =
        file.changedClasses.length > 0
          ? `classes: ${file.changedClasses.join(", ")}`
          : "";
      const funcs =
        file.changedFunctions.length > 0
          ? `functions: ${file.changedFunctions
              .map((f) => f.name)
              .slice(0, 3)
              .join(", ")}`
          : "";
      return `${file.filePath} (${file.changeType}): ${[classes, funcs]
        .filter(Boolean)
        .join("; ")}`;
    });
    return lines.join("\n");
  }

  /**
   * 级别3: 最小化上下文(智能选择top N文件)
   */
  private generateMinimalContext(fileOverviews: FileSummary[]): string {
    const rankedFiles = this.rankFilesByImportance(fileOverviews);
    const topFiles = rankedFiles.slice(0, Math.min(5, rankedFiles.length));

    const minimalLines = topFiles.map((file) => {
      const mainEntity = this.extractMainEntity(file);
      return `${file.filePath}: ${file.changeType} ${mainEntity}`;
    });

    return minimalLines.join("\n");
  }

  /**
   * 级别4: 超级压缩(一句话概括)
   */
  private generateUltraMinimalContext(fileOverviews: FileSummary[]): string {
    const rankedFiles = this.rankFilesByImportance(fileOverviews);
    const topFiles = rankedFiles.slice(0, 3);

    const featureName = this.inferFeatureName(topFiles);
    const keyFileNames = topFiles
      .map((f) => path.basename(f.filePath))
      .join(", ");

    return `Implementing ${featureName} across ${fileOverviews.length} files (key: ${keyFileNames})`;
  }

  /**
   * 文件重要性排序算法(多维度评分)
   */
  private rankFilesByImportance(files: FileSummary[]): FileSummary[] {
    return files.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // 维度1: 变更类型权重
      const typeWeights: Record<string, number> = {
        new: 10,
        modified: 7,
        refactor: 5,
        renamed: 3,
      };
      scoreA += typeWeights[a.changeType] || 0;
      scoreB += typeWeights[b.changeType] || 0;

      // 维度2: 变更规模(类权重更高)
      scoreA += a.changedClasses.length * 3 + a.changedFunctions.length * 1;
      scoreB += b.changedClasses.length * 3 + b.changedFunctions.length * 1;

      // 维度3: 文件路径启发式(Controller/Service/API等关键词)
      const keyPatterns = [
        /controller/i,
        /service/i,
        /api/i,
        /handler/i,
        /manager/i,
        /index\.(ts|js)/i,
      ];
      if (keyPatterns.some((p) => p.test(a.filePath))) scoreA += 5;
      if (keyPatterns.some((p) => p.test(b.filePath))) scoreB += 5;

      // 维度4: 类型定义文件降权
      if (/types?\.ts|\.d\.ts|interface/i.test(a.filePath)) scoreA -= 3;
      if (/types?\.ts|\.d\.ts|interface/i.test(b.filePath)) scoreB -= 3;

      return scoreB - scoreA;
    });
  }

  /**
   * 提取文件最核心实体
   */
  private extractMainEntity(file: FileSummary): string {
    if (file.changedClasses.length > 0) {
      return `class ${file.changedClasses[0]}`;
    }
    if (file.changedFunctions.length > 0) {
      return `function ${file.changedFunctions[0].name}()`;
    }
    return file.changeType === "new" ? "new file" : "modifications";
  }

  /**
   * 推断功能名称(基于词频分析)
   */
  private inferFeatureName(files: FileSummary[]): string {
    const allNames = files.flatMap((f) => [
      ...f.changedClasses,
      ...f.changedFunctions.map((fn) => fn.name),
    ]);

    const words = allNames
      .flatMap((name) => name.split(/(?=[A-Z])/)) // 驼峰拆分
      .map((w) => w.toLowerCase())
      .filter((w) => w.length > 3);

    const wordFreq = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topWord = Object.entries(wordFreq).sort(([, a], [, b]) => b - a)[0];

    return topWord ? topWord[0] : "feature";
  }

  /**
   * 构建完整上下文的系统提示
   */
  private buildFullContextPrompt(): string {
    return `You are an expert software architect. Your task is to analyze code changes across multiple files and generate a concise, coherent description of the overall functionality being implemented.

**Instructions:**
1. Focus on the big picture - what feature or functionality is being built/modified
2. Explain how the different files work together
3. Use clear, technical language
4. Keep the description under 200 words
5. Mention the architectural layers involved (e.g., service layer, controller layer, data layer)

**Output Format:**
Provide a single paragraph that summarizes the overall change, highlighting the relationships between files.`;
  }

  /**
   * 格式化文件概览为可读文本
   */
  private formatFileOverviews(fileOverviews: FileSummary[]): string {
    return fileOverviews
      .map((overview) => {
        const classes =
          overview.changedClasses.length > 0
            ? `Classes: ${overview.changedClasses.join(", ")}`
            : "";
        const functions =
          overview.changedFunctions.length > 0
            ? `Functions: ${overview.changedFunctions
                .map((f) => f.name)
                .join(", ")}`
            : "";

        return `File: ${overview.filePath}
Type: ${overview.changeType}
${classes}
${functions}`.trim();
      })
      .join("\n\n");
  }
}
