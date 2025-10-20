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

// 预定义命令
const COMMIT_COMMANDS: CommitCommand[] = [
  {
    command: 'help',
    description: '显示所有可用命令',
    usage: '/help [command]',
    examples: ['/help', '/help template'],
    handler: async (args, context) => {
      if (args.length === 0) {
        const commandList = COMMIT_COMMANDS.map(cmd => 
          `/${cmd.command} - ${cmd.description}`
        ).join('\n');
        return {
          success: true,
          message: `可用命令:\n${commandList}\n\n使用 /help <command> 查看具体用法`,
        };
      }
      
      const command = COMMIT_COMMANDS.find(cmd => cmd.command === args[0]);
      if (!command) {
        return {
          success: false,
          message: `命令 "${args[0]}" 不存在`,
        };
      }
      
      return {
        success: true,
        message: `命令: /${command.command}\n描述: ${command.description}\n用法: ${command.usage}\n示例:\n${command.examples.map(ex => `  ${ex}`).join('\n')}`,
      };
    },
  },
  {
    command: 'template',
    description: '显示 commit message 模板',
    usage: '/template [type]',
    examples: ['/template', '/template feat', '/template fix'],
    handler: async (args, context) => {
      const templates = {
        feat: 'feat: 添加新功能',
        fix: 'fix: 修复问题',
        docs: 'docs: 更新文档',
        style: 'style: 代码格式调整',
        refactor: 'refactor: 代码重构',
        test: 'test: 添加或修改测试',
        chore: 'chore: 构建过程或辅助工具的变动',
      };
      
      if (args.length === 0) {
        const templateList = Object.entries(templates)
          .map(([type, example]) => `${type}: ${example}`)
          .join('\n');
        return {
          success: true,
          message: `可用模板:\n${templateList}`,
          suggestions: Object.values(templates),
        };
      }
      
      const template = templates[args[0] as keyof typeof templates];
      if (!template) {
        return {
          success: false,
          message: `模板类型 "${args[0]}" 不存在`,
        };
      }
      
      return {
        success: true,
        message: `模板: ${template}`,
        data: { template },
      };
    },
  },
  {
    command: 'style',
    description: '设置 commit message 风格',
    usage: '/style [conventional|descriptive|emoji|minimal]',
    examples: ['/style conventional', '/style emoji'],
    handler: async (args, context) => {
      const styles = {
        conventional: 'conventional commits 风格 (feat:, fix:, etc.)',
        descriptive: '描述性风格 (Add user login feature)',
        emoji: '表情符号风格 (✨ Add new feature)',
        minimal: '简洁风格 (Add login)',
      };
      
      if (args.length === 0) {
        const styleList = Object.entries(styles)
          .map(([style, description]) => `${style}: ${description}`)
          .join('\n');
        return {
          success: true,
          message: `可用风格:\n${styleList}`,
        };
      }
      
      const style = args[0] as keyof typeof styles;
      if (!styles[style]) {
        return {
          success: false,
          message: `风格 "${args[0]}" 不存在`,
        };
      }
      
      return {
        success: true,
        message: `已设置风格为: ${style}`,
        data: { style },
      };
    },
  },
  {
    command: 'length',
    description: '设置 commit message 最大长度',
    usage: '/length <number>',
    examples: ['/length 50', '/length 72'],
    handler: async (args, context) => {
      if (args.length === 0) {
        return {
          success: false,
          message: '请指定长度，例如: /length 50',
        };
      }
      
      const length = parseInt(args[0]);
      if (isNaN(length) || length < 10 || length > 200) {
        return {
          success: false,
          message: '长度必须是 10-200 之间的数字',
        };
      }
      
      return {
        success: true,
        message: `已设置最大长度为: ${length}`,
        data: { maxLength: length },
      };
    },
  },
  {
    command: 'language',
    description: '设置 commit message 语言',
    usage: '/language [zh|en]',
    examples: ['/language zh', '/language en'],
    handler: async (args, context) => {
      const languages = {
        zh: '中文',
        en: 'English',
      };
      
      if (args.length === 0) {
        const langList = Object.entries(languages)
          .map(([code, name]) => `${code}: ${name}`)
          .join('\n');
        return {
          success: true,
          message: `可用语言:\n${langList}`,
        };
      }
      
      const lang = args[0] as keyof typeof languages;
      if (!languages[lang]) {
        return {
          success: false,
          message: `语言 "${args[0]}" 不支持`,
        };
      }
      
      return {
        success: true,
        message: `已设置语言为: ${languages[lang]}`,
        data: { language: lang },
      };
    },
  },
  {
    command: 'suggest',
    description: '基于当前输入生成建议',
    usage: '/suggest [input]',
    examples: ['/suggest 添加用户登录功能', '/suggest fix login bug'],
    handler: async (args, context) => {
      const input = args.join(' ') || context.currentInput;
      if (!input.trim()) {
        return {
          success: false,
          message: '请提供输入内容',
        };
      }
      
      // 这里可以调用建议引擎
      const suggestions = [
        `feat: ${input}`,
        `fix: ${input}`,
        `refactor: ${input}`,
        `docs: ${input}`,
      ];
      
      return {
        success: true,
        message: `基于 "${input}" 的建议:`,
        suggestions,
      };
    },
  },
  {
    command: 'history',
    description: '显示最近的 commit 历史',
    usage: '/history [count]',
    examples: ['/history', '/history 5'],
    handler: async (args, context) => {
      const count = args.length > 0 ? parseInt(args[0]) : 5;
      const recentCommits = context.projectContext.recentCommits.slice(0, count);
      
      if (recentCommits.length === 0) {
        return {
          success: true,
          message: '暂无 commit 历史',
        };
      }
      
      const historyList = recentCommits
        .map((commit, index) => `${index + 1}. ${commit}`)
        .join('\n');
      
      return {
        success: true,
        message: `最近 ${count} 条 commit:\n${historyList}`,
      };
    },
  },
  {
    command: 'clear',
    description: '清空当前对话',
    usage: '/clear',
    examples: ['/clear'],
    handler: async (args, context) => {
      return {
        success: true,
        message: '对话已清空',
        data: { action: 'clear' },
      };
    },
  },
  {
    command: 'export',
    description: '导出对话历史',
    usage: '/export',
    examples: ['/export'],
    handler: async (args, context) => {
      return {
        success: true,
        message: '对话历史已导出',
        data: { action: 'export' },
      };
    },
  },
];

