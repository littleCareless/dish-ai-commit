import * as vscode from "vscode";

export interface LanguageSettings {
    language: string;
}

/**
 * 语言设置管理器（使用VSCode Configuration API）
 */
export class LanguageSettingsManager {
    private static readonly CONFIG_KEY = "dish-ai-commit.base.language";

    /**
     * 获取当前语言设置
     */
    public static async getLanguage(resource?: vscode.Uri): Promise<string> {
        const config = vscode.workspace.getConfiguration("dish-ai-commit.base", resource);
        return config.get<string>("language") || "Simplified Chinese";
    }

    /**
     * 更新语言设置
     * @param language 新的语言值
     * @param target 配置目标（用户级别或工作区级别）
     * @param resource 资源URI（用于确定工作区）
     */
    public static async updateLanguage(
        language: string,
        target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global,
        resource?: vscode.Uri
    ): Promise<void> {
        const config = vscode.workspace.getConfiguration("dish-ai-commit.base", resource);
        await config.update("language", language, target);
    }

    /**
     * 获取语言设置的有效范围信息
     * @param resource 资源URI
     * @returns 设置的来源（默认、用户、工作区）
     */
    public static getLanguageScope(resource?: vscode.Uri): string {
        const inspect = vscode.workspace.getConfiguration("dish-ai-commit.base", resource).inspect<string>("language");

        if (inspect?.workspaceFolderValue !== undefined) {
            return "workspaceFolder";
        }
        if (inspect?.workspaceValue !== undefined) {
            return "workspace";
        }
        if (inspect?.globalValue !== undefined) {
            return "user";
        }
        return "default";
    }
}
