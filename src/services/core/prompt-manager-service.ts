import { ExtensionConfiguration } from "@/config/types";
import { ProfileManagerService } from "@/services/profile-manager/profile-manager-service";
import { PromptDetail, PromptKey, PromptSource, SYSTEM_GENERATED_PROMPTS } from "@/types/prompts";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

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
    // __dirname 在 VSCode 扩展中指向源码目录，但实际运行的是打包后的代码
    // 使用扩展的实际安装路径来定位 prompt 目录
    const extensionPath = vscode.extensions.getExtension("littleCareless.dish-ai-commit")?.extensionPath || __dirname;
    const promptDir = path.join(extensionPath, "dist", "prompt");

    try {
      const files = await fs.promises.readdir(promptDir);

      const profileService = ProfileManagerService.getInstance();
      const featureSettings = profileService.getFeatureSettings();
      const activeProfile = await profileService.getProfileForMode();

      let language = "en";
      if (activeProfile?.preferences?.language) {
        const lang = activeProfile.preferences.language;
        if (lang === "zh" || lang === "Simplified Chinese") {
          language = "zh";
        }
      }

      const extensionConfig = {
        base: {
          language: language,
        },
        features: {
          commitFormat: {
            enableMergeCommit: featureSettings.enableMergeCommit,
            enableEmoji: featureSettings.enableEmoji,
            enableBody: featureSettings.enableBody,
          },
          commitMessage: {
            useRecentCommitsAsReference: featureSettings.useRecentCommitsAsReference,
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
            // Removed blocking logic for LayeredCommitFile
            const filePath = path.join(promptDir, file);
            try {
              const module = await import(filePath);

              // 优先查找 default export（如果是函数），否则查找其他函数
              let promptFunction: Function | undefined;

              if (module.default && typeof module.default === "function") {
                promptFunction = module.default;
              } else {
                promptFunction = Object.values(module).find(
                  (value) => typeof value === "function"
                ) as Function | undefined;
              }

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
    } catch (error) {
      console.error("Error reading default prompts directory:", error);
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

  /**
   * 获取当前生效的 Prompt 内容
   * 优先级:
   * 1. .dish/prompts/<key>.md (Project Level)
   * 2. Active Prompt Configuration (User selected)
   * 3. Default Prompt
   */
  public async getActivePromptContent(key: string, scope?: vscode.ConfigurationScope): Promise<string> {
    await this.initializationPromise;

    // 0. Resolve Active Key Mapping
    // 如果请求的是功能入口 key (如 generate-commit)，检查是否有配置重定向
    let targetKey = key;
    if (key === PromptKey.GenerateCommitSystem) {
      const config = vscode.workspace.getConfiguration("dish-ai-commit.features.commitMessage", scope);
      const activeKey = config.get<string>("activePromptKey");
      if (activeKey && activeKey !== key) {
        targetKey = activeKey;
      }
    }

    // 1. Check .dish/prompts/<targetKey>.md
    const workspaceFolder = scope
      ? vscode.workspace.getWorkspaceFolder(scope as vscode.Uri)
      : vscode.workspace.workspaceFolders?.[0];

    if (workspaceFolder) {
      const dishPromptPath = path.join(workspaceFolder.uri.fsPath, ".dish", "prompts", `${targetKey}.md`);
      try {
        if (fs.existsSync(dishPromptPath)) {
          const content = await fs.promises.readFile(dishPromptPath, "utf-8");
          return content;
        }
      } catch (error) {
        console.warn(`Failed to read prompt from ${dishPromptPath}`, error);
      }
    }

    // 2. Check Active Prompt Configuration
    // 获取当前 key 对应的 active prompt key (例如 generate-commit 可能被配置为使用 custom-prompt-1)
    // 目前简化设计：我们不搞复杂的映射，而是直接看这个 key 本身是否有自定义配置
    // 或者，如果用户在 UI 上选择了 "Active"，我们将其存储在 config 中
    // 让我们沿用现有的 getPromptDetail 逻辑，它已经处理了 Workspace vs Global 的优先级
    // 但我们需要一个机制来标记 "Active"

    // 修正计划：
    // 我们约定：如果 dish-ai-commit.prompts.<key> 有值，它就是 Active 的。
    // UI 上的 "Set as Active" 实际上就是把内容写入到 dish-ai-commit.prompts.<key> (Workspace or Global)
    // 如果用户想用回默认的，就 "Reset"，即删除配置，回退到 Default。

    // 所以，其实 getPromptDetail 已经实现了大部分逻辑。
    // 唯一缺的是 .dish 文件的支持。

    const detail = this.getPromptDetail(targetKey, scope);
    return detail.content;
  }

  public getPrompt(key: string, scope?: vscode.ConfigurationScope): string {
    return this.getPromptDetail(key, scope).content;
  }

  public getPromptDetail(
    key: string,
    scope?: vscode.ConfigurationScope
  ): PromptDetail {
    // 1. Check .dish/prompts/<key>.md (Project Level) - Synchronous check not ideal but needed for this signature
    // Since this method is synchronous, we might skip file check or use fs.readFileSync if strictly needed.
    // However, for UI display, we might want to show if it's overridden by file.
    // Let's stick to Config vs Default for now in this method, as it's used by UI.
    // The UI can separately query for file existence if needed, or we make this async.
    // Given the existing signature is synchronous, let's keep it sync for config/default.

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

    // 检查是否为系统生成型提示词
    const isSystemGenerated = SYSTEM_GENERATED_PROMPTS.has(key as PromptKey);

    return { content, source, isCustomized, isNew, isSystemGenerated };
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

    // 3. Check for .dish/prompts overrides
    // This is a bit expensive to do for all prompts, but necessary for UI to show "Project" source
    const workspaceFolder = scope
      ? vscode.workspace.getWorkspaceFolder(scope as vscode.Uri)
      : vscode.workspace.workspaceFolders?.[0];

    if (workspaceFolder) {
      const dishPromptsDir = path.join(workspaceFolder.uri.fsPath, ".dish", "prompts");
      try {
        if (fs.existsSync(dishPromptsDir)) {
          const files = await fs.promises.readdir(dishPromptsDir);
          for (const file of files) {
            if (file.endsWith(".md")) {
              const key = path.parse(file).name;
              const content = await fs.promises.readFile(path.join(dishPromptsDir, file), "utf-8");

              // Override or add
              allPrompts[key] = {
                content,
                source: "project", // New source type, need to update types
                isCustomized: true,
                isNew: !this.defaultPrompts.has(key as PromptKey)
              };
            }
          }
        }
      } catch (error) {
        // Ignore error if .dish/prompts doesn't exist or can't be read
      }
    }

    return allPrompts;
  }
}