export class CommandParser {
  private commands: Map<string, CommitCommand> = new Map();
  private commandHistory: string[] = [];

  constructor(customCommands: CommitCommand[] = []) {
    // 注册预定义命令
    COMMIT_COMMANDS.forEach(cmd => {
      this.commands.set(cmd.command, cmd);
    });
    
    // 注册自定义命令
    customCommands.forEach(cmd => {
      this.commands.set(cmd.command, cmd);
    });
  }

  // 解析命令
  parseCommand(input: string): { command: string; args: string[] } | null {
    if (!input.startsWith('/')) {
      return null;
    }

    const parts = input.substring(1).trim().split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    return { command, args };
  }

  // 执行命令
  async executeCommand(
    input: string,
    context: CommandContext
  ): Promise<CommandResult> {
    const parsed = this.parseCommand(input);
    if (!parsed) {
      return {
        success: false,
        message: '无效的命令格式',
      };
    }

    const { command, args } = parsed;
    const commandHandler = this.commands.get(command);

    if (!commandHandler) {
      return {
        success: false,
        message: `未知命令: /${command}。使用 /help 查看可用命令`,
      };
    }

    try {
      // 记录命令历史
      this.commandHistory.push(input);
      if (this.commandHistory.length > 50) {
        this.commandHistory = this.commandHistory.slice(-50);
      }

      const result = await commandHandler.handler(args, context);
      return result;
    } catch (error) {
      console.error('命令执行错误:', error);
      return {
        success: false,
        message: `命令执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  // 获取命令建议
  getCommandSuggestions(input: string): string[] {
    if (!input.startsWith('/')) {
      return [];
    }

    const query = input.substring(1).toLowerCase();
    const suggestions: string[] = [];

    for (const [command, cmd] of this.commands) {
      if (command.toLowerCase().startsWith(query)) {
        suggestions.push(`/${command}`);
      }
    }

    return suggestions.slice(0, 10);
  }

  // 获取命令历史
  getCommandHistory(): string[] {
    return [...this.commandHistory];
  }

  // 注册新命令
  registerCommand(command: CommitCommand): void {
    this.commands.set(command.command, command);
  }

  // 注销命令
  unregisterCommand(commandName: string): void {
    this.commands.delete(commandName);
  }

  // 获取所有命令
  getAllCommands(): CommitCommand[] {
    return Array.from(this.commands.values());
  }

  // 检查命令是否存在
  hasCommand(commandName: string): boolean {
    return this.commands.has(commandName);
  }

  // 获取命令信息
  getCommand(commandName: string): CommitCommand | undefined {
    return this.commands.get(commandName);
  }
}
