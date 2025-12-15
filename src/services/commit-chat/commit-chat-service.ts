import {
  CommandContext,
  CommandParser,
} from "@/services/commit-chat/command-parser";
import {
  ProjectContext,
  SuggestionEngine,
  UserPreference,
} from "@/services/commit-chat/suggestion-engine";
import { ChatMessage } from "@shared/types/messages";

export interface CommitChatRequest {
  message: string;
  context: {
    messages: ChatMessage[];
    selectedImages: string[];
    projectContext?: ProjectContext;
    userPreferences?: UserPreference;
  };
}

export interface CommitChatResponse {
  response: string;
  metadata?: {
    commitMessage?: string;
    suggestions?: string[];
    confidence?: number;
    configuration?: Record<string, any>;
    action?: string;
  };
}

export interface CommitChatConfig {
  maxContextLength: number;
  enableStreaming: boolean;
  enableSuggestions: boolean;
  enableCommands: boolean;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
}

const defaultConfig: CommitChatConfig = {
  maxContextLength: 4000,
  enableStreaming: true,
  enableSuggestions: true,
  enableCommands: true,
  defaultModel: "gpt-3.5-turbo",
  temperature: 0.7,
  maxTokens: 1000,
};

export class CommitChatService {
  private commandParser: CommandParser;
  private suggestionEngine: SuggestionEngine;
  private config: CommitChatConfig;
  private conversationHistory: ChatMessage[] = [];
  private userPreferences: UserPreference;
  private projectContext: ProjectContext;

