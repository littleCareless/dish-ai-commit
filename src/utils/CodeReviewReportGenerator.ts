import { CodeReviewResult, CodeReviewIssue } from "../ai/types";
import * as vscode from "vscode";  
import { LocalizationManager } from "../utils/LocalizationManager";

/**
 * 代码审查报告生成器，将代码审查结果转换为格式化的 Markdown 文档
 */
export class CodeReviewReportGenerator {
  private static readonly locManager = LocalizationManager.getInstance();
  
  /**
   * 不同严重程度对应的 emoji 图标
   * @private
   */
  private static readonly severityEmoji = {
    NOTE: "💡",    // 提示
    WARNING: "⚠️",  // 警告
    ERROR: "🚨",    // 错误
  };

  /**
   * 生成完整的 Markdown 格式代码审查报告
   * @param {CodeReviewResult} review - 代码审查结果对象
   * @returns {string} 格式化的 Markdown 文本
   */
  static generateMarkdownReport(review: CodeReviewResult): string {
    // 按文件分组整理问题
    const sections = this.groupIssuesByFile(review.issues);

    // 生成报告各部分
    let markdown = this.generateHeader(review.summary);
    markdown += this.generateDetailedFindings(sections);

    return markdown;
  }

  /**
   * 将问题按文件路径分组
   * @private
   * @param {CodeReviewIssue[]} issues - 问题列表
   * @returns {Record<string, CodeReviewIssue[]>} 按文件分组的问题
   */
  private static groupIssuesByFile(
    issues: CodeReviewIssue[]
  ): Record<string, CodeReviewIssue[]> {
    return issues.reduce((acc, issue) => {
      if (!acc[issue.filePath]) {
        acc[issue.filePath] = [];
      }
      acc[issue.filePath].push(issue);
      return acc;
    }, {} as Record<string, CodeReviewIssue[]>);
  }

  /**
   * 生成报告头部，包含总体摘要
   * @private
   * @param {string} summary - 审查总结
   * @returns {string} Markdown 格式的报告头部
   */
  private static generateHeader(summary: string): string {
    const title = this.locManager.getMessage("codeReview.report.title");
    const summaryLabel = this.locManager.getMessage("codeReview.report.summary");
    return `# ${title}\n\n## ${summaryLabel}\n\n${summary}\n\n`;
  }

  /**
   * 生成详细问题列表
   * @private
   * @param {Record<string, CodeReviewIssue[]>} sections - 按文件分组的问题
   * @returns {string} Markdown 格式的详细问题列表
   */
  private static generateDetailedFindings(
    sections: Record<string, CodeReviewIssue[]>
  ): string {
    const findings = this.locManager.getMessage("codeReview.report.findings");
    let markdown = `## ${findings}\n\n`;

    // 遍历每个文件的问题
    for (const [filePath, issues] of Object.entries(sections)) {
      markdown += `### ${filePath}\n\n`;

      for (const issue of issues) {
        markdown += this.generateIssueSection(issue);
      }
    }

    return markdown;
  }

  /**
   * 生成单个问题的描述部分
   * @private
   * @param {CodeReviewIssue} issue - 单个问题对象
   * @returns {string} Markdown 格式的问题描述
   */
  private static generateIssueSection(issue: CodeReviewIssue): string {
    // 生成问题标题，包含严重程度和行号
    let section = `#### ${this.severityEmoji[issue.severity]} ${
      issue.severity
    }: Line ${issue.startLine}${issue.endLine ? `-${issue.endLine}` : ""}\n\n`;
    
    // 添加问题描述和建议
    section += `**${this.locManager.getMessage("codeReview.issue.label")}** ${issue.description}\n\n`;
    section += `**${this.locManager.getMessage("codeReview.suggestion.label")}** ${issue.suggestion}\n\n`;

    // 如果有代码示例，添加代码块
    if (issue.code) {
      section += "```typescript\n" + issue.code + "\n```\n\n";
    }

    // 如果有相关文档，添加链接
    if (issue.documentation) {
      const docLabel = this.locManager.getMessage("codeReview.documentation.label");
      section += `📚 [${docLabel}](${issue.documentation})\n\n`;
    }

    section += `---\n\n`;
    return section;
  }
}
