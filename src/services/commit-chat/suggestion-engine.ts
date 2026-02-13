import { CommitSuggestion } from "@shared/types/messages";

export interface CommitTemplate {
  name: string;
  pattern: string;
  description: string;
  examples: string[];
  category: "conventional" | "descriptive" | "emoji" | "custom";
}

export interface UserPreference {
  style: "conventional" | "descriptive" | "emoji" | "minimal";
  language: string;
  maxLength: number;
  includeScope: boolean;
  includeBody: boolean;
  customTemplates: CommitTemplate[];
}

export interface ProjectContext {
  language: string;
  framework?: string;
  conventions?: string[];
  recentCommits: string[];
  teamPreferences?: UserPreference;
}

// 预定义的 commit message 模板
const COMMIT_TEMPLATES: CommitTemplate[] = [
  {
    name: "feat",
    pattern: "feat: {description}",
    description: "新功能",
    examples: ["feat: 添加用户登录功能", "feat: 实现数据导出功能"],
    category: "conventional",
  },
  {
    name: "fix",
    pattern: "fix: {description}",
    description: "修复问题",
    examples: ["fix: 修复登录验证错误", "fix: 解决内存泄漏问题"],
    category: "conventional",
  },
  {
    name: "docs",
    pattern: "docs: {description}",
    description: "文档更新",
    examples: ["docs: 更新 API 文档", "docs: 添加使用说明"],
    category: "conventional",
  },
  {
    name: "style",
    pattern: "style: {description}",
    description: "代码格式调整",
    examples: ["style: 统一代码格式", "style: 调整缩进"],
    category: "conventional",
  },
  {
    name: "refactor",
    pattern: "refactor: {description}",
    description: "代码重构",
    examples: ["refactor: 重构用户服务", "refactor: 优化数据库查询"],
    category: "conventional",
  },
  {
    name: "test",
    pattern: "test: {description}",
    description: "测试相关",
    examples: ["test: 添加单元测试", "test: 修复测试用例"],
    category: "conventional",
  },
  {
    name: "chore",
    pattern: "chore: {description}",
    description: "构建/工具相关",
    examples: ["chore: 更新依赖包", "chore: 配置 CI/CD"],
    category: "conventional",
  },
  {
    name: "emoji",
    pattern: "{emoji} {description}",
    description: "表情符号风格",
    examples: ["✨ 添加新功能", "🐛 修复 bug", "📝 更新文档"],
    category: "emoji",
  },
];

// 常见的关键词映射
const KEYWORD_MAPPINGS = {
  添加: ["feat", "add", "new"],
  修复: ["fix", "bug", "error"],
  更新: ["update", "upgrade", "bump"],
  删除: ["remove", "delete", "drop"],
  重构: ["refactor", "restructure"],
  优化: ["optimize", "improve", "enhance"],
  文档: ["docs", "documentation"],
  测试: ["test", "testing"],
  配置: ["config", "configuration"],
  样式: ["style", "css", "ui"],
};

export class SuggestionEngine {
  private userPreferences: UserPreference;
  private projectContext: ProjectContext;
  private recentSuggestions: string[] = [];

  constructor(
    userPreferences: Partial<UserPreference> = {},
    projectContext: Partial<ProjectContext> = {}
  ) {
    this.userPreferences = {
      style: "conventional",
      language: "Simplified Chinese",
      maxLength: 50,
      includeScope: false,
      includeBody: false,
      customTemplates: [],
      ...userPreferences,
    };
    this.projectContext = {
      language: "javascript",
      recentCommits: [],
      ...projectContext,
    };
  }

  // 生成建议
  generateSuggestions(input: string): CommitSuggestion[] {
    const suggestions: CommitSuggestion[] = [];

    // 基于输入内容生成建议
    if (input.trim().length > 0) {
      suggestions.push(...this.generateContentBasedSuggestions(input));
    }

    // 基于模板生成建议
    suggestions.push(...this.generateTemplateBasedSuggestions(input));

    // 基于项目上下文生成建议
    suggestions.push(...this.generateContextBasedSuggestions(input));

    // 基于用户偏好生成建议
    suggestions.push(...this.generatePreferenceBasedSuggestions(input));

    // 去重并排序
    return this.deduplicateAndRank(suggestions);
  }

