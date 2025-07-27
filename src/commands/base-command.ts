import * as vscode from "vscode";
import { ConfigurationManager } from "../config/configuration-manager";
import { AIProviderFactory } from "../ai/ai-provider-factory";
import { SCMFactory, ISCMProvider } from "../scm/scm-provider";
import { ModelPickerService } from "../services/model-picker-service";
import { notify } from "../utils/notification/notification-manager";
import { getMessage, formatMessage } from "../utils/i18n";
import { validateAndGetModel } from "../utils/ai/model-validation";
import { AIProvider, AIModel, AIProviders } from "../ai/types";
import { stateManager } from "../utils/state/state-manager";

/**
 * 基础命令类,提供通用的命令执行功能
 */
export abstract class BaseCommand {
  /** VSCode扩展上下文 */
  protected context: vscode.ExtensionContext;

  /**
   * 创建命令实例
   * @param context - VSCode扩展上下下文
   */
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * 验证配置是否有效
   * @returns 配置是否有效
   */
  protected async validateConfig(): Promise<boolean> {
    if (!(await ConfigurationManager.getInstance().validateConfiguration())) {
      await notify.error(getMessage("command.execution.failed"));
      return false;
    }
    return true;
  }

  /**
   * 处理执行过程中的错误
   * @param error - 错误对象
   * @param errorMessage - 错误消息模板
   */
  protected async handleError(
    error: unknown,
    errorMessage: string
  ): Promise<void> {
    console.error(errorMessage, error);
    if (error instanceof Error) {
      await notify.error(errorMessage, [error.message]);
    }
  }

  /**
   * 处理AI配置
   * @returns AI提供商和模型信息,如果配置无效则返回undefined
   */
  protected async handleConfiguration(): Promise<
    { provider: string; model: string } | undefined
  > {
    const config = ConfigurationManager.getInstance();
    if (!(await config.validateConfiguration())) {
      return;
    }

    const configuration = config.getConfiguration();
    let provider = configuration.base.provider;
    let model = configuration.base.model;

    if (!provider || !model) {
      return this.selectAndUpdateModelConfiguration(provider, model, true);
    }

    return { provider, model };
  }

  /**
   * 选择模型并更新配置
   * @param provider - 当前AI提供商
   * @param model - 当前模型名称
   * @param throwError - 是否抛出错误,默认为false
   * @returns 更新后的提供商和模型信息
   */
  protected async selectAndUpdateModelConfiguration(
    provider = "Ollama",
    model = "Ollama",
    throwError = false
  ): Promise<{
    provider: string;
    model: string;
    selectedModel: AIModel | undefined;
    aiProvider: AIProvider;
  }> {
    try {
      const result = await validateAndGetModel(provider, model);
      return {
        provider: result.provider,
        model: result.model,
        selectedModel: result.selectedModel,
        aiProvider: result.aiProvider,
      };
    } catch (error: any) {
      if (throwError) {
        await notify.error(error.message);
        throw error;
      }
      // 如果不抛出错误,返回原始值
      const aiProvider = AIProviderFactory.getProvider(provider);
      return {
        provider,
        model,
        selectedModel: undefined,
        aiProvider,
      };
    }
  }

  /**
   * 显示模型选择器
   * @param currentProvider - 当前AI提供商
   * @param currentModel - 当前模型名称
   * @returns 用户选择的提供商和模型信息
   */
  protected async showModelPicker(
    currentProvider: string,
    currentModel: string
  ) {
    return ModelPickerService.showModelPicker(currentProvider, currentModel);
  }

  /**
   * 获取用户选中的文件列表
   * @param resourceStates - 源代码管理资源状态
   * @returns 文件路径列表，如果没有选择文件则返回undefined
   */
  protected getSelectedFiles(
    resourceStates?:
      | vscode.SourceControlResourceState
      | vscode.SourceControlResourceState[]
  ): string[] | undefined {
    if (!resourceStates) {
      return undefined;
    }

    const states = Array.isArray(resourceStates)
      ? resourceStates
      : [resourceStates];

    console.log("Number of selected files:", states?.length);

    if (states.length === 0) {
      return undefined;
    }

    const files = [
      ...new Set(
        states
          .map(
            (state) =>
              (state as any)?._resourceUri?.fsPath || state?.resourceUri?.fsPath
          )
          .filter(Boolean)
      ),
    ];

    return files.length > 0 ? files : undefined;
  }

