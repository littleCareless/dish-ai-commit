import * as vscode from "vscode";
import { BaseCommand } from "./BaseCommand";
import { ConfigurationManager } from "../config/ConfigurationManager";
import { NotificationHandler } from "../utils/NotificationHandler";
import { ProgressHandler } from "../utils/ProgressHandler";
import { AIProviderFactory } from "../ai/AIProviderFactory";
import { SCMFactory } from "../scm/SCMProvider";
import { getProviderModelConfig } from "../config/types";
import { DISPLAY_NAME } from "../constants";
import { getMaxCharacters } from "../ai/types";
import { LocalizationManager } from "../utils/LocalizationManager";

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
    await config.updateConfig("OPENAI_BASE_URL", baseURL);
    await config.updateConfig("OPENAI_API_KEY", apiKey);
    return true;
  }

  private async ensureConfiguration(): Promise<boolean> {
    const locManager = LocalizationManager.getInstance();
    const config = ConfigurationManager.getInstance();
    const baseURL = config.getConfig<string>("OPENAI_BASE_URL", false);
    const apiKey = config.getConfig<string>("OPENAI_API_KEY", false);

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
    const configuration = config.getConfiguration();
    // 使用新的封装方法更新配置
    await config.updateAIConfiguration(
      modelSelection.provider,
      modelSelection.model
    );

    // 返回更新后的 provider 和 model
    return { provider: modelSelection.provider, model: modelSelection.model };
  }

  async execute(resources: vscode.SourceControlResourceState[]): Promise<void> {
    const locManager = LocalizationManager.getInstance();
    if (!(await this.ensureConfiguration()) || !(await this.validateConfig())) {
      return;
    }

    try {
      // 检测当前 SCM 类型
      const scmProvider = await SCMFactory.detectSCM();
      if (!scmProvider) {
        await NotificationHandler.error(
          locManager.getMessage("scm.not.detected")
        );
        return;
      }

      const config = ConfigurationManager.getInstance();
      const configuration = config.getConfiguration();

      // 检查是否已配置 AI 提供商和模型
      let provider = configuration.provider;
      let model = configuration.model;

      // 如果没有配置提供商或模型，提示用户选择
      if (!provider || !model) {
        // const modelSelection = await this.showModelPicker(
        //   provider || "Ollama",
        //   model || "Ollama"
        // );

        // if (!modelSelection) {
        //   return;
        // }

        // // 使用新的封装方法更新配置
        // await config.updateAIConfiguration(
        //   modelSelection.provider,
        //   modelSelection.model
        // );

        // provider = modelSelection.provider;
        // model = modelSelection.model;

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
          // progress.report({
          //   message: locManager.getMessage("progress.analyzing.changes"),
          // });
          const diffContent = await scmProvider.getDiff(selectedFiles);
          if (!diffContent) {
            await NotificationHandler.info(locManager.getMessage("no.changes"));
            throw new Error(locManager.getMessage("no.changes"));
          }

          console.log("diffContent", diffContent, selectedFiles);

          const {
            provider: newProvider,
            model: newModel,
            aiProvider,
            selectedModel,
          } = await this.getModelAndUpdateConfiguration(provider, model);

          // if (selectedModel) {
          //   const maxChars = getMaxCharacters(selectedModel, 2600) - 1000;
          //   if (diffContent.length > maxChars) {
          //     throw new Error(
          //       locManager.format("diff.too.long", diffContent.length, maxChars)
          //     );
          //   }
          // }

          // progress.report({ message: "正在生成提交信息..." });

          const result = await aiProvider.generateResponse({
            diff: diffContent,
            systemPrompt: configuration.systemPrompt,
            model: selectedModel,
            language: configuration.language,
            scm: scmProvider.type ?? "git",
            allowMergeCommits: configuration.allowMergeCommits,
            splitChangesInSingleFile: false,
          });

          // progress.report({
          //   message: locManager.getMessage("progress.generation.complete"),
          // });
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
          // 统一使用 setCommitInput 写入提交信息
          await scmProvider.setCommitInput(response.content);
          await NotificationHandler.info(
            locManager.format(
              "commit.message.generated",
              scmProvider.type.toUpperCase()
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

  private async showModelPicker(
    currentProvider: string,
    currentModel: string
  ): Promise<{ provider: string; model: string } | undefined> {
    const locManager = LocalizationManager.getInstance();
    try {
      const providers = AIProviderFactory.getAllProviders();
      const modelsMap = new Map<string, string[]>();

      await Promise.all(
        providers.map(async (provider) => {
          if (await provider.isAvailable()) {
            const models = await provider.getModels();
            modelsMap.set(
              provider.getName(),
              models.map((model) => model.name)
            );
          }
        })
      );

      const items: vscode.QuickPickItem[] = [];
      for (const [provider, models] of modelsMap) {
        items.push({
          label: provider,
          kind: vscode.QuickPickItemKind.Separator,
        });
        models.forEach((model) => {
          items.push({
            label: model,
            description: provider,
            picked: provider === currentProvider && model === currentModel,
          });
        });
      }

      const quickPick = vscode.window.createQuickPick();
      quickPick.items = items;
      quickPick.title = locManager.getMessage("ai.model.picker.title");
      quickPick.placeholder = locManager.getMessage(
        "ai.model.picker.placeholder"
      );
      quickPick.ignoreFocusOut = true;

      const result = await new Promise<vscode.QuickPickItem | undefined>(
        (resolve) => {
          quickPick.onDidAccept(() => resolve(quickPick.selectedItems[0]));
          quickPick.onDidHide(() => resolve(undefined));
          quickPick.show();
        }
      );

      quickPick.dispose();

      if (result && result.description) {
        return { provider: result.description, model: result.label };
      }
      return undefined;
    } catch (error) {
      console.error("获取模型列表失败:", error);
      await NotificationHandler.error("获取模型列表失败");
      return undefined;
    }
  }
}