  // 基于内容生成建议
  private generateContentBasedSuggestions(input: string): CommitSuggestion[] {
    const suggestions: CommitSuggestion[] = [];
    const lowerInput = input.toLowerCase();

    // 检查是否包含关键词
    for (const [keyword, patterns] of Object.entries(KEYWORD_MAPPINGS)) {
      if (lowerInput.includes(keyword)) {
        for (const pattern of patterns) {
          const template = COMMIT_TEMPLATES.find((t) => t.name === pattern);
          if (template) {
            suggestions.push({
              text: this.formatTemplate(template, input),
              type: "template",
              confidence: 0.8,
              description: template.description,
            });
          }
        }
      }
    }

    // 基于输入长度和内容生成建议
    if (input.length < 20) {
      suggestions.push({
        text: `${input} - 完善描述`,
        type: "style",
        confidence: 0.6,
        description: "建议添加更详细的描述",
      });
    }

    return suggestions;
  }

  // 基于模板生成建议
  private generateTemplateBasedSuggestions(input: string): CommitSuggestion[] {
    const suggestions: CommitSuggestion[] = [];
    const templates = [
      ...COMMIT_TEMPLATES,
      ...this.userPreferences.customTemplates,
    ];

    // 根据用户偏好过滤模板
    const filteredTemplates = templates.filter((template) => {
      if (this.userPreferences.style === "conventional") {
        return template.category === "conventional";
      } else if (this.userPreferences.style === "emoji") {
        return template.category === "emoji";
      }
      return true;
    });

    // 为每个模板生成建议
    filteredTemplates.slice(0, 5).forEach((template) => {
      suggestions.push({
        text: this.formatTemplate(template, input),
        type: "template",
        confidence: 0.7,
        description: template.description,
      });
    });

    return suggestions;
  }

  // 基于项目上下文生成建议
  private generateContextBasedSuggestions(input: string): CommitSuggestion[] {
    const suggestions: CommitSuggestion[] = [];

    // 基于最近提交生成建议
    if (this.projectContext.recentCommits.length > 0) {
      const recentCommit = this.projectContext.recentCommits[0];
      const commitType = this.extractCommitType(recentCommit);

      if (commitType) {
        suggestions.push({
          text: `${commitType}: ${input}`,
          type: "convention",
          confidence: 0.6,
          description: "基于最近提交的类型",
        });
      }
    }

    // 基于项目语言和框架生成建议
    if (this.projectContext.framework) {
      const frameworkSuggestions = this.getFrameworkSpecificSuggestions(
        this.projectContext.framework,
        input
      );
      suggestions.push(...frameworkSuggestions);
    }

    return suggestions;
  }

  // 基于用户偏好生成建议
  private generatePreferenceBasedSuggestions(
    input: string
  ): CommitSuggestion[] {
    const suggestions: CommitSuggestion[] = [];

    // 根据语言偏好生成建议
    if (this.userPreferences.language === "en" && this.isChinese(input)) {
      suggestions.push({
        text: this.translateToEnglish(input),
        type: "style",
        confidence: 0.5,
        description: "英文版本",
      });
    } else if (
      this.userPreferences.language === "zh" &&
      this.isEnglish(input)
    ) {
      suggestions.push({
        text: this.translateToChinese(input),
        type: "style",
        confidence: 0.5,
        description: "中文版本",
      });
    }

    // 根据长度偏好生成建议
    if (input.length > this.userPreferences.maxLength) {
      suggestions.push({
        text: this.shortenMessage(input),
        type: "style",
        confidence: 0.7,
        description: "缩短版本",
      });
    }

    return suggestions;
  }

  // 格式化模板
  private formatTemplate(template: CommitTemplate, input: string): string {
    let formatted = template.pattern;

    // 替换占位符
    if (formatted.includes("{description}")) {
      formatted = formatted.replace("{description}", input);
    }

    if (formatted.includes("{emoji}")) {
      const emoji = this.getEmojiForType(template.name);
      formatted = formatted.replace("{emoji}", emoji);
    }

    return formatted;
  }

  // 获取表情符号
  private getEmojiForType(type: string): string {
    const emojiMap: Record<string, string> = {
      feat: "✨",
      fix: "🐛",
      docs: "📝",
      style: "💄",
      refactor: "♻️",
      test: "✅",
      chore: "🔧",
    };
    return emojiMap[type] || "📝";
  }

