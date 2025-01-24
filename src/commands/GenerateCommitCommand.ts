import * as vscode from "vscode";
import { BaseCommand } from "./BaseCommand";
import { ConfigurationManager } from "../config/ConfigurationManager";
import { AIProviderFactory } from "../ai/AIProviderFactory";
import { SCMFactory } from "../scm/SCMProvider";
import { type ConfigKey } from "../config/types";
import { ModelPickerService } from "../services/ModelPickerService";
import { NotificationHandler } from "../utils/NotificationHandler";
import { LocalizationManager } from "../utils/LocalizationManager";
import { ProgressHandler } from "../utils/ProgressHandler";

/**
 * 提交信息生成命令类
 */
export class GenerateCommitCommand extends BaseCommand {
  /**
   * 获取模型并更新配置
   * @param provider - 当前AI提供商
   * @param model - 当前模型名称
   * @returns 更新后的提供商、模型和AI实例信息
   * @throws Error 当无法获取模型列表或找不到指定模型时
   */
  protected async getModelAndUpdateConfiguration(
    provider = "Ollama",
    model = "Ollama"
  ) {
    const locManager = LocalizationManager.getInstance();
    let aiProvider = AIProviderFactory.getProvider(provider);
    // 获取模型列表
    let models = await aiProvider.getModels();

    // 如果模型为空或无法获取，直接让用户选择模型
    if (!models || models.length === 0) {
      const { provider: newProvider, model: newModel } =
        await this.selectAndUpdateModelConfiguration(provider, model);
      provider = newProvider;
      model = newModel;

      // 获取更新后的模型列表
      aiProvider = AIProviderFactory.getProvider(provider);
      models = await aiProvider.getModels();

      // 如果新的模型列表仍然为空，则抛出错误
      if (!models || models.length === 0) {
        throw new Error(locManager.getMessage("model.list.empty"));
      }
    }

    // 查找已选择的模型
    let selectedModel = models.find((m) => m.name === model);

    // 如果没有找到对应的模型，弹窗让用户重新选择
    if (!selectedModel) {
      const { provider: newProvider, model: newModel } =
        await this.selectAndUpdateModelConfiguration(provider, model);
      provider = newProvider;
      model = newModel;

      // 获取更新后的模型列表
      aiProvider = AIProviderFactory.getProvider(provider);
      models = await aiProvider.getModels();

      // 选择有效的模型
      selectedModel = models.find((m) => m.name === model);

      // 如果依然没有找到对应的模型，抛出错误
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
    // 获取模型选择
    const modelSelection = await this.showModelPicker(provider, model);

    // 如果没有选择模型，则直接返回当前的 provider 和 model
    if (!modelSelection) {
      return { provider, model };
    }

    const config = ConfigurationManager.getInstance();
    // 使用新的封装方法更新配置
    await config.updateAIConfiguration(
      modelSelection.provider,
      modelSelection.model
    );

    // 返回更新后的 provider 和 model
    return { provider: modelSelection.provider, model: modelSelection.model };
  }

  /**
   * 处理AI配置
   * @returns AI提供商和模型信息
   */
  protected async handleConfiguration(): Promise<
    { provider: string; model: string } | undefined
  > {
    const config = ConfigurationManager.getInstance();

    // 使用 ConfigurationManager 的验证方法
    if (!(await config.validateConfiguration())) {
      return;
    }

    const configuration = config.getConfiguration();
    let provider = configuration.base.provider;
    let model = configuration.base.model;

    if (!provider || !model) {
      const result = await this.selectAndUpdateModelConfiguration(
        provider,
        model
      );
      if (!result) {
        return;
      }
      return result;
    }

    return { provider, model };
  }

  /**
   * 执行提交信息生成命令
   * @param resources - 源代码管理资源状态列表
   */
  async execute(resources: vscode.SourceControlResourceState[]): Promise<void> {
    // 处理配置
    const configResult = await this.handleConfiguration();
    if (!configResult) {
      return;
    }

    const locManager = LocalizationManager.getInstance();
    try {
      // 检测SCM提供程序
      const scmProvider = await SCMFactory.detectSCM();
      if (!scmProvider) {
        NotificationHandler.error(locManager.getMessage("scm.not.detected"));
        return;
      }

      // 获取当前提交输入框内容
      const currentInput = await scmProvider.getCommitInput();

      // 获取配置信息
      const config = ConfigurationManager.getInstance();
      const configuration = config.getConfiguration();

      // 获取或更新AI提供商和模型配置
      let provider = configuration.base.provider;
      let model = configuration.base.model;

      if (!provider || !model) {
        const { provider: newProvider, model: newModel } =
          await this.selectAndUpdateModelConfiguration(provider, model);
        provider = newProvider;
        model = newModel;
      }

      // 使用进度提示生成提交信息
      const response = await ProgressHandler.withProgress(
        locManager.format(
          "progress.generating.commit",
          scmProvider?.type.toLocaleUpperCase()
        ),
        async (progress) => {
          // 获取选中文件的差异信息
          const selectedFiles = this.getSelectedFiles(resources);
          const diffContent = await scmProvider.getDiff(selectedFiles);

          // 检查是否有变更
          if (!diffContent) {
            NotificationHandler.info(locManager.getMessage("no.changes"));
            throw new Error(locManager.getMessage("no.changes"));
          }

          // 获取和更新AI模型配置
          const {
            provider: newProvider,
            model: newModel,
            aiProvider,
            selectedModel,
          } = await this.getModelAndUpdateConfiguration(provider, model);

          // 生成提交信息
          const result = await aiProvider.generateResponse({
            ...configuration.base,
            ...configuration.features.commitFormat,
            ...configuration.features.codeAnalysis,
            additionalContext: currentInput,
            diff: diffContent,
            model: selectedModel,
            scm: scmProvider.type ?? "git",
          });

          return result;
        }
      );

      // 处理生成结果
      if (!response) {
        return NotificationHandler.info(
          locManager.getMessage("no.commit.message.generated")
        );
      }

      // 尝试设置提交信息
      if (response?.content) {
        try {
          await scmProvider.setCommitInput(response.content);
          NotificationHandler.info(
            locManager.format(
              "commit.message.generated",
              scmProvider.type.toUpperCase(),
              provider,
              model
            )
          );
        } catch (error) {
          // 处理写入失败的情况
          if (error instanceof Error) {
            NotificationHandler.error(
              locManager.format("commit.message.write.failed", error.message)
            );

            // 尝试复制到剪贴板
            try {
              await vscode.env.clipboard.writeText(response.content);
              NotificationHandler.info(
                locManager.getMessage("commit.message.copied")
              );
            } catch (error) {
              // 处理复制失败的情况
              if (error instanceof Error) {
                NotificationHandler.error(
                  locManager.format("commit.message.copy.failed", error.message)
                );
                // 提示手动复制
                vscode.window.showInformationMessage(
                  locManager.getMessage("commit.message.manual.copy"),
                  response.content
                );
              }
            }
          }
        }
      }
    } catch (error) {
      // 处理整体执行错误
      console.log("error", error);
      if (error instanceof Error) {
        NotificationHandler.error(
          locManager.format("generate.commit.failed", error.message)
        );
      }
    }
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
}
