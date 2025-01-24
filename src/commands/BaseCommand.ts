import * as vscode from "vscode";
import { ConfigurationManager } from "../config/ConfigurationManager";
import { AIProviderFactory } from "../ai/AIProviderFactory";
import { SCMFactory } from "../scm/SCMProvider";
import { ModelPickerService } from "../services/ModelPickerService";
import { NotificationHandler } from "../utils/NotificationHandler";
import { LocalizationManager } from "../utils/LocalizationManager";

/**
 * 基础命令类,提供通用的命令执行功能
 */
export abstract class BaseCommand {
  /** VSCode扩展上下文 */
  protected context: vscode.ExtensionContext;

  /**
   * 创建命令实例
   * @param context - VSCode扩展上下文
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
      NotificationHandler.error(
        LocalizationManager.getInstance().getMessage("command.execution.failed")
      );
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
      NotificationHandler.error(
        LocalizationManager.getInstance().format(errorMessage, error.message)
      );
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
      return this.selectAndUpdateModelConfiguration(provider, model);
    }

    return { provider, model };
  }

  /**
   * 获取模型并更新配置
   * @param provider - AI提供商名称
   * @param model - 模型名称
   * @returns 更新后的提供商、模型和AI实例信息
   * @throws Error 当无法获取模型列表或找不到指定模型时
   */
  protected async getModelAndUpdateConfiguration(
    provider = "Ollama",
    model = "Ollama"
  ) {
    const locManager = LocalizationManager.getInstance();
    let aiProvider = AIProviderFactory.getProvider(provider);
    let models = await aiProvider.getModels();

    if (!models || models.length === 0) {
      const { provider: newProvider, model: newModel } =
        await this.selectAndUpdateModelConfiguration(provider, model);
      provider = newProvider;
      model = newModel;

      aiProvider = AIProviderFactory.getProvider(provider);
      models = await aiProvider.getModels();

      if (!models || models.length === 0) {
        throw new Error(locManager.getMessage("model.list.empty"));
      }
    }

    let selectedModel = models.find((m) => m.name === model);

    if (!selectedModel) {
      const { provider: newProvider, model: newModel } =
        await this.selectAndUpdateModelConfiguration(provider, model);
      provider = newProvider;
      model = newModel;

      aiProvider = AIProviderFactory.getProvider(provider);
      models = await aiProvider.getModels();
      selectedModel = models.find((m) => m.name === model);

      if (!selectedModel) {
        throw new Error(locManager.getMessage("model.notFound"));
      }
    }

    return { provider, model, selectedModel, aiProvider };
  }

  /**
   * 选择模型并更新配置
   * @param provider - 当前AI提供商
   * @param model - 当前模型名称
   * @returns 更新后的提供商和模型信息
   */
  protected async selectAndUpdateModelConfiguration(
    provider = "Ollama",
    model = "Ollama"
  ) {
    const modelSelection = await this.showModelPicker(provider, model);
    if (!modelSelection) {
      return { provider, model };
    }

    const config = ConfigurationManager.getInstance();
    await config.updateAIConfiguration(
      modelSelection.provider,
      modelSelection.model
    );
    return { provider: modelSelection.provider, model: modelSelection.model };
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

  /** 获取本地化管理器实例 */
  protected get locManager(): LocalizationManager {
    return LocalizationManager.getInstance();
  }

  /**
   * 检测并获取SCM提供程序
   * @returns SCM提供程序实例
   */
  protected async detectSCMProvider() {
    const scmProvider = await SCMFactory.detectSCM();
    if (!scmProvider) {
      NotificationHandler.error(this.locManager.getMessage("scm.not.detected"));
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