  constructor(
    config: Partial<CommitChatConfig> = {},
    userPreferences: Partial<UserPreference> = {},
    projectContext: Partial<ProjectContext> = {}
  ) {
    this.config = { ...defaultConfig, ...config };
    this.userPreferences = {
      style: "conventional",
      language: "zh",
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

    this.commandParser = new CommandParser();
    this.suggestionEngine = new SuggestionEngine(
      this.userPreferences,
      this.projectContext
    );
  }

  // 处理聊天消息
  async processMessage(
    request: CommitChatRequest
  ): Promise<CommitChatResponse> {
    const { message, context } = request;

    // 更新上下文
    this.updateContext(context);

    // 检查是否是命令
    if (this.config.enableCommands && message.startsWith("/")) {
      return this.handleCommand(message, context);
    }

    // 处理普通消息
    return this.handleRegularMessage(message, context);
  }

  // 处理命令
  private async handleCommand(
    message: string,
    context: CommitChatRequest["context"]
  ): Promise<CommitChatResponse> {
    const commandContext: CommandContext = {
      currentInput: message,
      messageHistory: context.messages.map((m) => m.content),
      projectContext: this.projectContext,
      userPreferences: this.userPreferences,
    };

    const result = await this.commandParser.executeCommand(
      message,
      commandContext
    );

    if (result.success) {
      // 处理特殊命令结果
      if (result.data?.action === "clear") {
        this.conversationHistory = [];
        return {
          response: result.message,
          metadata: { action: "clear" },
        };
      }

      if (result.data?.action === "export") {
        return {
          response: result.message,
          metadata: { action: "export" },
        };
      }

      // 处理配置变更
      if (result.data?.style) {
        this.userPreferences.style = result.data.style;
        this.suggestionEngine.updateUserPreferences(this.userPreferences);
        return {
          response: result.message,
          metadata: {
            configuration: { style: result.data.style },
          },
        };
      }

      if (result.data?.language) {
        this.userPreferences.language = result.data.language;
        this.suggestionEngine.updateUserPreferences(this.userPreferences);
        return {
          response: result.message,
          metadata: {
            configuration: { language: result.data.language },
          },
        };
      }

      if (result.data?.maxLength) {
        this.userPreferences.maxLength = result.data.maxLength;
        this.suggestionEngine.updateUserPreferences(this.userPreferences);
        return {
          response: result.message,
          metadata: {
            configuration: { maxLength: result.data.maxLength },
          },
        };
      }

      return {
        response: result.message,
        metadata: {
          suggestions: result.suggestions,
        },
      };
    } else {
      return {
        response: `❌ ${result.message}`,
      };
    }
  }

  // 处理普通消息
  private async handleRegularMessage(
    message: string,
    context: CommitChatRequest["context"]
  ): Promise<CommitChatResponse> {
    // 生成 AI 响应
    const aiResponse = await this.generateAIResponse(message, context);

    // 生成建议
    let suggestions: string[] = [];
    if (this.config.enableSuggestions) {
      const suggestionObjects =
        this.suggestionEngine.generateSuggestions(message);
      suggestions = suggestionObjects.map((s) => s.text);
    }

    // 生成 commit message
    const commitMessage = await this.generateCommitMessage(message, context);

    return {
      response: aiResponse,
      metadata: {
        commitMessage,
        suggestions: suggestions.slice(0, 5),
        confidence: this.calculateConfidence(message, commitMessage),
      },
    };
  }

  // 生成 AI 响应
  private async generateAIResponse(
    message: string,
    context: CommitChatRequest["context"]
  ): Promise<string> {
    // 构建提示词
    const prompt = this.buildPrompt(message, context);

    try {
      // 这里应该调用实际的 AI 服务
      // 暂时返回模拟响应
      return this.generateMockResponse(message, context);
    } catch (error) {
      console.error("AI 响应生成失败:", error);
      return "抱歉，我暂时无法处理您的请求。请稍后再试。";
    }
  }

  // 构建提示词
  private buildPrompt(
    message: string,
    context: CommitChatRequest["context"]
  ): string {
    const systemPrompt = `你是一个专业的 Git commit message 助手。你的任务是帮助用户生成清晰、准确、符合规范的 commit message。

用户偏好:
- 风格: ${this.userPreferences.style}
- 语言: ${this.userPreferences.language}
- 最大长度: ${this.userPreferences.maxLength}

项目上下文:
- 语言: ${this.projectContext.language}
- 框架: ${this.projectContext.framework || "未知"}

请根据用户的描述生成合适的 commit message，并提供有用的建议。`;

    const conversationContext = context.messages
      .slice(-5) // 只取最近5条消息作为上下文
      .map((msg) => `${msg.type === "user" ? "用户" : "助手"}: ${msg.content}`)
      .join("\n");

    return `${systemPrompt}

对话历史:
${conversationContext}

用户当前输入: ${message}

请生成回复:`;
  }

  // 生成模拟响应（用于测试）
  private generateMockResponse(
    message: string,
    context: CommitChatRequest["context"]
  ): string {
    const responses = [
      `我理解您想要 ${message}。让我为您生成一个合适的 commit message。`,
      `根据您的描述 "${message}"，我建议使用以下格式的 commit message。`,
      `好的，我来帮您优化这个 commit message。基于您的输入，我推荐以下方案。`,
      `我明白您的需求。让我分析一下并为您提供最佳的 commit message 建议。`,
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  // 生成 commit message
  private async generateCommitMessage(
    message: string,
    context: CommitChatRequest["context"]
  ): Promise<string> {
    // 基于用户偏好和项目上下文生成 commit message
    const style = this.userPreferences.style;
    const language = this.userPreferences.language;
    const maxLength = this.userPreferences.maxLength;

    let commitMessage = "";

    switch (style) {
      case "conventional":
        commitMessage = this.generateConventionalCommit(message, language);
        break;
      case "descriptive":
        commitMessage = this.generateDescriptiveCommit(message, language);
        break;
      case "emoji":
        commitMessage = this.generateEmojiCommit(message, language);
        break;
      case "minimal":
        commitMessage = this.generateMinimalCommit(message, language);
        break;
      default:
        commitMessage = this.generateConventionalCommit(message, language);
    }

    // 限制长度
    if (commitMessage.length > maxLength) {
      commitMessage = commitMessage.substring(0, maxLength - 3) + "...";
    }

    return commitMessage;
  }

  // 生成 conventional commit
  private generateConventionalCommit(
    message: string,
    language: string
  ): string {
    const type = this.detectCommitType(message);
    const scope = this.detectScope(message);
    const description = this.extractDescription(message);

    if (scope) {
      return `${type}(${scope}): ${description}`;
    } else {
      return `${type}: ${description}`;
    }
  }

  // 生成描述性 commit
  private generateDescriptiveCommit(message: string, language: string): string {
    const action = this.detectAction(message);
    const description = this.extractDescription(message);

    if (language === "zh") {
      return `${action}${description}`;
    } else {
      return `${action} ${description}`;
    }
  }

  // 生成表情符号 commit
  private generateEmojiCommit(message: string, language: string): string {
    const emoji = this.getEmojiForMessage(message);
    const description = this.extractDescription(message);

    return `${emoji} ${description}`;
  }

  // 生成简洁 commit
  private generateMinimalCommit(message: string, language: string): string {
    return this.extractDescription(message);
  }

  // 检测 commit 类型
  private detectCommitType(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes("添加") ||
      lowerMessage.includes("add") ||
      lowerMessage.includes("新增")
    ) {
      return "feat";
    } else if (
      lowerMessage.includes("修复") ||
      lowerMessage.includes("fix") ||
      lowerMessage.includes("bug")
    ) {
      return "fix";
    } else if (lowerMessage.includes("文档") || lowerMessage.includes("docs")) {
      return "docs";
    } else if (
      lowerMessage.includes("样式") ||
      lowerMessage.includes("style")
    ) {
      return "style";
    } else if (
      lowerMessage.includes("重构") ||
      lowerMessage.includes("refactor")
    ) {
      return "refactor";
    } else if (lowerMessage.includes("测试") || lowerMessage.includes("test")) {
      return "test";
    } else if (
      lowerMessage.includes("配置") ||
      lowerMessage.includes("config") ||
      lowerMessage.includes("构建")
    ) {
      return "chore";
    } else {
      return "feat"; // 默认为新功能
    }
  }

  // 检测作用域
  private detectScope(message: string): string | null {
    // 简单的范围检测逻辑
    const scopePatterns = [
      /(?:在|in)\s+(\w+)/,
      /(\w+)\s+(?:模块|module|组件|component)/,
    ];

    for (const pattern of scopePatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  // 提取描述
  private extractDescription(message: string): string {
    // 移除常见的动词和修饰词
    const cleaned = message
      .replace(/^(添加|新增|add|create|implement)/i, "")
      .replace(/^(修复|fix|resolve|解决)/i, "")
      .replace(/^(更新|update|modify|修改)/i, "")
      .replace(/^(删除|remove|delete|移除)/i, "")
      .replace(/^(重构|refactor|restructure)/i, "")
      .replace(/^(优化|optimize|improve|enhance)/i, "")
      .trim();

    return cleaned || message;
  }

  // 检测动作
  private detectAction(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("添加") || lowerMessage.includes("add")) {
      return "添加";
    } else if (lowerMessage.includes("修复") || lowerMessage.includes("fix")) {
      return "修复";
    } else if (
      lowerMessage.includes("更新") ||
      lowerMessage.includes("update")
    ) {
      return "更新";
    } else if (
      lowerMessage.includes("删除") ||
      lowerMessage.includes("remove")
    ) {
      return "删除";
    } else if (
      lowerMessage.includes("重构") ||
      lowerMessage.includes("refactor")
    ) {
      return "重构";
    } else if (
      lowerMessage.includes("优化") ||
      lowerMessage.includes("optimize")
    ) {
      return "优化";
    } else {
      return "更新";
    }
  }

  // 获取表情符号
  private getEmojiForMessage(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes("添加") ||
      lowerMessage.includes("add") ||
      lowerMessage.includes("新增")
    ) {
      return "✨";
    } else if (
      lowerMessage.includes("修复") ||
      lowerMessage.includes("fix") ||
      lowerMessage.includes("bug")
    ) {
      return "🐛";
    } else if (lowerMessage.includes("文档") || lowerMessage.includes("docs")) {
      return "📝";
    } else if (
      lowerMessage.includes("样式") ||
      lowerMessage.includes("style")
    ) {
      return "💄";
    } else if (
      lowerMessage.includes("重构") ||
      lowerMessage.includes("refactor")
    ) {
      return "♻️";
    } else if (lowerMessage.includes("测试") || lowerMessage.includes("test")) {
      return "✅";
    } else if (
      lowerMessage.includes("配置") ||
      lowerMessage.includes("config")
    ) {
      return "🔧";
    } else {
      return "📝";
    }
  }

  // 计算置信度
  private calculateConfidence(message: string, commitMessage: string): number {
    // 简单的置信度计算逻辑
    let confidence = 0.5;

    // 基于消息长度
    if (message.length > 10) {
      confidence += 0.1;
    }
    if (message.length > 20) {
      confidence += 0.1;
    }

    // 基于关键词匹配
    const keywords = ["添加", "修复", "更新", "删除", "重构", "优化"];
    const hasKeyword = keywords.some((keyword) => message.includes(keyword));
    if (hasKeyword) {
      confidence += 0.2;
    }

    // 基于 commit message 质量
    if (commitMessage.length > 10 && commitMessage.length < 50) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  // 更新上下文
  private updateContext(context: CommitChatRequest["context"]): void {
    if (context.projectContext) {
      this.projectContext = {
        ...this.projectContext,
        ...context.projectContext,
      };
      this.suggestionEngine.updateProjectContext(this.projectContext);
    }

    if (context.userPreferences) {
      this.userPreferences = {
        ...this.userPreferences,
        ...context.userPreferences,
      };
      this.suggestionEngine.updateUserPreferences(this.userPreferences);
    }

    // 更新对话历史
    this.conversationHistory = context.messages;
  }

  // 获取服务状态
  getStatus(): {
    config: CommitChatConfig;
    userPreferences: UserPreference;
    projectContext: ProjectContext;
    conversationLength: number;
  } {
    return {
      config: this.config,
      userPreferences: this.userPreferences,
      projectContext: this.projectContext,
      conversationLength: this.conversationHistory.length,
    };
  }

  // 重置服务
  reset(): void {
    this.conversationHistory = [];
    this.userPreferences = {
      style: "conventional",
      language: "zh",
      maxLength: 50,
      includeScope: false,
      includeBody: false,
      customTemplates: [],
    };
    this.projectContext = {
      language: "javascript",
      recentCommits: [],
    };
    this.suggestionEngine = new SuggestionEngine(
      this.userPreferences,
      this.projectContext
    );
  }
}
