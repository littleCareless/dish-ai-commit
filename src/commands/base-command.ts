import * as vscode from "vscode";
import { ConfigurationManager } from "../config/configuration-manager";
import { AIProviderFactory } from "../ai/ai-provider-factory";
import { ISCMProvider } from "../scm/scm-provider";
import { ModelPickerService } from "../services/model-picker-service";
import { SCMDetectorService } from "../services/scm-detector-service";
import { notify } from "../utils/notification/notification-manager";
import { getMessage, formatMessage } from "../utils/i18n";
import { validateAndGetModel } from "../utils/ai/model-validation";
import { AIProvider, AIModel, AIProviders } from "../ai/types";
import { stateManager } from "../utils/state/state-manager";
import { Logger } from "../utils/logger";

/**
 * 基础命令类,提供通用的命令执行功能
 */
export abstract class BaseCommand {
  /** VSCode扩展上下文 */
  protected context: vscode.ExtensionContext;
  protected logger: Logger;

  /**
   * 创建命令实例
   * @param context - VSCode扩展上下下文
   */
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.logger = Logger.getInstance("Dish AI Commit Gen");
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
    this.logger.error(
      `${errorMessage}: ${error instanceof Error ? error.message : String(error)}`
    );
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
   * 检测并获取SCM提供程序。
   * 此方法将所有复杂的检测逻辑委托给 SCMDetectorService。
   * @param {vscode.SourceControlResourceState | vscode.SourceControlResourceState[] | string[] | undefined} resourcesOrFiles - 可选的资源状态、文件路径列表或字符串数组
   * @returns SCM提供程序实例和相关信息
   */
  protected async detectSCMProvider(
    resourcesOrFiles?:
      | vscode.SourceControlResourceState
      | vscode.SourceControlResourceState[]
      | string[]
  ) {
    return SCMDetectorService.detectSCMProvider(resourcesOrFiles);
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

    const result = await notify.info(
      "confirm.ai.provider.tos.message",
      undefined,
      { 
        modal: true, 
        buttons: [
          acceptAlways.title,
          acceptWorkspace.title,
          cancel.title
        ]
      }
    );

    if (result === acceptWorkspace.title) {
      void stateManager.setWorkspace(`confirm:dish:ai:tos`, true).catch();
      return true;
    }

    if (result === acceptAlways.title) {
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
