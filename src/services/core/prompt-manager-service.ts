import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { ExtensionConfiguration } from "../../config/types";
import { PromptDetail, PromptKey, PromptSource } from "../../types/prompts";

export class PromptManagerService {
  private static instance: PromptManagerService;
  private defaultPrompts: Map<PromptKey, string> = new Map();
  private initializationPromise: Promise<void>;

  private constructor() {
    this.initializationPromise = this.loadDefaultPrompts();
  }

  public static getInstance(): PromptManagerService {
    if (!PromptManagerService.instance) {
      PromptManagerService.instance = new PromptManagerService();
    }
    return PromptManagerService.instance;
  }

  private async loadDefaultPrompts() {
    const promptDir = path.join(__dirname, "..", "prompt");
    const files = await fs.promises.readdir(promptDir);
    const config = vscode.workspace.getConfiguration("dish-ai-commit");
    const extensionConfig = {
      base: {
        language: config.get<string>("base.language") || "en",
      },
      features: {
        commitFormat: {
          enableMergeCommit: config.get<boolean>("features.commitFormat.enableMergeCommit") ?? false,
          enableEmoji: config.get<boolean>("features.commitFormat.enableEmoji") ?? true,
          enableBody: config.get<boolean>("features.commitFormat.enableBody") ?? true,
        },
        commitMessage: {
          useRecentCommitsAsReference: config.get<boolean>("features.commitMessage.useRecentCommitsAsReference") ?? false,
        },
      },
    } as ExtensionConfiguration;

    for (const file of files) {
      if (
        (file.endsWith(".js") || file.endsWith(".ts")) &&
        !file.endsWith(".d.ts")
      ) {
        const promptKey = this.getPromptKeyFromFile(file);
        if (promptKey) {
          if (promptKey === PromptKey.LayeredCommitFile) {
            this.defaultPrompts.set(
              promptKey,
              "[这是一个用于单文件提交的动态提示词，无法在此处编辑。]"
            );
            continue;
          }
          const filePath = path.join(promptDir, file);
          try {
            const module = await import(filePath);
            const promptFunction = Object.values(module).find(
              (value) => typeof value === "function"
            ) as Function | undefined;

            if (promptFunction) {
              let promptContent = "";
              // 根据函数参数数量和类型，智能调用
              if (promptFunction.length === 0) {
                promptContent = promptFunction();
              } else if (promptFunction.length === 1) {
                // 假设需要一个配置对象
                promptContent = promptFunction({ config: extensionConfig, vcsType: "git" });
              } else {
                console.warn(`Prompt function in ${file} has an unsupported number of arguments.`);
              }
              this.defaultPrompts.set(promptKey, promptContent);
            } else {
              // 兼容旧的导出字符串的方式
              const fileContent = await fs.promises.readFile(filePath, "utf-8");
              const promptContent = this.extractExportedString(fileContent);
              if (promptContent) {
                this.defaultPrompts.set(promptKey, promptContent);
              }
            }
          } catch (error) {
            console.error(`Error loading prompt from ${file}:`, error);
          }
        }
      }
    }
  }

  private getPromptKeyFromFile(fileName: string): PromptKey | null {
    const name = path.parse(fileName).name;
    const keyMap: { [key: string]: PromptKey } = {
      "branch-name": PromptKey.BranchNameSystem,
      "code-review.1": PromptKey.CodeReviewSystem1,
      "code-review": PromptKey.CodeReviewSystem,
      "generate-commit-fallback": PromptKey.GenerateCommitFallbackSystem,
      "generate-commit.1": PromptKey.GenerateCommitSystem1,
      "generate-commit": PromptKey.GenerateCommitSystem,
      "layered-commit-file": PromptKey.LayeredCommitFile,
      "pr-summary": PromptKey.PRSummarySystem,
      "weekly-report": PromptKey.WeeklyReport,
    };
    return keyMap[name] || null;
  }

  private extractExportedString(content: string): string | null {
    // 匹配 export const xxx = `...` 或 export function xxx() { return `...` }
    const match =
      content.match(/export const \w+ = `([\s\S]*)`;/) ||
      content.match(/export function \w+\s*\([^)]*\)\s*\{[\s\S]*return\s*`([\s\S]*)`[\s\S]*\}/);
    return match ? (match[1] || match[2]).trim() : null;
  }

  public getPrompt(key: string, scope?: vscode.ConfigurationScope): string {
    return this.getPromptDetail(key, scope).content;
  }

  public getPromptDetail(
    key: string,
    scope?: vscode.ConfigurationScope
  ): PromptDetail {
    const config = vscode.workspace.getConfiguration(
      "dish-ai-commit.prompts",
      scope
    );
    const inspection = config.inspect<string>(key);

    const defaultValue = this.defaultPrompts.get(key as PromptKey) ?? "";
    let source: PromptSource = "default";
    let content = defaultValue;
    let isCustomized = false;
    let isNew = false;

    if (inspection?.workspaceValue !== undefined) {
      content = inspection.workspaceValue;
      source = "workspace";
      isCustomized = true;
    } else if (inspection?.globalValue !== undefined) {
      content = inspection.globalValue;
      source = "global";
      isCustomized = true;
    }

    // 如果一个 key 不在默认 prompts里，那它就是用户新建的
    if (!this.defaultPrompts.has(key as PromptKey)) {
      isNew = true;
    }

    return { content, source, isCustomized, isNew };
  }

  public async updatePrompt(
    key: string,
    content: string,
    target: vscode.ConfigurationTarget
  ) {
    const config = vscode.workspace.getConfiguration("dish-ai-commit.prompts");
    await config.update(key, content, target);
  }

  public async deletePrompt(key: string, target: vscode.ConfigurationTarget) {
    const config = vscode.workspace.getConfiguration("dish-ai-commit.prompts");
    await config.update(key, undefined, target);
  }

  public async resetPrompt(key: string, target: vscode.ConfigurationTarget) {
    const config = vscode.workspace.getConfiguration("dish-ai-commit.prompts");
    await config.update(key, undefined, target);
  }

  public async resetAllPrompts(target: vscode.ConfigurationTarget) {
    const config = vscode.workspace.getConfiguration("dish-ai-commit");
    const promptsConfig = vscode.workspace.getConfiguration("dish-ai-commit.prompts");

    const allKeys = promptsConfig.keys();

    for (const key of allKeys) {
      await promptsConfig.update(key, undefined, target);
    }

    // 重置整个 "prompts" 部分
    await config.update("prompts", undefined, target);
  }

  public async getAllPrompts(
    scope?: vscode.ConfigurationScope
  ): Promise<Record<string, PromptDetail>> {
    await this.initializationPromise;
    const allPrompts: Record<string, PromptDetail> = {};

    // 1. 添加所有默认的 prompts
    for (const [key, content] of this.defaultPrompts.entries()) {
      allPrompts[key] = this.getPromptDetail(key, scope);
    }

    // 2. 读取并合并工作区和全局的 prompts
    const promptsConfig = vscode.workspace.getConfiguration("dish-ai-commit.prompts", scope);
    const inspection = promptsConfig.inspect<any>("");
    const workspaceConfig = inspection?.workspaceValue || {};
    const globalConfig = inspection?.globalValue || {};

    const allCustomKeys = [...Object.keys(workspaceConfig), ...Object.keys(globalConfig)];

    for (const key of allCustomKeys) {
      if (!allPrompts[key]) { // 只添加新的、非默认的 prompts
        allPrompts[key] = this.getPromptDetail(key, scope);
      }
    }

    return allPrompts;
  }
}