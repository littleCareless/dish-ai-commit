import { DISH_CONFIG_PREFIX } from "@/config/constants";
import { ExtensionConfiguration } from "@/config/types";
import {
  PromptCategory,
  PromptDetail,
  PromptKey,
  PromptSource,
  SYSTEM_GENERATED_PROMPTS,
} from "@shared/types/prompts";
import { FeaturesSettingsManager } from "@/services/settings/features-settings-manager";
import { workspaceManager } from "@/services/core/workspace-manager";
import { Logger } from "@/utils/logger";
import { stateManager } from "@/utils/state/state-manager";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

const logger = Logger.getInstance("Dish AI Commit Gen");

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

  private static readonly PROMPT_STORAGE_KEY = `${DISH_CONFIG_PREFIX}_prompts`;
  private static readonly PROMPT_METADATA_KEY = `${DISH_CONFIG_PREFIX}_prompt_metadata`;

  /**
   * 获取全局提示词存储（使用 stateManager 的公共方法）
   */
  private getGlobalPrompts(): Record<string, string> {
    return stateManager.getGlobal<Record<string, string>>(
      PromptManagerService.PROMPT_STORAGE_KEY,
      {}
    );
  }

  /**
   * 设置全局提示词存储（使用 stateManager 的公共方法）
   */
  private async setGlobalPrompts(prompts: Record<string, string>): Promise<void> {
    await stateManager.setGlobal(PromptManagerService.PROMPT_STORAGE_KEY, prompts);
  }

  /**
   * 获取提示词元数据（包含 category 等信息）
   */
  private getPromptMetadata(): Record<string, { category: PromptCategory }> {
    return stateManager.getGlobal<Record<string, { category: PromptCategory }>>(
      PromptManagerService.PROMPT_METADATA_KEY,
      {}
    );
  }

  /**
   * 设置提示词元数据
   */
  private async setPromptMetadata(metadata: Record<string, { category: PromptCategory }>): Promise<void> {
    await stateManager.setGlobal(PromptManagerService.PROMPT_METADATA_KEY, metadata);
  }

  /**
   * 设置 ExtensionContext（用于向后兼容，但不再必需）
   * 由于现在使用 stateManager，此方法为空实现
   */
  public setExtensionContext(context: vscode.ExtensionContext): void {
    // 保留此方法以保持向后兼容性，但不再需要
  }

  private async loadDefaultPrompts() {
    logger.logOperationStart("loadDefaultPrompts");

    // __dirname 在 VSCode 扩展中指向源码目录，但实际运行的是打包后的代码
    // 使用扩展的实际安装路径来定位 prompt 目录
    const extensionPath =
      vscode.extensions.getExtension("littleCareless.dish-ai-commit")
        ?.extensionPath || __dirname;
    const promptDir = path.join(extensionPath, "dist", "prompt");

    logger.debug("加载默认 prompts", {
      data: { extensionPath, promptDir },
    });

    try {
      const files = await fs.promises.readdir(promptDir);

      logger.debug("读取 prompt 目录", {
        data: { fileCount: files.length },
      });

      // TODO: Refactor to inject config instead of fetching it here.
      // For now, using defaults to break the dependency cycle.
      const language = "en";
      const extensionConfig = {
        base: {
          language: language,
        },
        features: {
          commitFormat: {
            enableMergeCommit: true,
            enableEmoji: true,
            enableBody: true,
          },
          commitMessage: {
            useRecentCommitsAsReference: false,
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
                  defaultIsFunction: typeof module.default === "function",
                },
              });

              let promptContent: string | undefined;

              // Helper to execute prompt function
              const executePromptFunction = async (
                func: any,
                funcName: string
              ) => {
                try {
                  logger.debug(
                    `Attempting to execute prompt function: ${funcName}`,
                    {
                      data: { file, funcName, length: func.length },
                    }
                  );

                  let result: unknown;
                  if (func.length === 0) {
                    result = await Promise.resolve(func());
                  } else {
                    result = await Promise.resolve(
                      func({ config: extensionConfig, vcsType: "git" })
                    );
                  }

                  logger.debug(`Prompt function ${funcName} executed`, {
                    data: {
                      file,
                      resultType: typeof result,
                      resultLength:
                        typeof result === "string" ? result.length : "N/A",
                    },
                  });

                  if (typeof result === "string" && result.length > 0) {
                    return result;
                  } else {
                    logger.warn(
                      `Prompt function ${funcName} returned invalid result`,
                      {
                        data: { file, type: typeof result },
                      }
                    );
                  }
                } catch (error) {
                  logger.warn(`Failed to execute prompt function ${funcName}`, {
                    error: error as Error,
                    data: { file },
                  });
                }
                return undefined;
              };

              // 策略1: 优先查找 default export（如果是函数）
              if (module.default && typeof module.default === "function") {
                promptContent = await executePromptFunction(
                  module.default,
                  "default"
                );
              }

              // 策略1.5: 如果 default export 失败，尝试查找与文件名匹配的具名导出
              if (!promptContent) {
                // generate-commit-simple -> generateCommitSimple
                // generate-commit -> generateCommitSystem (special case mapping in getPromptKeyFromFile)
                // Let's try to find a named export that matches the promptKey (camelCase)
                const expectedExportName = promptKey;
                if (
                  expectedExportName &&
                  typeof module[expectedExportName] === "function"
                ) {
                  logger.debug(
                    `Fallback: Found named export matching prompt key`,
                    {
                      data: { file, exportName: expectedExportName },
                    }
                  );
                  promptContent = await executePromptFunction(
                    module[expectedExportName],
                    expectedExportName
                  );
                }
              }

              // 策略2: 如果 default export 失败，查找以 _TEMPLATE 结尾的导出常量
              if (!promptContent) {
                const templateKey = Object.keys(module).find(
                  (key) =>
                    key.endsWith("_TEMPLATE") && typeof module[key] === "string"
                );
                if (templateKey) {
                  promptContent = module[templateKey] as string;
                  logger.debug("使用 _TEMPLATE 常量作为模板", {
                    data: { file, key: promptKey, templateKey },
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
                    data: { file, key: promptKey },
                  });
                }
              }

              // 如果找到了内容，添加到 Map
              if (promptContent) {
                this.defaultPrompts.set(promptKey, promptContent);
                logger.debug("加载 prompt 成功", {
                  data: { key: promptKey, contentLength: promptContent.length },
                });
              } else {
                logger.warn(`未找到有效的 prompt 函数或模板`, {
                  data: {
                    file,
                    key: promptKey,
                    moduleKeys: Object.keys(module),
                  },
                });
              }
            } catch (error) {
              logger.logError(error as Error, `加载 prompt 失败: ${file}`, {
                operation: "loadDefaultPrompts",
                data: { file },
              });
            }
          }
        }
      }

      logger.logOperationEnd("loadDefaultPrompts", undefined, {
        data: { loadedCount: this.defaultPrompts.size },
      });
    } catch (error) {
      logger.logError(error as Error, "读取默认 prompts 目录失败", {
        operation: "loadDefaultPrompts",
      });
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
      content.match(
        /export function \w+\s*\([^)]*\)\s*\{[\s\S]*return\s*`([\s\S]*)`[\s\S]*\}/
      );
    return match ? (match[1] || match[2]).trim() : null;
  }

  /**
   * 获取当前生效的 Prompt 内容（支持多工作区）
   * 优先级:
   * 1. .dish/prompts/<key>.md (Project Level - 直接返回内容)
   * 2. .dish/config.json (Project Level - 活跃选择)
   * 3. 工作区级活跃选择 (workspaceActivePrompts)
   * 4. 全局级活跃选择 (activePrompts)
   * 5. 默认提示词
   */
  public async getActivePromptContent(
    key: string,
    scope?: vscode.ConfigurationScope
  ): Promise<string> {
    logger.debug("获取活动 prompt 内容", {
      data: { key, hasScope: !!scope },
    });

    await this.initializationPromise;

    // 0. 获取分类
    const category = this.getCategoryFromPromptKey(key);
    if (!category) {
      // 不在已知分类中，直接返回默认或配置
      return this.getPromptDetail(key, scope).content;
    }

    // 1. 检查项目级提示词文件 (.dish/prompts/<key>.md) - 直接返回内容
    const workspaceFolder = scope
      ? vscode.workspace.getWorkspaceFolder(scope as vscode.Uri)
      : vscode.workspace.workspaceFolders?.[0];

    if (workspaceFolder) {
      const dishPromptPath = path.join(
        workspaceFolder.uri.fsPath,
        ".dish",
        "prompts",
        `${key}.md`
      );
      try {
        if (fs.existsSync(dishPromptPath)) {
          const content = await fs.promises.readFile(dishPromptPath, "utf-8");
          logger.debug("从项目文件读取 prompt", {
            data: { key, path: dishPromptPath },
          });
          return content;
        }
      } catch (error) {
        logger.warn(`读取项目 prompt 文件失败`, {
          error: error instanceof Error ? error : new Error(String(error)),
          data: { path: dishPromptPath },
        });
      }
    }

    // 2. 获取工作区 ID（如果存在工作区）
    let workspaceId: string | undefined;
    if (workspaceFolder) {
      workspaceId = workspaceManager.getWorkspaceId(workspaceFolder);
    }

    // 3. 从 FeaturesSettingsManager 获取活跃提示词配置
    //    优先级：项目级配置 > 工作区级配置 > 全局配置
    // 注意：FeaturesSettingsManager 应该已经在 extension.ts 中被初始化
    // 这里我们创建一个新的实例，但依赖于 stateManager 的全局状态
    const featuresManager = FeaturesSettingsManager.getInstance(
      // 通过 stateManager 的私有属性获取 context（临时方案）
      (stateManager as any)._context || {} as any
    );

    // 获取当前工作区的活跃提示词映射
    const activePrompts = await featuresManager.getActivePrompts(workspaceId);
    const activeKey = activePrompts[category];

    if (activeKey && activeKey !== key) {
      // 使用配置的活跃提示词
      const detail = this.getPromptDetail(activeKey, scope);
      logger.debug("使用活跃提示词配置", {
        data: { originalKey: key, activeKey, category, workspaceId },
      });
      return detail.content;
    }

    // 4. 回退到默认提示词
    const detail = this.getPromptDetail(key, scope);
    logger.debug("使用默认提示词", {
      data: { key, category },
    });
    return detail.content;
  }

  public getPrompt(key: string, scope?: vscode.ConfigurationScope): string {
    return this.getPromptDetail(key, scope).content;
  }

  /**
   * 根据提示词key获取对应的分类
   */
  private getCategoryFromPromptKey(key: string): PromptCategory | null {
    // Import PROMPT_CATEGORIES from prompts types
    // We need to dynamically import or use a mapping here
    // Since we can't import at method level, let's use a simple mapping
    const promptKey = key as PromptKey;

    // Mapping from our existing PROMPT_CATEGORIES
    const categoryMap: Record<PromptKey, PromptCategory> = {
      [PromptKey.BranchNameSystem]: PromptCategory.Git,
      [PromptKey.CodeReviewSimple]: PromptCategory.CodeReview,
      [PromptKey.CodeReviewSystem]: PromptCategory.CodeReview,
      [PromptKey.GenerateCommitFallbackSystem]: PromptCategory.Commit,
      [PromptKey.GenerateCommitSimple]: PromptCategory.Commit,
      [PromptKey.GenerateCommitSystem]: PromptCategory.Commit,
      [PromptKey.LayeredCommitFile]: PromptCategory.Commit,
      [PromptKey.LayeredCommitBatch]: PromptCategory.Commit,
      [PromptKey.PRSummarySystem]: PromptCategory.PR,
      [PromptKey.WeeklyReport]: PromptCategory.Report,
    };

    return categoryMap[promptKey] || null;
  }

  public getPromptDetail(
    key: string,
    scope?: vscode.ConfigurationScope
  ): PromptDetail {
    const defaultValue = this.defaultPrompts.get(key as PromptKey) ?? "";
    let source: PromptSource = "default";
    let content = defaultValue;
    let isCustomized = false;
    let isNew = false;
    let category: PromptCategory | undefined;

    // 1. 从 globalState 获取全局自定义提示词内容
    const globalPrompts = this.getGlobalPrompts();
    const globalContent = globalPrompts[key];

    // 2. 从 workspace configuration 获取工作区级提示词内容（向后兼容）
    const config = vscode.workspace.getConfiguration(
      "dish-ai-commit.prompts",
      scope
    );
    const inspection = config.inspect<any>(key);
    const workspaceContent = inspection?.workspaceValue;

    // 3. 确定内容来源（优先级：工作区 > 全局 > 默认）
    if (workspaceContent && typeof workspaceContent === "string" && workspaceContent) {
      content = workspaceContent;
      source = "workspace";
      isCustomized = true;
    } else if (globalContent && typeof globalContent === "string" && globalContent) {
      content = globalContent;
      source = "global";
      isCustomized = true;
    }

    // 如果一个 key 不在默认 prompts里，那它就是用户新建的
    if (!this.defaultPrompts.has(key as PromptKey)) {
      isNew = true;
    }

    // 检查是否为系统生成型提示词
    const isSystemGenerated = SYSTEM_GENERATED_PROMPTS.has(key as PromptKey);

    // 4. 获取分类信息
    // 优先级：系统映射 > 元数据存储 > 未知
    const systemCategory = this.getCategoryFromPromptKey(key);
    if (systemCategory) {
      category = systemCategory;
    } else {
      // 从元数据中获取自定义提示词的分类
      const metadata = this.getPromptMetadata();
      if (metadata[key]?.category) {
        category = metadata[key].category;
      }
    }

    return { content, source, isCustomized, isNew, isSystemGenerated, category };
  }

  public async updatePrompt(
    key: string,
    content: string,
    target: vscode.ConfigurationTarget
  ) {
    logger.logOperationStart("updatePrompt", {
      data: { key, contentLength: content.length, target },
    });

    try {
      if (target === vscode.ConfigurationTarget.Global) {
        // 使用 globalState 存储全局提示词内容
        const globalPrompts = this.getGlobalPrompts();
        globalPrompts[key] = content;
        await this.setGlobalPrompts(globalPrompts);
      } else if (target === vscode.ConfigurationTarget.Workspace) {
        // 工作区级别仍然使用 workspace configuration（向后兼容）
        const config = vscode.workspace.getConfiguration(
          "dish-ai-commit.prompts"
        );
        await config.update(key, content, target);
      } else {
        // 对于 WorkspaceFolder 级别，也使用 workspace configuration
        const config = vscode.workspace.getConfiguration(
          "dish-ai-commit.prompts"
        );
        await config.update(key, content, target);
      }

      logger.logOperationEnd("updatePrompt", undefined, {
        data: { key, target },
      });
    } catch (error) {
      logger.logError(error as Error, `更新 prompt 失败: ${key}`, {
        operation: "updatePrompt",
        data: { key, target },
      });
      throw error;
    }
  }

  /**
   * 更新提示词元数据（保存分类信息）
   */
  public async updatePromptMetadata(key: string, category: PromptCategory): Promise<void> {
    const metadata = this.getPromptMetadata();
    metadata[key] = { category };
    await this.setPromptMetadata(metadata);
  }

  /**
   * 删除提示词元数据
   */
  public async deletePromptMetadata(key: string): Promise<void> {
    const metadata = this.getPromptMetadata();
    delete metadata[key];
    await this.setPromptMetadata(metadata);
  }

  public async deletePrompt(key: string, target: vscode.ConfigurationTarget) {
    logger.logOperationStart("deletePrompt", {
      data: { key, target },
    });

    try {
      if (target === vscode.ConfigurationTarget.Global) {
        // 从 globalState 删除全局提示词内容
        const globalPrompts = this.getGlobalPrompts();
        delete globalPrompts[key];
        await this.setGlobalPrompts(globalPrompts);
      } else if (target === vscode.ConfigurationTarget.Workspace) {
        // 工作区级别使用 workspace configuration
        const config = vscode.workspace.getConfiguration(
          "dish-ai-commit.prompts"
        );
        await config.update(key, undefined, target);
      } else {
        // WorkspaceFolder 级别
        const config = vscode.workspace.getConfiguration(
          "dish-ai-commit.prompts"
        );
        await config.update(key, undefined, target);
      }

      logger.logOperationEnd("deletePrompt", undefined, {
        data: { key, target },
      });
    } catch (error) {
      logger.logError(error as Error, `删除 prompt 失败: ${key}`, {
        operation: "deletePrompt",
        data: { key, target },
      });
      throw error;
    }
  }

  public async resetPrompt(key: string, target: vscode.ConfigurationTarget) {
    logger.logOperationStart("resetPrompt", {
      data: { key, target },
    });

    try {
      if (target === vscode.ConfigurationTarget.Global) {
        // 从 globalState 重置提示词内容
        const globalPrompts = this.getGlobalPrompts();
        delete globalPrompts[key];
        await this.setGlobalPrompts(globalPrompts);
      } else if (target === vscode.ConfigurationTarget.Workspace) {
        // 工作区级别使用 workspace configuration
        const config = vscode.workspace.getConfiguration(
          "dish-ai-commit.prompts"
        );
        await config.update(key, undefined, target);
      } else {
        // WorkspaceFolder 级别
        const config = vscode.workspace.getConfiguration(
          "dish-ai-commit.prompts"
        );
        await config.update(key, undefined, target);
      }

      logger.logOperationEnd("resetPrompt", undefined, {
        data: { key, target },
      });
    } catch (error) {
      logger.logError(error as Error, `重置 prompt 失败: ${key}`, {
        operation: "resetPrompt",
        data: { key, target },
      });
      throw error;
    }
  }

  public async resetAllPrompts(target: vscode.ConfigurationTarget) {
    logger.logOperationStart("resetAllPrompts", {
      data: { target },
    });

    try {
      if (target === vscode.ConfigurationTarget.Global) {
        // 从 globalState 重置所有全局提示词
        await this.setGlobalPrompts({});
      } else if (target === vscode.ConfigurationTarget.Workspace) {
        // 工作区级别使用 workspace configuration
        const config = vscode.workspace.getConfiguration("dish-ai-commit");
        const promptsConfig = vscode.workspace.getConfiguration(
          "dish-ai-commit.prompts"
        );

        const allKeys = promptsConfig.keys();

        logger.debug("重置所有 prompts", {
          data: { keyCount: allKeys.length },
        });

        for (const key of allKeys) {
          await promptsConfig.update(key, undefined, target);
        }

        // 重置整个 "prompts" 部分
        await config.update("prompts", undefined, target);
      } else {
        // WorkspaceFolder 级别
        const config = vscode.workspace.getConfiguration("dish-ai-commit");
        const promptsConfig = vscode.workspace.getConfiguration(
          "dish-ai-commit.prompts"
        );

        const allKeys = promptsConfig.keys();

        for (const key of allKeys) {
          await promptsConfig.update(key, undefined, target);
        }

        await config.update("prompts", undefined, target);
      }

      logger.logOperationEnd("resetAllPrompts", undefined, {
        data: { target },
      });
    } catch (error) {
      logger.logError(error as Error, "重置所有 prompts 失败", {
        operation: "resetAllPrompts",
        data: { target },
      });
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

    // 2. 从 globalState 读取全局自定义提示词
    const globalPrompts = this.getGlobalPrompts();

    // 3. 从 workspace configuration 读取工作区级提示词（向后兼容）
    const promptsConfig = vscode.workspace.getConfiguration(
      "dish-ai-commit.prompts",
      scope
    );
    const inspection = promptsConfig.inspect<any>("");
    const workspaceConfig = inspection?.workspaceValue || {};

    // 4. 合并所有自定义提示词
    const allCustomKeys = [
      ...Object.keys(globalPrompts),
      ...Object.keys(workspaceConfig),
    ];

    for (const key of allCustomKeys) {
      if (!allPrompts[key]) {
        // 只添加新的、非默认的 prompts
        allPrompts[key] = this.getPromptDetail(key, scope);
      }
    }

    // 5. Check for .dish/prompts overrides
    const workspaceFolder = scope
      ? vscode.workspace.getWorkspaceFolder(scope as vscode.Uri)
      : vscode.workspace.workspaceFolders?.[0];

    if (workspaceFolder) {
      const dishPromptsDir = path.join(
        workspaceFolder.uri.fsPath,
        ".dish",
        "prompts"
      );
      try {
        if (fs.existsSync(dishPromptsDir)) {
          const files = await fs.promises.readdir(dishPromptsDir);
          const metadata = this.getPromptMetadata();

          for (const file of files) {
            if (file.endsWith(".md")) {
              const key = path.parse(file).name;
              const content = await fs.promises.readFile(
                path.join(dishPromptsDir, file),
                "utf-8"
              );

              // 获取分类信息（优先从元数据获取）
              const category = metadata[key]?.category;

              // Override or add
              allPrompts[key] = {
                content,
                source: "project",
                isCustomized: true,
                isNew: !this.defaultPrompts.has(key as PromptKey),
                category,
              };
            }
          }
        }
      } catch (error) {
        logger.warn("读取 .dish/prompts 目录失败", {
          error: error instanceof Error ? error : new Error(String(error)),
          data: { dishPromptsDir },
        });
        // Ignore error if .dish/prompts doesn't exist or can't be read
      }
    }

    logger.debug("获取所有 prompts 完成", {
      data: { totalCount: Object.keys(allPrompts).length },
    });

    return allPrompts;
  }
}
