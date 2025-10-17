import { Logger } from "../../../utils/logger";

/**
 * 分支名称格式化服务
 * 负责将 AI 生成的分支名称转换为符合 Git 分支命名规范的格式
 */
export class BranchFormatter {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 格式化分支名称，使其符合Git分支命名规范
   * @param branchName - 原始分支名称
   * @returns {string} 格式化后的分支名称
   */
  formatBranchName(branchName: string): string {
    this.logger.info(`Formatting branch name: '${branchName}'`);
    
    // 去除多余的空格
    let formatted = branchName?.trim();

    // 如果有冒号或类似的前缀格式，保留它
    if (
      !formatted.includes("/") &&
      (formatted.includes(":") || formatted.includes("-"))
    ) {
      // 尝试提取类型前缀 (例如 "feature: xxx" 或 "feat: xxx")
      const match = formatted.match(/^(\w+)[:|-]/);
      if (match) {
        const prefix = match[1].toLowerCase();
        formatted = formatted.replace(/^(\w+)[:|-]\s*/, "");

        // 根据常见的git流类型添加/分隔符
        if (
          [
            "feature",
            "feat",
            "fix",
            "bugfix",
            "hotfix",
            "release",
            "chore",
            "docs",
            "style",
            "refactor",
            "perf",
            "test",
            "build",
            "ci",
          ].includes(prefix)
        ) {
          formatted = `${prefix}/${formatted}`;
        }
      }
    }

    // 转换为小写并替换空格为连字符
    formatted = formatted.toLowerCase().replace(/\s+/g, "-");

    // 删除不允许在Git分支名称中使用的特殊字符
    formatted = formatted.replace(/[~^:?*[\]\\]/g, "");

    // 确保没有连续的连字符
    formatted = formatted.replace(/--+/g, "-");

    // 去除开头和结尾的连字符
    formatted = formatted.replace(/^-+|-+$/g, "");
    
    this.logger.info(`Formatted branch name is: '${formatted}'`);
    return formatted;
  }

  /**
   * 根据基础分支名生成多个变体供选择
   * @param baseBranchName - 基础分支名称
   * @returns {string[]} 分支名变体数组
   */
  generateBranchVariants(baseBranchName: string): string[] {
    this.logger.info(`Generating branch variants for base name: ${baseBranchName}`);
    const variants: string[] = [];

    // 检查是否已有类型前缀
    const hasTypePrefix = baseBranchName.includes("/");
    const baseNameOnly = hasTypePrefix
      ? baseBranchName.substring(baseBranchName.indexOf("/") + 1)
      : baseBranchName;

    // 添加原始分支名
    variants.push(baseBranchName);

    // 如果没有类型前缀，添加几个常用类型的变体
    if (!hasTypePrefix) {
      variants.push(`feature/${baseBranchName}`);
      variants.push(`fix/${baseBranchName}`);
      variants.push(`refactor/${baseBranchName}`);
    }

    // 添加在kebab-case和camelCase之间转换的变体
    if (baseBranchName.includes("-")) {
      // 转换为camelCase
      const camelCase = baseNameOnly.replace(/-([a-z])/g, (_, char) =>
        char.toUpperCase()
      );
      if (!hasTypePrefix) {
        variants.push(camelCase);
      } else {
        const prefix = baseBranchName.substring(
          0,
          baseBranchName.indexOf("/") + 1
        );
        variants.push(`${prefix}${camelCase}`);
      }
    }

    const finalVariants = [...new Set(variants)];
    this.logger.info(`Generated variants: ${finalVariants.join(", ")}`);
    return finalVariants; // 去除可能的重复项
  }
}
