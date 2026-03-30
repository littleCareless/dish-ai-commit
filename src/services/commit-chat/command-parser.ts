import {
  interpolate,
  localize,
  resolveCommitChatLocale,
} from "@/services/commit-chat/language-utils";

export interface CommitCommand {
  command: string;
  description: string;
  usage: string;
  examples: string[];
  handler: (args: string[], context: CommandContext) => Promise<CommandResult>;
}

export interface CommandContext {
  currentInput: string;
  messageHistory: string[];
  projectContext: {
    language: string;
    framework?: string;
    recentCommits: string[];
  };
  userPreferences: {
    style: string;
    language: string;
    maxLength: number;
  };
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  suggestions?: string[];
}

function t(context: CommandContext, zh: string, en: string): string {
  return localize(context.userPreferences.language, zh, en);
}

function commandDescription(command: string, language: string): string {
  const locale = resolveCommitChatLocale(language);
  const map: Record<string, { zh: string; en: string }> = {
    help: { zh: "显示所有可用命令", en: "Show all available commands" },
    template: {
      zh: "显示 commit message 模板",
      en: "Show commit message templates",
    },
    style: {
      zh: "设置 commit message 风格",
      en: "Set commit message style",
    },
    length: { zh: "设置 commit message 最大长度", en: "Set max length" },
    language: { zh: "设置 commit message 语言", en: "Set message language" },
    suggest: {
      zh: "基于当前输入生成建议",
      en: "Generate suggestions from current input",
    },
    history: {
      zh: "显示最近的 commit 历史",
      en: "Show recent commit history",
    },
    clear: { zh: "清空当前对话", en: "Clear current conversation" },
    export: { zh: "导出对话历史", en: "Export conversation history" },
  };

  const text = map[command];
  if (!text) {
    return command;
  }

  return locale === "en" ? text.en : text.zh;
}

function getLocalizedTemplates(language: string): Record<string, string> {
  if (resolveCommitChatLocale(language) === "en") {
    return {
      feat: "feat: add new feature",
      fix: "fix: resolve issue",
      docs: "docs: update documentation",
      style: "style: adjust code style",
      refactor: "refactor: improve code structure",
      test: "test: add or update tests",
      chore: "chore: update build/tooling",
    };
  }

  return {
    feat: "feat: 添加新功能",
    fix: "fix: 修复问题",
    docs: "docs: 更新文档",
    style: "style: 代码格式调整",
    refactor: "refactor: 代码重构",
    test: "test: 添加或修改测试",
    chore: "chore: 构建过程或辅助工具的变动",
  };
}

function getLocalizedStyles(language: string): Record<string, string> {
  if (resolveCommitChatLocale(language) === "en") {
    return {
      conventional: "Conventional Commits style (feat:, fix:, etc.)",
      descriptive: "Descriptive style (Add user login feature)",
      emoji: "Emoji style (✨ Add new feature)",
      minimal: "Minimal style (Add login)",
    };
  }

  return {
    conventional: "conventional commits 风格 (feat:, fix:, etc.)",
    descriptive: "描述性风格 (Add user login feature)",
    emoji: "表情符号风格 (✨ Add new feature)",
    minimal: "简洁风格 (Add login)",
  };
}

function getLocalizedLanguages(language: string): Record<string, string> {
  if (resolveCommitChatLocale(language) === "en") {
    return {
      zh: "Chinese",
      en: "English",
    };
  }

  return {
    zh: "中文",
    en: "English",
  };
}