  // 提取提交类型
  private extractCommitType(commit: string): string | null {
    const match = commit.match(/^(\w+):/);
    return match ? match[1] : null;
  }

  // 获取框架特定建议
  private getFrameworkSpecificSuggestions(
    framework: string,
    input: string
  ): CommitSuggestion[] {
    const frameworkPatterns: Record<string, string[]> = {
      react: ["component", "hook", "state", "props"],
      vue: ["component", "directive", "mixin", "plugin"],
      angular: ["component", "service", "directive", "pipe"],
      node: ["api", "middleware", "route", "controller"],
    };

    const patterns = frameworkPatterns[framework.toLowerCase()] || [];
    return patterns.map((pattern) => ({
      text: `${pattern}: ${input}`,
      type: "convention",
      confidence: 0.5,
      description: `${framework} 相关`,
    }));
  }

  // 检查是否为中文
  private isChinese(text: string): boolean {
    return /[\u4e00-\u9fa5]/.test(text);
  }

  // 检查是否为英文
  private isEnglish(text: string): boolean {
    return /^[a-zA-Z\s]+$/.test(text);
  }

  // 翻译为英文（简单映射）
  private translateToEnglish(text: string): string {
    const translations: Record<string, string> = {
      添加: "add",
      修复: "fix",
      更新: "update",
      删除: "remove",
      重构: "refactor",
      优化: "optimize",
      文档: "docs",
      测试: "test",
    };

    let translated = text;
    for (const [chinese, english] of Object.entries(translations)) {
      translated = translated.replace(new RegExp(chinese, "g"), english);
    }
    return translated;
  }

  // 翻译为中文（简单映射）
  private translateToChinese(text: string): string {
    const translations: Record<string, string> = {
      add: "添加",
      fix: "修复",
      update: "更新",
      remove: "删除",
      refactor: "重构",
      optimize: "优化",
      docs: "文档",
      test: "测试",
    };

    let translated = text;
    for (const [english, chinese] of Object.entries(translations)) {
      translated = translated.replace(new RegExp(english, "gi"), chinese);
    }
    return translated;
  }

  // 缩短消息
  private shortenMessage(message: string): string {
    if (message.length <= this.userPreferences.maxLength) {
      return message;
    }

    // 尝试在句号、逗号等标点符号处截断
    const truncatePoints = [".", ",", ";", "，", "。", "；"];
    for (const point of truncatePoints) {
      const index = message.lastIndexOf(point, this.userPreferences.maxLength);
      if (index > 0) {
        return message.substring(0, index + 1);
      }
    }

    // 如果找不到合适的截断点，直接截断
    return message.substring(0, this.userPreferences.maxLength - 3) + "...";
  }

  // 去重并排序
  private deduplicateAndRank(
    suggestions: CommitSuggestion[]
  ): CommitSuggestion[] {
    // 去重
    const unique = suggestions.filter(
      (suggestion, index, self) =>
        index === self.findIndex((s) => s.text === suggestion.text)
    );

    // 排序：置信度高的在前，类型优先级
    return unique
      .sort((a, b) => {
        const typePriority: Record<CommitSuggestion["type"], number> = {
          template: 3,
          convention: 2,
          style: 1,
          custom: 0,
        };
        const aPriority = typePriority[a.type] || 0;
        const bPriority = typePriority[b.type] || 0;

        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }

        return b.confidence - a.confidence;
      })
      .slice(0, 10); // 限制返回数量
  }

  // 更新用户偏好
  updateUserPreferences(preferences: Partial<UserPreference>): void {
    this.userPreferences = { ...this.userPreferences, ...preferences };
  }

  // 更新项目上下文
  updateProjectContext(context: Partial<ProjectContext>): void {
    this.projectContext = { ...this.projectContext, ...context };
  }

  // 学习用户偏好
  learnFromUserChoice(
    suggestion: CommitSuggestion,
    wasAccepted: boolean
  ): void {
    // 这里可以实现机器学习逻辑
    // 暂时简单记录用户选择
    if (wasAccepted) {
      this.recentSuggestions.push(suggestion.text);
      if (this.recentSuggestions.length > 20) {
        this.recentSuggestions = this.recentSuggestions.slice(-20);
      }
    }
  }
}
