import * as vscode from "vscode";
import { EmbeddingService } from "../../core/indexing/embedding-service";
import { AIProvider } from "../../ai/types";
import { AIProviderFactory } from "../../ai/ai-provider-factory";
import { stateManager } from "../../utils/state/state-manager";
import { WORKSPACE_CONFIG_SCHEMA } from "../../config/workspace-config-schema";

export class SettingsViewMessageHandler {
  private readonly _extensionId: string;

  constructor(
    extensionId: string,
    private readonly _embeddingService: EmbeddingService | null,
    private readonly _extensionContext: vscode.ExtensionContext // Receive // extensionContext here
  ) {
    this._extensionId = extensionId;
  }

  public async handleMessage(
    message: any,
    webview: vscode.Webview
  ): Promise<void> {
    switch (message.command) {
      case "startIndexing": {
        const startIndex = message?.data?.startIndex ?? 0;
        console.log(
          `[SettingsViewProvider] Received startIndexing message with startIndex: ${startIndex}`
        );
        this.startIndexing(startIndex, webview);
        break;
      }
      case "getSettings": {
        const config = vscode.workspace.getConfiguration("dish-ai-commit");
        const extensionPackageJSON = vscode.extensions.getExtension(
          this._extensionId
        )!.packageJSON;

        // 确保 contributes 和 configuration 存在
        const configProperties =
          extensionPackageJSON?.contributes?.configuration?.properties;
        console.log("configProperties", configProperties);
        if (!configProperties) {
          webview.postMessage({
            command: "loadSettingsError",
            error: "无法加载配置定义。",
          });
          return;
        }

        const detailedSettings: any[] = [];
        for (const key in configProperties) {
          // 确保 key 是 package.json 中定义的配置项，通常带有插件前缀
          if (
            Object.prototype.hasOwnProperty.call(configProperties, key) &&
            key.startsWith("dish-ai-commit.")
          ) {
            const prop = configProperties[key];
            const configKeyWithoutPrefix = key.substring(
              "dish-ai-commit.".length
            );
            const value = config.get(configKeyWithoutPrefix);

            detailedSettings.push({
              key: configKeyWithoutPrefix,
              type: prop.type,
              default: prop.default,
              description: prop.description || prop.markdownDescription || "",
              enum: prop.enum,
              value: value,
              fromPackageJSON: true, // Add this flag to indicate settings from package.json
            });
          }
        }
        console.log("test1", detailedSettings);

        // Load settings from workspace state
        const workspaceSettings: any[] = [];
        const processWorkspaceConfig = (
          schema: any,
          path: string,
          settings: any[]
        ) => {
          for (const key in schema) {
            if (Object.prototype.hasOwnProperty.call(schema, key)) {
              const prop = schema[key];
              const currentPath = path ? `${path}.${key}` : key;

              // Check if the property has a 'type' field, which indicates it's a setting
              if (prop.hasOwnProperty("type")) {
                const value = stateManager.getWorkspace<any>(
                  currentPath,
                  prop.default
                );

                settings.push({
                  key: currentPath,
                  type: prop.type,
                  default: prop.default,
                  description: prop.description || "",
                  enum: prop.enum,
                  value: value,
                  fromPackageJSON: false,
                });
              } else {
                // If it's an object without a 'type', recurse into it
                processWorkspaceConfig(prop, currentPath, settings);
              }
            }
          }
        };

        processWorkspaceConfig(WORKSPACE_CONFIG_SCHEMA, "", workspaceSettings);

        // 获取索引状态
        let isIndexed = 0;
        if (this._embeddingService) {
          isIndexed = await this._embeddingService.isIndexed();
        }

        console.log("loadSettings", [
          ...detailedSettings,
          ...workspaceSettings,
        ]);

        webview.postMessage({
          command: "loadSettings",
          data: {
            schema: [...detailedSettings, ...workspaceSettings], // Merge settings from both sources
            isIndexed: isIndexed, // 将索引状态添加到消息中
          },
        });
        break;
      }

      case "saveSettings": {
        const newSettings = message.data;
        console.log("newSettings", newSettings);
        const config = vscode.workspace.getConfiguration("dish-ai-commit");
        try {
          for (const setting of newSettings) {
            if (setting.key && setting.value !== undefined) {
              // Check if the setting is from package.json
              const settingFromPackageJSON = newSettings.find(
                (s: any) => s.key === setting.key
              )?.fromPackageJSON;

              if (settingFromPackageJSON) {
                // Save to VS Code configuration
                await config.update(
                  setting.key,
                  setting.value,
                  vscode.ConfigurationTarget.Global
                );
              } else {
                // Save to workspace state
                await stateManager.setWorkspace(setting.key, setting.value);
              }
            }
          }
          vscode.window.showInformationMessage("设置已成功保存！");
          // 可选：重新加载配置以显示更新后的值
          webview.postMessage({ command: "settingsSaved" });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`保存设置失败: ${errorMessage}`);
          webview.postMessage({
            command: "saveSettingsError",
            error: `保存设置失败: ${errorMessage}`,
          });
        }
        break;
      }
      case "getModelsForProvider": {
        const { providerId, modelSettingKey, providerContextKey } =
          message.data;
        if (!providerId || !modelSettingKey || !providerContextKey) {
          webview.postMessage({
            command: "getModelsForProviderError",
            data: {
              modelSettingKey,
              error:
                "Missing providerId, modelSettingKey, or providerContextKey in request.",
            },
          });
          return;
        }

        try {
          // console.log(`[SettingsViewProvider] Received getModelsForProvider for providerId: ${providerId}, context: ${providerContextKey}`);

          // 获取特定 provider 的配置，因为 getModels 可能需要 API key 等
          // providerContextKey 应该是类似 "providers.openai" 这样的键
          const config = vscode.workspace.getConfiguration("dish-ai-commit");
          const providerSettings = config.get(providerContextKey);

          // console.log(`[SettingsViewProvider] Provider settings for ${providerContextKey}:`, providerSettings);

          // 使用 AiProviderFactory 获取 provider 实例
          // AiProviderFactory 可能需要调整以接受配置或自动读取
          // 这里简化处理，假设 AiProviderFactory.createProvider 可以处理
          // 如果 AiProviderFactory.createProvider 需要完整的配置对象，需要传递
          // 或者 AiProviderFactory 有一个 getProvider(id, config) 的方法

          // 查找 provider 的定义，以确定是否需要传递特定配置给 factory
          const extensionPackageJSON = vscode.extensions.getExtension(
            this._extensionId
          )!.packageJSON;
          const configProperties =
            extensionPackageJSON?.contributes?.configuration?.properties;

          let providerInstance: AIProvider | undefined;

          // 尝试基于 providerId (通常是枚举值，如 'openai', 'ollama') 创建 provider
          // AiProviderFactory 可能需要一个方法来创建基于 provider 类型字符串的实例
          // 而不是基于配置中的 'provider' 字段的值（那可能是具体的模型名称或更详细的标识）
          // 假设 providerId 就是我们需要的类型标识符

          // 确保 providerId 是一个有效的类型，而不是一个具体的模型名称
          // 通常 providerId 会是 'openai', 'ollama' 等
          // 我们需要一个方法来获取这个 provider 的实例
          // AiProviderFactory.createProvider 可能需要 provider 的类型和该 provider 的配置

          // 简化：假设 AiProviderFactory 有一个方法可以根据 providerId (如 'openai') 获取实例
          // 并且它能自行处理配置的获取，或者我们传递必要的配置
          // 这里的 providerId 是从 webview 的 provider type setting 的 value 传过来的

          providerInstance = AIProviderFactory.getProvider(providerId); // 只传递 providerId

          if (!providerInstance) {
            throw new Error(
              `Unsupported or unknown provider ID: ${providerId}`
            );
          }

          if (typeof providerInstance.getModels !== "function") {
            // console.warn(`[SettingsViewProvider] Provider ${providerId} does not implement getModels(). Sending empty list.`);
            webview.postMessage({
              command: "modelsForProviderLoaded",
              data: { modelSettingKey, models: [] },
            });
            return;
          }

          const models = await providerInstance.getModels(); // 移除参数
          // console.log(`[SettingsViewProvider] Models for ${providerId} (${modelSettingKey}):`, models);
          webview.postMessage({
            command: "modelsForProviderLoaded",
            data: { modelSettingKey, models: models || [] },
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          // console.error(`[SettingsViewProvider] Error getting models for ${providerId} (${modelSettingKey}):`, errorMessage);
          webview.postMessage({
            command: "getModelsForProviderError",
            data: { modelSettingKey, error: errorMessage },
          });
        }
        break;
      }
    }
  }
  private async startIndexing(
    startIndex: number,
    webview: vscode.Webview
  ): Promise<void> {
    // 检查 EmbeddingService 是否存在
    if (!this._embeddingService) {
      const errorMessage = "EmbeddingService 未初始化，无法执行索引操作。";
      console.error(`[SettingsViewMessageHandler] ${errorMessage}`);
      webview.postMessage({
        command: "indexingFailed",
        data: { message: errorMessage },
      });
      return;
    }

    // 调用 EmbeddingService 的方法，并将 startIndex 传递给它
    try {
      await this._embeddingService.scanProjectFiles(startIndex, webview);
      webview.postMessage({
        command: "indexingFinished",
        data: { message: "索引完成!" },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[SettingsViewMessageHandler] Error during indexing: ${errorMessage}`
      );
      webview.postMessage({
        command: "indexingFailed",
        data: { message: `索引失败: ${errorMessage}` },
      });
    }
  }
}