const COMMIT_COMMANDS: CommitCommand[] = [
  {
    command: "help",
    description: "Show all available commands",
    usage: "/help [command]",
    examples: ["/help", "/help template"],
    handler: async (args, context) => {
      if (args.length === 0) {
        const commandList = COMMIT_COMMANDS.map(
          (cmd) => `/${cmd.command} - ${commandDescription(cmd.command, context.userPreferences.language)}`
        ).join("\n");
        return {
          success: true,
          message: t(
            context,
            `可用命令:\n${commandList}\n\n使用 /help <command> 查看具体用法`,
            `Available commands:\n${commandList}\n\nUse /help <command> to view details`
          ),
        };
      }

      const command = COMMIT_COMMANDS.find((cmd) => cmd.command === args[0]);
      if (!command) {
        return {
          success: false,
          message: t(
            context,
            interpolate('命令 "{command}" 不存在', { command: args[0] }),
            interpolate('Command "{command}" does not exist', {
              command: args[0],
            })
          ),
        };
      }

      return {
        success: true,
        message: t(
          context,
          `命令: /${command.command}\n描述: ${commandDescription(command.command, context.userPreferences.language)}\n用法: ${command.usage}\n示例:\n${command.examples.map((ex) => `  ${ex}`).join("\n")}`,
          `Command: /${command.command}\nDescription: ${commandDescription(command.command, context.userPreferences.language)}\nUsage: ${command.usage}\nExamples:\n${command.examples.map((ex) => `  ${ex}`).join("\n")}`
        ),
      };
    },
  },
  {
    command: "template",
    description: "Show commit message templates",
    usage: "/template [type]",
    examples: ["/template", "/template feat", "/template fix"],
    handler: async (args, context) => {
      const templates = getLocalizedTemplates(context.userPreferences.language);

      if (args.length === 0) {
        const templateList = Object.entries(templates)
          .map(([type, example]) => `${type}: ${example}`)
          .join("\n");
        return {
          success: true,
          message: t(
            context,
            `可用模板:\n${templateList}`,
            `Available templates:\n${templateList}`
          ),
          suggestions: Object.values(templates),
        };
      }

      const template = templates[args[0] as keyof typeof templates];
      if (!template) {
        return {
          success: false,
          message: t(
            context,
            interpolate('模板类型 "{type}" 不存在', { type: args[0] }),
            interpolate('Template type "{type}" does not exist', {
              type: args[0],
            })
          ),
        };
      }

      return {
        success: true,
        message: t(context, `模板: ${template}`, `Template: ${template}`),
        data: { template },
      };
    },
  },
  {
    command: "style",
    description: "Set commit message style",
    usage: "/style [conventional|descriptive|emoji|minimal]",
    examples: ["/style conventional", "/style emoji"],
    handler: async (args, context) => {
      const styles = getLocalizedStyles(context.userPreferences.language);

      if (args.length === 0) {
        const styleList = Object.entries(styles)
          .map(([style, description]) => `${style}: ${description}`)
          .join("\n");
        return {
          success: true,
          message: t(
            context,
            `可用风格:\n${styleList}`,
            `Available styles:\n${styleList}`
          ),
        };
      }

      const style = args[0] as keyof typeof styles;
      if (!styles[style]) {
        return {
          success: false,
          message: t(
            context,
            interpolate('风格 "{style}" 不存在', { style: args[0] }),
            interpolate('Style "{style}" does not exist', {
              style: args[0],
            })
          ),
        };
      }

      return {
        success: true,
        message: t(
          context,
          `已设置风格为: ${style}`,
          `Style set to: ${style}`
        ),
        data: { style },
      };
    },
  },
  {
    command: "length",
    description: "Set max commit message length",
    usage: "/length <number>",
    examples: ["/length 50", "/length 72"],
    handler: async (args, context) => {
      if (args.length === 0) {
        return {
          success: false,
          message: t(
            context,
            "请指定长度，例如: /length 50",
            "Please specify a length, e.g. /length 50"
          ),
        };
      }

      const length = parseInt(args[0]);
      if (isNaN(length) || length < 10 || length > 200) {
        return {
          success: false,
          message: t(
            context,
            "长度必须是 10-200 之间的数字",
            "Length must be a number between 10 and 200"
          ),
        };
      }

      return {
        success: true,
        message: t(
          context,
          `已设置最大长度为: ${length}`,
          `Max length set to: ${length}`
        ),
        data: { maxLength: length },
      };
    },
  },
  {
    command: "language",
    description: "Set commit message language",
    usage: "/language [zh|en]",
    examples: ["/language zh", "/language en"],
    handler: async (args, context) => {
      const languages = getLocalizedLanguages(context.userPreferences.language);

      if (args.length === 0) {
        const langList = Object.entries(languages)
          .map(([code, name]) => `${code}: ${name}`)
          .join("\n");
        return {
          success: true,
          message: t(
            context,
            `可用语言:\n${langList}`,
            `Available languages:\n${langList}`
          ),
        };
      }

      const lang = args[0] as keyof typeof languages;
      if (!languages[lang]) {
        return {
          success: false,
          message: t(
            context,
            interpolate('语言 "{language}" 不支持', {
              language: args[0],
            }),
            interpolate('Language "{language}" is not supported', {
              language: args[0],
            })
          ),
        };
      }

      return {
        success: true,
        message: t(
          context,
          `已设置语言为: ${languages[lang]}`,
          `Language set to: ${languages[lang]}`
        ),
        data: { language: lang },
      };
    },
  },
  {
    command: "suggest",
    description: "Generate suggestions from current input",
    usage: "/suggest [input]",
    examples: ["/suggest add user login feature", "/suggest fix login bug"],
    handler: async (args, context) => {
      const input = args.join(" ") || context.currentInput;
      if (!input.trim()) {
        return {
          success: false,
          message: t(context, "请提供输入内容", "Please provide input content"),
        };
      }

      const suggestions = [
        `feat: ${input}`,
        `fix: ${input}`,
        `refactor: ${input}`,
        `docs: ${input}`,
      ];

      return {
        success: true,
        message: t(
          context,
          `基于 "${input}" 的建议:`,
          `Suggestions based on "${input}":`
        ),
        suggestions,
      };
    },
  },
  {
    command: "history",
    description: "Show recent commit history",
    usage: "/history [count]",
    examples: ["/history", "/history 5"],
    handler: async (args, context) => {
      const count = args.length > 0 ? parseInt(args[0]) : 5;
      const recentCommits = context.projectContext.recentCommits.slice(0, count);

      if (recentCommits.length === 0) {
        return {
          success: true,
          message: t(context, "暂无 commit 历史", "No commit history available"),
        };
      }

      const historyList = recentCommits
        .map((commit, index) => `${index + 1}. ${commit}`)
        .join("\n");

      return {
        success: true,
        message: t(
          context,
          `最近 ${count} 条 commit:\n${historyList}`,
          `Recent ${count} commits:\n${historyList}`
        ),
      };
    },
  },
  {
    command: "clear",
    description: "Clear current conversation",
    usage: "/clear",
    examples: ["/clear"],
    handler: async (_args, context) => {
      return {
        success: true,
        message: t(context, "对话已清空", "Conversation cleared"),
        data: { action: "clear" },
      };
    },
  },
  {
    command: "export",
    description: "Export conversation history",
    usage: "/export",
    examples: ["/export"],
    handler: async (_args, context) => {
      return {
        success: true,
        message: t(context, "对话历史已导出", "Conversation history exported"),
        data: { action: "export" },
      };
    },
  },
];

