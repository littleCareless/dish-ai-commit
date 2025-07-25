import * as vscode from "vscode";
import { ConfigurationManager } from "../config/configuration-manager";
import { AIProviderFactory } from "../ai/ai-provider-factory";
import { SCMFactory } from "../scm/scm-provider";
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
   * 获取选中的文件列表
   * @param resourceStates - 源代码管理资源状态
   * @returns 文件路径列表
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
      console.warn("No files selected.");
    }

    return [
      ...new Set(
        states
          .map(
            (state) =>
              (state as any)?._resourceUri?.fsPath || state?.resourceUri?.fsPath
          )
          .filter(Boolean)
      ),
    ];
  }

  /**
   * 检测并获取SCM提供程序
   * @param {string[] | undefined} selectedFiles - 可选的选定文件路径列表
   * @returns SCM提供程序实例
   */
  protected async detectSCMProvider(selectedFiles?: string[]) {
    const scmProvider = await SCMFactory.detectSCM(selectedFiles);
    if (!scmProvider) {
      await notify.error(getMessage("scm.not.detected"));
      return;
    }
    return scmProvider;
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
