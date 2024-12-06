import * as vscode from "vscode";
import { BaseCommand } from "./BaseCommand";
import { ConfigurationManager } from "../config/ConfigurationManager";
import { NotificationHandler } from "../utils/NotificationHandler";
import { ProgressHandler } from "../utils/ProgressHandler";
import { AIProviderFactory } from "../ai/AIProviderFactory";
import { SCMFactory } from "../scm/SCMProvider";
import { getProviderModelConfig } from "../config/types";
import { DISPLAY_NAME } from "../constants";

export class GenerateCommitCommand extends BaseCommand {
  private async showConfigWizard(): Promise<boolean> {
    const baseURL = await vscode.window.showInputBox({
      prompt: "请输入 OpenAI API 地址",
      placeHolder: "例如: https://api.openai.com/v1",
      ignoreFocusOut: true,
    });

    if (!baseURL) {
      return false;
    }

    const apiKey = await vscode.window.showInputBox({
      prompt: "请输入 OpenAI API Key",
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
    const config = ConfigurationManager.getInstance();
    const baseURL = config.getConfig<string>("OPENAI_BASE_URL", false);
    const apiKey = config.getConfig<string>("OPENAI_API_KEY", false);

    if (!baseURL || !apiKey) {
      const result = await vscode.window.showInformationMessage(
        "需要配置 OpenAI API 信息才能使用该功能，是否现在配置？",
        "是",
        "否"
      );
      return result === "是" ? this.showConfigWizard() : false;
    }
    return true;
  }

  async execute(resources: vscode.SourceControlResourceState[]): Promise<void> {
    if (!(await this.ensureConfiguration()) || !(await this.validateConfig())) {
      return;
    }

    try {
      // 检测当前 SCM 类型
      const scmProvider = await SCMFactory.detectSCM();
      if (!scmProvider) {
        await NotificationHandler.error("未检测到支持的版本控制系统");
        return;
      }

      const config = ConfigurationManager.getInstance();
      const configuration = config.getConfiguration();

      // 检查是否已配置 AI 提供商和模型
      let provider = configuration.provider;
      let model = configuration.model;

      // 如果没有配置提供商或模型，提示用户选择
      if (!provider || !model) {
        const modelSelection = await this.showModelPicker(
          provider || "Ollama",
          model || "Ollama"
        );

        if (!modelSelection) {
          return;
        }

        // 使用新的封装方法更新配置
        await config.updateAIConfiguration(
          modelSelection.provider,
          modelSelection.model
        );

        provider = modelSelection.provider;
        model = modelSelection.model;
      }

      const response = await ProgressHandler.withProgress(
        `Generating ${scmProvider?.type.toLocaleUpperCase()} commit message...`,
        async (progress) => {
          const selectedFiles = this.getSelectedFiles(resources);
          // progress.report({ message: "正在分析变更内容..." });
          const diffContent = await scmProvider.getDiff(selectedFiles);
          if (!diffContent) {
            await NotificationHandler.info("没有可提交的更改");
            return;
          }

          // progress.report({ message: "正在生成提交信息..." });

          const aiProvider = AIProviderFactory.getProvider(provider);
          const result = await aiProvider.generateResponse({
            prompt: diffContent,
            systemPrompt: configuration.systemPrompt,
            model: model,
            language: configuration.language,
          });

          // progress.report({ message: "生成完成" });
          return result;
        }
      );

      if (response?.content) {
        try {
          // 统一使用 setCommitInput 写入提交信息
          await scmProvider.setCommitInput(response.content);
          await NotificationHandler.info(
            `已将提交信息填入 ${scmProvider.type.toUpperCase()} 提交框`
          );
        } catch (error) {
          if (error instanceof Error) {
            await NotificationHandler.error(
              `写入提交信息失败: ${error.message}`
            );
            try {
              // 如果写入失败，尝试复制到剪贴板
              vscode.env.clipboard.writeText(response.content);
              await NotificationHandler.info("提交信息已复制到剪贴板");
            } catch (error) {
              if (error instanceof Error) {
                await NotificationHandler.error(
                  `复制提交信息失败: ${error.message}`
                );
                // 如果复制失败，提示用户手动复制 并将信息显示在消息框
                vscode.window.showInformationMessage(
                  "提交信息已生成，请手动复制到提交框",
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
        await NotificationHandler.error(`生成提交信息失败: ${error.message}`);
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
              (state as any)._resourceUri?.fsPath || state.resourceUri?.fsPath
          )
          .filter(Boolean)
      ),
    ];
  }

  private async showModelPicker(
    currentProvider: string,
    currentModel: string
  ): Promise<{ provider: string; model: string } | undefined> {
    try {
      const providers = AIProviderFactory.getAllProviders();
      const modelsMap = new Map<string, string[]>();

      await Promise.all(
        providers.map(async (provider) => {
          if (await provider.isAvailable()) {
            const models = await provider.getModels();
            modelsMap.set(provider.getName(), models);
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
      quickPick.title = "选择 AI 模型";
      quickPick.placeholder = "选择用于生成提交信息的 AI 模型";
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
