import * as vscode from "vscode";
import { BaseCommand } from "./BaseCommand";
import { ConfigurationManager } from "../config/ConfigurationManager";
import { NotificationHandler } from "../utils/NotificationHandler";
import { ProgressHandler } from "../utils/ProgressHandler";
import { AIProviderFactory } from "../ai/AIProviderFactory";
import { SCMFactory } from "../scm/SCMProvider";
import { type ConfigKey } from "../config/types";
import { LocalizationManager } from "../utils/LocalizationManager";
import { ModelPickerService } from "../services/ModelPickerService";

export class GenerateCommitCommand extends BaseCommand {
  private async showConfigWizard(): Promise<boolean> {
    const locManager = LocalizationManager.getInstance();
    const baseURL = await vscode.window.showInputBox({
      prompt: locManager.getMessage("openai.baseurl.prompt"),
      placeHolder: locManager.getMessage("openai.baseurl.placeholder"),
      ignoreFocusOut: true,
    });

    if (!baseURL) {
      return false;
    }

    const apiKey = await vscode.window.showInputBox({
      prompt: locManager.getMessage("openai.apikey.prompt"),
      password: true,
      ignoreFocusOut: true,
    });

    if (!apiKey) {
      return false;
    }

    const config = ConfigurationManager.getInstance();
    await config.updateConfig("PROVIDERS_OPENAI_BASEURL", baseURL);
    await config.updateConfig("PROVIDERS_OPENAI_APIKEY", apiKey);
    return true;
  }

  private async ensureConfiguration(): Promise<boolean> {
    const locManager = LocalizationManager.getInstance();
    const config = ConfigurationManager.getInstance();
    const configuration = config.getConfiguration();
    const baseURL = configuration.providers.openai.baseUrl;
    const apiKey = configuration.providers.openai.apiKey;

    if (!baseURL || !apiKey) {
      const result = await vscode.window.showInformationMessage(
        locManager.getMessage("openai.config.required"),
        locManager.getMessage("button.yes"),
        locManager.getMessage("button.no")
      );
      return result === locManager.getMessage("button.yes")
        ? this.showConfigWizard()
        : false;
    }
    return true;
  }
  // 提取一个函数来处理获取和更新模型配置的逻辑
  private async getModelAndUpdateConfiguration(
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

  // 封装选择模型并更新配置的函数，返回更新后的 provider 和 model
  private async selectAndUpdateModelConfiguration(
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

  private async handleConfiguration(): Promise<
    { provider: string; model: string } | undefined
  > {
    if (!(await this.ensureConfiguration()) || !(await this.validateConfig())) {
      return;
    }

    const config = ConfigurationManager.getInstance();
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

  async execute(resources: vscode.SourceControlResourceState[]): Promise<void> {
    const configResult = await this.handleConfiguration();
    if (!configResult) {
      return;
    }

    const locManager = LocalizationManager.getInstance();
    try {
      const scmProvider = await SCMFactory.detectSCM();
      if (!scmProvider) {
        await NotificationHandler.error(
          locManager.getMessage("scm.not.detected")
        );
        return;
      }

      // 获取当前提交消息输入框的内容
      const currentInput = await scmProvider.getCommitInput();

      const config = ConfigurationManager.getInstance();
      const configuration = config.getConfiguration();

      // 检查是否已配置 AI 提供商和模型
      let provider = configuration.base.provider;
      let model = configuration.base.model;

      // 如果没有配置提供商或模型，提示用户选择
      if (!provider || !model) {
        const { provider: newProvider, model: newModel } =
          await this.selectAndUpdateModelConfiguration(provider, model);

        provider = newProvider;
        model = newModel;
      }

      const response = await ProgressHandler.withProgress(
        locManager.format(
          "progress.generating.commit",
          scmProvider?.type.toLocaleUpperCase()
        ),
        async (progress) => {
          const selectedFiles = this.getSelectedFiles(resources);

          const diffContent = await scmProvider.getDiff(selectedFiles);
          if (!diffContent) {
            await NotificationHandler.info(locManager.getMessage("no.changes"));
            throw new Error(locManager.getMessage("no.changes"));
          }
          const {
            provider: newProvider,
            model: newModel,
            aiProvider,
            selectedModel,
          } = await this.getModelAndUpdateConfiguration(provider, model);

          const result = await aiProvider.generateResponse({
            ...configuration.base, // 包含 systemPrompt, language 等基础配置
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
      if (!response) {
        return await NotificationHandler.info(
          locManager.getMessage("no.commit.message.generated")
        );
      }
      if (response?.content) {
        try {
          await scmProvider.setCommitInput(response.content);
          await NotificationHandler.info(
            locManager.format(
              "commit.message.generated",
              scmProvider.type.toUpperCase(),
              provider,
              model
            )
          );
        } catch (error) {
          if (error instanceof Error) {
            await NotificationHandler.error(
              locManager.format("commit.message.write.failed", error.message)
            );
            try {
              // 如果写入失败，尝试复制到剪贴板
              vscode.env.clipboard.writeText(response.content);
              await NotificationHandler.info(
                locManager.getMessage("commit.message.copied")
              );
            } catch (error) {
              if (error instanceof Error) {
                await NotificationHandler.error(
                  locManager.format("commit.message.copy.failed", error.message)
                );
                // 如果复制失败，提示用户手动复制 并将信息显示在消息框
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
      console.log("error", error);
      if (error instanceof Error) {
        await NotificationHandler.error(
          locManager.format("generate.commit.failed", error.message)
        );
      }
    }
  }

  private getSelectedFiles(
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

  private async showModelPicker(currentProvider: string, currentModel: string) {
    return ModelPickerService.showModelPicker(currentProvider, currentModel);
  }
}
