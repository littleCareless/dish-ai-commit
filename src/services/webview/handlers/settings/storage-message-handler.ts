import { DISH_CONFIG_PREFIX } from "@/config/constants";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import * as vscode from "vscode";

const KNOWN_SECRET_KEYS = [`${DISH_CONFIG_PREFIX}_api_config`];

export class StorageMessageHandler {
  constructor(private readonly _extensionContext: vscode.ExtensionContext) {}

  public async handle(message: any, webview: vscode.Webview): Promise<void> {
    switch (message.command) {
      case UIRequest.SystemGetAllStorage: {
        const storageData: { [key: string]: any } = {};

        // 1. Global State
        const globalKeys = this._extensionContext.globalState.keys();
        for (const key of globalKeys) {
          storageData[`Global State: ${key}`] =
            this._extensionContext.globalState.get(key);
        }

        // 2. Workspace State
        const workspaceKeys = this._extensionContext.workspaceState.keys();
        for (const key of workspaceKeys) {
          storageData[`Workspace State: ${key}`] =
            this._extensionContext.workspaceState.get(key);
        }

        // 3. Secrets
        // Note: secrets API doesn't have a .keys() method for security.
        // We must explicitly list known keys.
        for (const key of KNOWN_SECRET_KEYS) {
          try {
            const secretValue = await this._extensionContext.secrets.get(key);
            if (secretValue) {
              try {
                // Try parsing as JSON for better readability
                storageData[`Secrets: ${key}`] = JSON.parse(secretValue);
              } catch (e) {
                storageData[`Secrets: ${key}`] = secretValue;
              }
            } else {
              storageData[`Secrets: ${key}`] = "[Not Set]";
            }
          } catch (error) {
            storageData[`Secrets: ${key}`] = `[Error reading secret: ${error}]`;
          }
        }

        webview.postMessage({
          command: ExtensionResponse.SystemAllStorageLoaded,
          data: storageData,
        });
        break;
      }

      case UIRequest.SystemClearAllStorage: {
        try {
          // Define all known legacy and current keys to be cleared
          const keysToClear = {
            global: [
              // Legacy keys
              "confirm:dish:ai:tos",
              "totalTokens",
              "detailedTokenStats",
              `${DISH_CONFIG_PREFIX}_confirm_ai_tos`,
              `${DISH_CONFIG_PREFIX}_detailed_token_stats`,
              "profiles",
              "activeProfileId",
              "config",
              "dish.settings.indexing",
              "dish.settings.features",
              "notificationSettings",
              // Keys with provider prefixes
              "providers.openai",
              "providers.lmstudio",
              "providers.deepseek",
              "providers.ollama",
              "providers.ollama.baseUrl",
              "dish_config_indexing_settings",
              "providers.mistral",
              "providers.vertexai",
              "providers.cloudflare-workersai",
              "providers.vscode",
              // Other legacy keys
              "workspaceConfig",
              "experimental.codeIndex.enabled",
              "experimental.codeIndex.embeddingProvider",
              "experimental.codeIndex.embeddingModel",
              "experimental.codeIndex.qdrantUrl",
              // New keys (prefixed) - explicitly list them to be safe
              "dish_config_api_config",
              "dish_config_indexing_settings",
              // Also explicitly add the key that was missed before
              "providers.ollama.baseUrl",
              ...this._extensionContext.globalState
                .keys()
                .filter((k) => k.startsWith(DISH_CONFIG_PREFIX)),
            ],
            workspace: [
              "experimental.codeIndex.enabled",
              "experimental.codeIndex.embeddingProvider",
              "experimental.codeIndex.qdrantUrl",
              // Clear any prefixed keys in workspace state
              ...this._extensionContext.workspaceState
                .keys()
                .filter((k) => k.startsWith(DISH_CONFIG_PREFIX)),
            ],
            secrets: KNOWN_SECRET_KEYS,
          };

          // 1. Clear Global State
          for (const key of keysToClear.global) {
            await this._extensionContext.globalState.update(key, undefined);
          }

          // 2. Clear Workspace State
          for (const key of keysToClear.workspace) {
            await this._extensionContext.workspaceState.update(key, undefined);
          }

          // 3. Clear Secrets
          for (const key of keysToClear.secrets) {
            await this._extensionContext.secrets.delete(key);
          }

          // 4. Respond to webview
          webview.postMessage({
            command: ExtensionResponse.SystemStorageCleared,
            success: true,
          });

          // 5. Reload the webview or ask user to reload
          vscode.commands.executeCommand("workbench.action.reloadWindow");
        } catch (error) {
          webview.postMessage({
            command: ExtensionResponse.SystemStorageCleared,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        break;
      }
    }
  }
}