  /**
   * 从resources或文件路径中检测对应的Git仓库路径
   * @param resourceStates - 源代码管理资源状态
   * @param files - 可选的文件路径列表，如果不提供则从resourceStates中提取
   * @returns Git仓库路径，如果未找到则返回undefined
   */
  protected getRepositoryFromResources(
    resourceStates?:
      | vscode.SourceControlResourceState
      | vscode.SourceControlResourceState[],
    files?: string[]
  ): string | undefined {
    // 获取Git扩展API
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (!gitExtension?.isActive) {
      return undefined;
    }

    try {
      const gitApi = gitExtension.exports.getAPI(1);
      const repositories = gitApi.repositories;

      // 如果没有提供files，从resourceStates中提取
      if (!files && resourceStates) {
        files = this.getSelectedFiles(resourceStates);
      }

      // 如果有文件路径，从文件路径中查找仓库
      if (files && files.length > 0) {
        for (const file of files) {
          for (const repository of repositories) {
            const repoPath = (repository as any).rootUri?.fsPath;
            if (repoPath && file.startsWith(repoPath)) {
              console.log(`Found repository for file ${file}: ${repoPath}`);
              return repoPath;
            }
          }
        }
      }

      // 如果没有文件或从文件中找不到仓库，尝试从resourceStates中直接获取仓库信息
      if (resourceStates) {
        const states = Array.isArray(resourceStates)
          ? resourceStates
          : [resourceStates];

        for (const state of states) {
          // 尝试从resourceState中获取仓库信息
          const repository = state as any;
          if (repository?.rootUri?.fsPath) {
            console.log(
              `Found repository from resourceState: ${repository.rootUri.fsPath}`
            );
            return repository.rootUri.fsPath;
          }
        }
      }

      // 如果都没找到，返回第一个可用的仓库（作为fallback）
      if (repositories.length > 0) {
        const fallbackRepo = (repositories[0] as any).rootUri?.fsPath;
        if (fallbackRepo) {
          console.log(`Using fallback repository: ${fallbackRepo}`);
          return fallbackRepo;
        }
      }
    } catch (error) {
      console.warn("Failed to get repository from resources:", error);
    }

    return undefined;
  }

  /**
   * 检测并获取SCM提供程序
   * @param {vscode.SourceControlResourceState | vscode.SourceControlResourceState[] | string[] | undefined} resourcesOrFiles - 可选的资源状态、文件路径列表或字符串数组
   * @returns SCM提供程序实例和相关信息
   */
  protected async detectSCMProvider(
    resourcesOrFiles?:
      | vscode.SourceControlResourceState
      | vscode.SourceControlResourceState[]
      | string[]
  ): Promise<
    | {
        scmProvider: ISCMProvider;
        selectedFiles: string[] | undefined;
        repositoryPath: string | undefined;
      }
    | undefined
  > {
    let selectedFiles: string[] | undefined;
    let repositoryPath: string | undefined;

    // 判断参数类型并处理
    if (resourcesOrFiles) {
      // 如果是字符串数组，直接作为文件路径使用（保持向后兼容）
      if (
        Array.isArray(resourcesOrFiles) &&
        typeof resourcesOrFiles[0] === "string"
      ) {
        selectedFiles = resourcesOrFiles as string[];
      }
      // 如果是资源状态，提取文件和仓库信息
      else {
        const resources = resourcesOrFiles as
          | vscode.SourceControlResourceState
          | vscode.SourceControlResourceState[];
        selectedFiles = this.getSelectedFiles(resources);
        repositoryPath = this.getRepositoryFromResources(
          resources,
          selectedFiles
        );
      }
    }

    const scmProvider = await SCMFactory.detectSCM(
      selectedFiles,
      repositoryPath
    );
    if (!scmProvider) {
      await notify.error(getMessage("scm.not.detected"));
      return;
    }

    return {
      scmProvider,
      selectedFiles,
      repositoryPath,
    };
  }

  /**
   * 获取提交信息
   * @param scmProvider - SCM提供程序实例
   * @returns 提交信息
   */
  protected async getCommitInput(scmProvider: any) {
    return await scmProvider.getCommitInput();
  }

  /**
   * 获取扩展配置
   * @returns 配置管理器实例和当前配置
   */
  protected getExtConfig() {
    const config = ConfigurationManager.getInstance();
    return {
      config,
      configuration: config.getConfiguration(),
    };
  }

  /**
   * Shows a confirmation dialog to the user regarding AI provider terms of service.
   * @returns A promise that resolves to true if the user accepts, false otherwise.
   */
  protected async showConfirmAIProviderToS(): Promise<boolean> {
    const confirmed =
      stateManager.getGlobal<boolean>(`confirm:dish:ai:tos`, false) ||
      stateManager.getWorkspace<boolean>(`confirm:dish:ai:tos`, false);
    if (confirmed) {
      return true;
    }

    const acceptAlways: vscode.MessageItem = {
      title: getMessage("confirm.ai.provider.tos.accept"),
    };
    const acceptWorkspace: vscode.MessageItem = {
      title: getMessage("confirm.ai.provider.tos.acceptWorkspace"),
    };
    const cancel: vscode.MessageItem = {
      title: getMessage("confirm.ai.provider.tos.cancel"),
      isCloseAffordance: true,
    };

    const result = await vscode.window.showInformationMessage(
      getMessage("confirm.ai.provider.tos.message"),
      { modal: true },
      acceptAlways,
      acceptWorkspace,
      cancel
    );

    if (result === acceptWorkspace) {
      void stateManager.setWorkspace(`confirm:dish:ai:tos`, true).catch();
      return true;
    }

    if (result === acceptAlways) {
      void stateManager.setGlobal(`confirm:dish:ai:tos`, true).catch();
      return true;
    }

    return false;
  }
  /**
   * 执行命令
   * @param args - 命令参数
   */
  abstract execute(...args: any[]): Promise<void>;
}
