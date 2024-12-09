import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export class LocalizationManager {
  private static instance: LocalizationManager;
  private messages: { [key: string]: string } = {};

  private constructor(context: vscode.ExtensionContext) {
    // 获取 VSCode 当前语言设置
    const locale = vscode.env.language;

    try {
      // 加载对应语言的资源文件
      const resourcePath = path.join(
        context.extensionPath,
        "i18n",
        `${locale}.json`
      );
      if (fs.existsSync(resourcePath)) {
        this.messages = JSON.parse(fs.readFileSync(resourcePath, "utf8"));
      } else {
        // 如果找不到对应语言的资源文件，回退到英文
        const defaultPath = path.join(context.extensionPath, "i18n", "en.json");
        this.messages = JSON.parse(fs.readFileSync(defaultPath, "utf8"));
      }
    } catch (error) {
      console.error("Failed to load localization file:", error);
    }
  }

  public static initialize(context: vscode.ExtensionContext): void {
    if (!LocalizationManager.instance) {
      LocalizationManager.instance = new LocalizationManager(context);
    }
  }

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

  private static getMessageSafe(key: string): string {
    return this.instance?.messages[key] || key;
  }

  public getMessage(key: string): string {
    return this.messages[key] || key;
  }

  public format(key: string, ...args: any[]): string {
    let message = this.getMessage(key);
    args.forEach((arg, index) => {
      message = message.replace(`{${index}}`, arg.toString());
    });
    return message;
  }
}
