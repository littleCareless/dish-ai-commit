import { DISH_CONFIG_PREFIX } from "@/config/constants"
import { ExtensionConfiguration } from "@/config/types"
import { ProfileManagerService } from "@/services/profile-manager/profile-manager-service"
import { PromptDetail, PromptKey, PromptSource, SYSTEM_GENERATED_PROMPTS } from "@/types/prompts"
import { Logger } from "@/utils/logger"
import { stateManager } from "@/utils/state/state-manager"
import * as fs from "fs"
import * as path from "path"
import * as vscode from "vscode"

const logger = Logger.getInstance("Dish AI Commit Gen")

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
    logger.logOperationStart("loadDefaultPrompts");

    // __dirname 在 VSCode 扩展中指向源码目录，但实际运行的是打包后的代码
    // 使用扩展的实际安装路径来定位 prompt 目录
    const extensionPath = vscode.extensions.getExtension("littleCareless.dish-ai-commit")?.extensionPath || __dirname;
    const promptDir = path.join(extensionPath, "dist", "prompt");

    logger.debug("加载默认 prompts", {
      data: { extensionPath, promptDir }
    });

    try {
      const files = await fs.promises.readdir(promptDir);

      logger.debug("读取 prompt 目录", {
        data: { fileCount: files.length }
      });

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

              // Log module structure for debugging
              logger.debug("Module exports inspection", {
                data: {
                  file,
                  keys: Object.keys(module),
                  defaultType: typeof module.default,
                  defaultIsFunction: typeof module.default === "function"
                }
              });

              let promptContent: string | undefined;

              // Helper to execute prompt function
              const executePromptFunction = async (func: any, funcName: string) => {
                try {
                  logger.debug(`Attempting to execute prompt function: ${funcName}`, {
                    data: { file, funcName, length: func.length }
                  });

                  let result: unknown;
                  if (func.length === 0) {
                    result = await Promise.resolve(func());
                  } else {
                    result = await Promise.resolve(func({ config: extensionConfig, vcsType: "git" }));
                  }

                  logger.debug(`Prompt function ${funcName} executed`, {
                    data: { file, resultType: typeof result, resultLength: typeof result === 'string' ? result.length : 'N/A' }
                  });

                  if (typeof result === "string" && result.length > 0) {
                    return result;
                  } else {
                    logger.warn(`Prompt function ${funcName} returned invalid result`, {
                      data: { file, type: typeof result }
                    });
                  }
                } catch (error) {
                  logger.warn(`Failed to execute prompt function ${funcName}`, {
                    error: error as Error,
                    data: { file }
                  });
                }
                return undefined;
              };

              // 策略1: 优先查找 default export（如果是函数）
              if (module.default && typeof module.default === "function") {
                promptContent = await executePromptFunction(module.default, "default");
              }

              // 策略1.5: 如果 default export 失败，尝试查找与文件名匹配的具名导出
              if (!promptContent) {
                // generate-commit-simple -> generateCommitSimple
                // generate-commit -> generateCommitSystem (special case mapping in getPromptKeyFromFile)
                // Let's try to find a named export that matches the promptKey (camelCase)
                const expectedExportName = promptKey;
                if (expectedExportName && typeof module[expectedExportName] === "function") {
                  logger.debug(`Fallback: Found named export matching prompt key`, {
                    data: { file, exportName: expectedExportName }
                  });
                  promptContent = await executePromptFunction(module[expectedExportName], expectedExportName);
                }
              }

              // 策略2: 如果 default export 失败，查找以 _TEMPLATE 结尾的导出常量
              if (!promptContent) {
                const templateKey = Object.keys(module).find(
                  (key) => key.endsWith("_TEMPLATE") && typeof module[key] === "string"
                );
                if (templateKey) {
                  promptContent = module[templateKey] as string;
                  logger.debug("使用 _TEMPLATE 常量作为模板", {
                    data: { file, key: promptKey, templateKey }
                  });
                }
              }

              // 策略3: 查找所有长度大于 50 的字符串常量（作为最后的回退）
              if (!promptContent) {
                const templateConstant = Object.values(module).find(
                  (value) => typeof value === "string" && value.length > 50
                ) as string | undefined;
                if (templateConstant) {
                  promptContent = templateConstant;
                  logger.debug("使用模块中的字符串常量作为模板", {
                    data: { file, key: promptKey }
                  });
                }
              }

              // 如果找到了内容，添加到 Map
              if (promptContent) {
                this.defaultPrompts.set(promptKey, promptContent);
                logger.debug("加载 prompt 成功", {
                  data: { key: promptKey, contentLength: promptContent.length }
                });
              } else {
                logger.warn(`未找到有效的 prompt 函数或模板`, {
                  data: { file, key: promptKey, moduleKeys: Object.keys(module) }
                });
              }
            } catch (error) {
              logger.logError(
                error as Error,
                `加载 prompt 失败: ${file}`,
                { operation: "loadDefaultPrompts", data: { file } }
              );
            }
          }
        }
      }

      logger.logOperationEnd("loadDefaultPrompts", undefined, {
        data: { loadedCount: this.defaultPrompts.size }
      });
    } catch (error) {
      logger.logError(
        error as Error,
        "读取默认 prompts 目录失败",
        { operation: "loadDefaultPrompts" }
      );
    }
  }

  private getPromptKeyFromFile(fileName: string): PromptKey | null {
    const name = path.parse(fileName).name;
    const keyMap: { [key: string]: PromptKey } = {
      "branch-name": PromptKey.BranchNameSystem,
      "code-review-simple": PromptKey.CodeReviewSimple,
      "code-review": PromptKey.CodeReviewSystem,
      "generate-commit-fallback": PromptKey.GenerateCommitFallbackSystem,
      "generate-commit-simple": PromptKey.GenerateCommitSimple,
      "generate-commit": PromptKey.GenerateCommitSystem,
      "layered-commit-file": PromptKey.LayeredCommitFile,
      "layered-commit-batch": PromptKey.LayeredCommitBatch,
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
    logger.debug("获取活动 prompt 内容", {
      data: { key, hasScope: !!scope }
    });

    await this.initializationPromise;

    // 0. Resolve Active Key Mapping
    // 如果请求的是功能入口 key (如 generate-commit)，检查是否有配置重定向
    let targetKey = key;
    if (key === PromptKey.GenerateCommitSystem) {
      // 从 globalState 获取 activePromptKey
      const activeKey = stateManager.getGlobal<string>(`${DISH_CONFIG_PREFIX}_active_prompt_key`);
      if (activeKey && activeKey !== key) {
        targetKey = activeKey;
        logger.debug("使用重定向的 prompt key", {
          data: { originalKey: key, targetKey: activeKey }
        });
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
          logger.debug("从项目文件读取 prompt", {
            data: { key: targetKey, path: dishPromptPath }
          });
          const content = await fs.promises.readFile(dishPromptPath, "utf-8");
          return content;
        }
      } catch (error) {
        logger.warn(`读取项目 prompt 文件失败`, {
          error: error instanceof Error ? error : new Error(String(error)),
          data: { path: dishPromptPath }
        });
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

    logger.debug("获取 prompt 详情", {
      data: {
        key: targetKey,
        source: detail.source,
        isCustomized: detail.isCustomized,
        contentLength: detail.content.length
      }
    });

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
    const inspection = config.inspect<any>(key);

    const defaultValue = this.defaultPrompts.get(key as PromptKey) ?? "";
    let source: PromptSource = "default";
    let content = defaultValue;
    let isCustomized = false;
    let isNew = false;

    // 确保 content 始终是字符串
    const getStringContent = (value: any): string => {
      if (typeof value === "string") {
        return value;
      }
      if (value === null || value === undefined) {
        return "";
      }
      // 如果配置中存储的是对象，记录警告并回退到默认值
      logger.warn(`配置中的 prompt ${key} 不是字符串类型，将使用默认值`, {
        data: { key, valueType: typeof value, value }
      });
      return "";
    };

    if (inspection?.workspaceValue !== undefined) {
      const workspaceContent = getStringContent(inspection.workspaceValue);
      if (workspaceContent) {
        content = workspaceContent;
        source = "workspace";
        isCustomized = true;
      }
    } else if (inspection?.globalValue !== undefined) {
      const globalContent = getStringContent(inspection.globalValue);
      if (globalContent) {
        content = globalContent;
        source = "global";
        isCustomized = true;
      }
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
    logger.logOperationStart("updatePrompt", {
      data: { key, contentLength: content.length, target }
    });

    try {
      const config = vscode.workspace.getConfiguration("dish-ai-commit.prompts");
      await config.update(key, content, target);

      logger.logOperationEnd("updatePrompt", undefined, {
        data: { key, target }
      });
    } catch (error) {
      logger.logError(
        error as Error,
        `更新 prompt 失败: ${key}`,
        { operation: "updatePrompt", data: { key, target } }
      );
      throw error;
    }
  }

  public async deletePrompt(key: string, target: vscode.ConfigurationTarget) {
    logger.logOperationStart("deletePrompt", {
      data: { key, target }
    });

    try {
      const config = vscode.workspace.getConfiguration("dish-ai-commit.prompts");
      await config.update(key, undefined, target);

      logger.logOperationEnd("deletePrompt", undefined, {
        data: { key, target }
      });
    } catch (error) {
      logger.logError(
        error as Error,
        `删除 prompt 失败: ${key}`,
        { operation: "deletePrompt", data: { key, target } }
      );
      throw error;
    }
  }

  public async resetPrompt(key: string, target: vscode.ConfigurationTarget) {
    logger.logOperationStart("resetPrompt", {
      data: { key, target }
    });

    try {
      const config = vscode.workspace.getConfiguration("dish-ai-commit.prompts");
      await config.update(key, undefined, target);

      logger.logOperationEnd("resetPrompt", undefined, {
        data: { key, target }
      });
    } catch (error) {
      logger.logError(
        error as Error,
        `重置 prompt 失败: ${key}`,
        { operation: "resetPrompt", data: { key, target } }
      );
      throw error;
    }
  }

  public async resetAllPrompts(target: vscode.ConfigurationTarget) {
    logger.logOperationStart("resetAllPrompts", {
      data: { target }
    });

    try {
      const config = vscode.workspace.getConfiguration("dish-ai-commit");
      const promptsConfig = vscode.workspace.getConfiguration("dish-ai-commit.prompts");

      const allKeys = promptsConfig.keys();

      logger.debug("重置所有 prompts", {
        data: { keyCount: allKeys.length }
      });

      for (const key of allKeys) {
        await promptsConfig.update(key, undefined, target);
      }

      // 重置整个 "prompts" 部分
      await config.update("prompts", undefined, target);

      logger.logOperationEnd("resetAllPrompts", undefined, {
        data: { target, resetCount: allKeys.length }
      });
    } catch (error) {
      logger.logError(
        error as Error,
        "重置所有 prompts 失败",
        { operation: "resetAllPrompts", data: { target } }
      );
      throw error;
    }
  }

  public async getAllPrompts(
    scope?: vscode.ConfigurationScope
  ): Promise<Record<string, PromptDetail>> {
    await this.initializationPromise;
    const allPrompts: Record<string, PromptDetail> = {};

    // 1. 添加所有已知的 PromptKey（确保所有 prompts 都会显示，即使加载失败）
    for (const key of Object.values(PromptKey)) {
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
        logger.warn("读取 .dish/prompts 目录失败", {
          error: error instanceof Error ? error : new Error(String(error)),
          data: { dishPromptsDir }
        });
        // Ignore error if .dish/prompts doesn't exist or can't be read
      }
    }

    logger.debug("获取所有 prompts 完成", {
      data: { totalCount: Object.keys(allPrompts).length }
    });

    return allPrompts;
  }
}