export class CommandParser {
  private commands: Map<string, CommitCommand> = new Map();
  private commandHistory: string[] = [];

  constructor(customCommands: CommitCommand[] = []) {
    COMMIT_COMMANDS.forEach((cmd) => {
      this.commands.set(cmd.command, cmd);
    });

    customCommands.forEach((cmd) => {
      this.commands.set(cmd.command, cmd);
    });
  }

  parseCommand(input: string): { command: string; args: string[] } | null {
    if (!input.startsWith("/")) {
      return null;
    }

    const parts = input.substring(1).trim().split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    return { command, args };
  }

  async executeCommand(
    input: string,
    context: CommandContext
  ): Promise<CommandResult> {
    const parsed = this.parseCommand(input);
    if (!parsed) {
      return {
        success: false,
        message: t(context, "无效的命令格式", "Invalid command format"),
      };
    }

    const { command, args } = parsed;
    const commandHandler = this.commands.get(command);

    if (!commandHandler) {
      return {
        success: false,
        message: t(
          context,
          `未知命令: /${command}。使用 /help 查看可用命令`,
          `Unknown command: /${command}. Use /help to view available commands`
        ),
      };
    }

    try {
      this.commandHistory.push(input);
      if (this.commandHistory.length > 50) {
        this.commandHistory = this.commandHistory.slice(-50);
      }

      const result = await commandHandler.handler(args, context);
      return result;
    } catch (error) {
      console.error(t(context, "命令执行错误:", "Command execution error:"), error);
      return {
        success: false,
        message: t(
          context,
          `命令执行失败: ${error instanceof Error ? error.message : "未知错误"}`,
          `Command execution failed: ${error instanceof Error ? error.message : "Unknown error"}`
        ),
      };
    }
  }

  getCommandSuggestions(input: string): string[] {
    if (!input.startsWith("/")) {
      return [];
    }

    const query = input.substring(1).toLowerCase();
    const suggestions: string[] = [];

    for (const [command] of this.commands) {
      if (command.toLowerCase().startsWith(query)) {
        suggestions.push(`/${command}`);
      }
    }

    return suggestions.slice(0, 10);
  }

  getCommandHistory(): string[] {
    return [...this.commandHistory];
  }

  registerCommand(command: CommitCommand): void {
    this.commands.set(command.command, command);
  }

  unregisterCommand(commandName: string): void {
    this.commands.delete(commandName);
  }

  getAllCommands(): CommitCommand[] {
    return Array.from(this.commands.values());
  }

  hasCommand(commandName: string): boolean {
    return this.commands.has(commandName);
  }

  getCommand(commandName: string): CommitCommand | undefined {
    return this.commands.get(commandName);
  }
}
