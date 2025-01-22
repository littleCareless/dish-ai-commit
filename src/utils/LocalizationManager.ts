import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

/**
 * 管理插件的本地化资源
 * 使用单例模式确保只有一个本地化管理器实例
 */
export class LocalizationManager {
  /** 单例实例 */
  private static instance: LocalizationManager;
  /** 存储本地化消息的对象 */
  private messages: { [key: string]: string } = {};

  /**
   * 私有构造函数,加载对应语言的本地化资源
   * @param context VSCode 插件上下文
   */
  private constructor(context: vscode.ExtensionContext) {
    // 获取 VSCode 当前语言设置
    const locale = vscode.env.language;

    try {
      // 尝试加载对应语言的资源文件
      const resourcePath = path.join(
        context.extensionPath,
        "i18n",
        `${locale}.json`
      );
      if (fs.existsSync(resourcePath)) {
        this.messages = JSON.parse(fs.readFileSync(resourcePath, "utf8"));
      } else {
        // 找不到对应语言时回退到英文
        const defaultPath = path.join(context.extensionPath, "i18n", "en.json");
        this.messages = JSON.parse(fs.readFileSync(defaultPath, "utf8"));
      }
    } catch (error) {
      console.error("Failed to load localization file:", error);
    }
  }

  /**
   * 初始化本地化管理器
   * @param context VSCode 插件上下文
   */
  public static initialize(context: vscode.ExtensionContext): void {
    if (!LocalizationManager.instance) {
      LocalizationManager.instance = new LocalizationManager(context);
    }
  }

  /**
   * 获取本地化管理器实例
   * @returns LocalizationManager 实例
   * @throws 如果管理器未初始化则抛出错误
   */
  public static getInstance(): LocalizationManager {
    if (!LocalizationManager.instance) {
      throw new Error(
        LocalizationManager.getMessageSafe(
          "localization.manager.not.initialized"
        )
      );
    }
    return LocalizationManager.instance;
  }

  /**
   * 安全地获取本地化消息
   * @param key 消息键
   * @returns 本地化消息,如果未找到则返回键名
   */
  private static getMessageSafe(key: string): string {
    return this.instance?.messages[key] || key;
  }

  /**
   * 获取指定键的本地化消息
   * @param key 消息键
   * @returns 本地化消息,如果未找到则返回键名
   */
  public getMessage(key: string): string {
    return this.messages[key] || key;
  }

  /**
   * 使用参数格式化本地化消息
   * @param key 消息键
   * @param args 要替换到消息中的参数列表
   * @returns 格式化后的消息
   */
  public format(key: string, ...args: any[]): string {
    try {
      let message = this.getMessage(key);
      if (!message) {
        console.warn(`Missing localization key: ${key}`);
        return key;
      }

      // 使用参数替换消息中的占位符 {0}, {1} 等
      args.forEach((arg, index) => {
        const value = arg?.toString() ?? "";
        message = message.replace(`{${index}}`, value);
      });
      return message;
    } catch (error) {
      console.error(`Error formatting message for key ${key}:`, error);
      return key;
    }
  }

  /**
   * 验证指定的键是否都存在对应的本地化消息
   * @param keys 要验证的消息键数组
   * @returns 不存在对应消息的键数组
   */
  public validateMessages(keys: string[]): string[] {
    const missingKeys = keys.filter((key) => !this.messages[key]);
    return missingKeys;
  }
}
