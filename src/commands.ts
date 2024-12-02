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
      // 获取所有可用的 AI Provider
      const providers = AIProviderFactory.getAllProviders();
      const modelsMap = new Map<string, string[]>();

      // 从每个 provider 获取模型列表
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

        for (const model of models) {
          const picked = provider === currentProvider && model === currentModel;
          items.push({
            label: model,
            description: provider,
            picked: picked,
          });
        }
      }

      const quickPick = vscode.window.createQuickPick();
      quickPick.items = items;
      quickPick.title = "选择 AI 模型";
      quickPick.placeholder = "选择用于生成提交信息的 AI 模型";
      quickPick.ignoreFocusOut = true;

      try {
        const result = await new Promise<vscode.QuickPickItem | undefined>(
          (resolve) => {
            quickPick.onDidAccept(() => {
              resolve(quickPick.selectedItems[0]);
            });
            quickPick.onDidHide(() => resolve(undefined));
            quickPick.show();
          }
        );

        if (result && result.description) {
          return {
            provider: result.description,
            model: result.label,
          };
        }
        return undefined;
      } finally {
        quickPick.dispose();
      }
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
      if (!svnService) {
        return;
      }
      // 检查 SVN 是否可用
      if (!(await svnService.hasSVN())) {
        return;
      }
      const config = ConfigurationManager.getInstance().getConfiguration();
      // 显示模型选择对话框
      const modelSelection = await this.showModelPicker("Ollama", "Ollama");


      if (!modelSelection) {
        return;
      }
      console.log("modelSelection", modelSelection);

      // 使用进度提示生成提交信息
      const response = await ProgressHandler.withProgress(
        "",
        async (progress) => {
          try {
            console.log("resourceStates", resourceStates);
            // 获取用户在源代码管理中选中的文件
            const selectedFiles = this.getSelectedFiles(resourceStates);

            console.log("selectedFiles", selectedFiles);
            progress.report({ increment: 30, message: "正在分析变更内容..." });

            // 获取 diff 内容
            const diffContent = await svnService.getDiff(selectedFiles);

            if (!diffContent) {
              await NotificationHandler.info("没有可提交的更改");
              return;
            }
            console.log("diffContent", diffContent);
            try {
              progress.report({
                increment: 30,
                message: "正在生成提交信息...",
              });

              const provider = AIProviderFactory.getProvider(
                modelSelection.provider
              );

              const result = await provider.generateResponse({
                prompt: diffContent,
                systemPrompt: config.systemPrompt,
                // 根据provider类型选择对应的模型
                model: modelSelection.model,
                language: config.language,
              });
              progress.report({ increment: 100, message: "生成完成" });
              return result;
            } catch (error) {
              console.log("生成失败");
              progress.report({ increment: 100, message: "生成失败" });

              throw error;
            }
          } catch (error) {
            throw error;
          }
        }
      );

      await NotificationHandler.info(`生成的提交信息: ${response?.content}`);

      // TODO! 调用 SVN 插件提交代码 （目前没有办法，因为 SVN 插件没有提供 API）
      // const svnExtension = vscode.extensions.getExtension('johnstoncode.svn-scm')?.exports;;
      // if (!svnExtension) {
      //     await NotificationHandler.error('未找到 SVN 插件');
      //     return;
      // }
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

    console.log("resourceStates", resourceStates);

    // 处理单个 resourceState 的情况
    if (!Array.isArray(resourceStates)) {
      const uri =
        (resourceStates as any)._resourceUri || resourceStates.resourceUri;
      if (!uri) {
        return [];
      }
      return [uri?.fsPath];
    }

    // 处理数组情况
    const selectedFiles = resourceStates.map((state) => {
      const uri = (state as any)._resourceUri || state.resourceUri;
      if (!uri) {
        return [];
      }
      return uri?.fsPath;
    });

    return [...new Set(selectedFiles)];
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

    // 保存配置
    const config = ConfigurationManager.getInstance();
    await config.updateConfig("OPENAI_BASE_URL", baseURL);
    await config.updateConfig("OPENAI_API_KEY", apiKey);

    return true;
  }

  private async ensureConfiguration(): Promise<boolean> {
    const config = ConfigurationManager.getInstance();
    const baseURL = config.getConfig<string>("OPENAI_BASE_URL", false);
    const apiKey = config.getConfig<string>("OPENAI_API_KEY", false);
    console.log("baseURL", baseURL);
    console.log("apiKey", apiKey);
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
          // 首先确保配置完成
          if (!(await this.ensureConfiguration())) {
            return;
          }

          // 然后进行其他验证
          if (!(await ConfigValidator.validateConfiguration())) {
            await NotificationHandler.error(`执行命令失败`);
            return;
          }

          try {
            // 传入资源状态到 generateCommitMessage
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
        // 首先验证 OpenAI Key
        if (!(await ConfigValidator.validateConfiguration())) {
          return;
        }
        // const config = ConfigurationManager.getInstance().getConfiguration();
        // await NotificationHandler.info("正在获取可用模型...");
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand(COMMANDS.REFRESH_MODELS, async () => {
        if (!(await ConfigValidator.validateConfiguration())) {
          return;
        }
        // await this.refreshModels();
      })
    );
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}

// 为了保持向后兼容，保留原有的函数
export function registerCommands(context: vscode.ExtensionContext) {
  const commandManager = new CommandManager(context);
  context.subscriptions.push(commandManager);
}
