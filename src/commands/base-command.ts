import * as vscode from "vscode";
import { ConfigurationManager } from "../config/configuration-manager";
import { AIProviderFactory } from "../ai/ai-provider-factory";
import { SCMFactory } from "../scm/scm-provider";
import { ModelPickerService } from "../services/model-picker-service";
import { notify } from "../utils/notification/notification-manager";
import { getMessage, formatMessage } from "../utils/i18n";
import { validateAndGetModel } from "../utils/ai/model-validation";
import { AIProvider, AIModel, AIProviders, ModelNames } from "../ai/types"; // 正确导入ModelNames类型

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
    selectedModel: AIModel<AIProviders, ModelNames> | undefined; // 使用ModelNames类型替代string
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

    console.log(
      "Selected files:",
      states.map((state) => state?.resourceUri?.fsPath)
    );
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
   * 执行命令
   * @param args - 命令参数
   */
  abstract execute(...args: any[]): Promise<void>;
}
