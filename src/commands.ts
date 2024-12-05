import * as vscode from "vscode";
import { ConfigurationManager } from "./config/ConfigurationManager";
import { ConfigValidator } from "./configValidator";
import { SVNService } from "./svnService";
import { AIProviderFactory } from "./ai/AIProviderFactory";
import { NotificationHandler } from "./utils/NotificationHandler";
import { ProgressHandler } from "./utils/ProgressHandler";
import { COMMANDS } from "./constants";

export class CommandManager implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {
    this.registerCommands();
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

  private async generateCommitMessage(
    resourceStates?: vscode.SourceControlResourceState[]
  ): Promise<void> {
    try {
      const svnService = await SVNService.create();
      if (!svnService || !(await svnService.hasSVN())) {
        return;
      }

      const config = ConfigurationManager.getInstance().getConfiguration();
      const modelSelection = await this.showModelPicker("Ollama", "Ollama");

      if (!modelSelection) {
        return;
      }

      const response = await ProgressHandler.withProgress(
        "",
        async (progress) => {
          const selectedFiles = this.getSelectedFiles(resourceStates);
          progress.report({ increment: 30, message: "正在分析变更内容..." });

          const diffContent = await svnService.getDiff(selectedFiles);
          if (!diffContent) {
            await NotificationHandler.info("没有可提交的更改");
            return;
          }

          progress.report({ increment: 30, message: "正在生成提交信息..." });

          const provider = AIProviderFactory.getProvider(
            modelSelection.provider
          );
          const result = await provider.generateResponse({
            prompt: diffContent,
            systemPrompt: config.systemPrompt,
            model: modelSelection.model,
            language: config.language,
          });

          progress.report({ increment: 100, message: "生成完成" });
          return result;
        }
      );

      await NotificationHandler.info(`生成的提交信息: ${response?.content}`);
    } catch (error) {
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

      if (result !== "是") {
        return false;
      }

      return await this.showConfigWizard();
    }

    return true;
  }

  private registerCommands() {
    this.disposables.push(
      vscode.commands.registerCommand(
        COMMANDS.GENERATE,
        async (resourceStates?: vscode.SourceControlResourceState[]) => {
          if (!(await this.ensureConfiguration())) {
            return;
          }

          if (!(await ConfigValidator.validateConfiguration())) {
            await NotificationHandler.error(`执行命令失败`);
            return;
          }

          try {
            await this.generateCommitMessage(resourceStates);
          } catch (error) {
            if (error instanceof Error) {
              await NotificationHandler.error(`执行命令失败: ${error.message}`);
            }
          }
        }
      )
    );

    this.disposables.push(
      vscode.commands.registerCommand(COMMANDS.SHOW_MODELS, async () => {
        if (!(await ConfigValidator.validateConfiguration())) {
          return;
        }
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand(COMMANDS.REFRESH_MODELS, async () => {
        if (!(await ConfigValidator.validateConfiguration())) {
          return;
        }
      })
    );
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}

export function registerCommands(context: vscode.ExtensionContext) {
  const commandManager = new CommandManager(context);
  context.subscriptions.push(commandManager);
}
