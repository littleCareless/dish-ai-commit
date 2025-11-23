import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

export class SystemMessageHandler {
    constructor(private readonly _extensionContext: vscode.ExtensionContext) { }

    public async handle(message: any, webview: vscode.Webview): Promise<void> {
        switch (message.command) {
            case "showInformationMessage": {
                console.log(
                    "[SystemMessageHandler] Handling showInformationMessage"
                );
                const { message: msg, options, callbackId } = message.data;
                vscode.window
                    .showInformationMessage(msg, ...options)
                    .then((selection) => {
                        webview.postMessage({
                            command: "showInformationMessageResponse",
                            data: { callbackId, selection },
                        });
                    });
                break;
            }
            case "getPackageInfo": {
                console.log("[SystemMessageHandler] Handling getPackageInfo");
                try {
                    const packageJsonPath = path.join(
                        this._extensionContext.extensionPath,
                        "package.json"
                    );
                    const packageJsonContent = await fs.readFile(
                        packageJsonPath,
                        "utf-8"
                    );
                    const packageInfo = JSON.parse(packageJsonContent);
                    webview.postMessage({
                        command: "packageInfoLoaded",
                        data: packageInfo,
                    });
                } catch (error) {
                    console.error(
                        "[SystemMessageHandler] Error in getPackageInfo:",
                        error
                    );
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    webview.postMessage({
                        command: "error",
                        data: { message: `Failed to load package.json: ${errorMessage}` },
                    });
                }
                break;
            }
            // === 使用 globalState 进行持久化存储（替代旧的 workspace.getConfiguration） ===
            case "setGlobalState": {
                console.log(
                    `[SystemMessageHandler] Handling setGlobalState for key: ${message.key}`
                );
                try {
                    const { key, value } = message;
                    // 使用 globalState 进行持久化存储，不会写入 settings.json
                    await this._extensionContext.globalState.update(key, value);
                    webview.postMessage({
                        command: "setGlobalStateResponse",
                        key,
                        success: true,
                    });
                } catch (error) {
                    console.error(
                        `[SystemMessageHandler] Error in setGlobalState for key: ${message.key}:`,
                        error
                    );
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    webview.postMessage({
                        command: "setGlobalStateResponse",
                        key: message?.key,
                        success: false,
                        error: errorMessage,
                    });
                }
                break;
            }

            case "getGlobalState": {
                console.log(
                    `[SystemMessageHandler] Handling getGlobalState for key: ${message.key}`
                );
                try {
                    const { key } = message;
                    const value = this._extensionContext.globalState.get(key);
                    webview.postMessage({
                        command: "getGlobalStateResponse",
                        key,
                        value,
                    });
                } catch (error) {
                    console.error(
                        `[SystemMessageHandler] Error in getGlobalState for key: ${message.key}:`,
                        error
                    );
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    webview.postMessage({
                        command: "getGlobalStateResponse",
                        key: message?.key,
                        value: null,
                        error: errorMessage,
                    });
                }
                break;
            }

            // === 使用 secrets API 进行敏感信息存储 ===
            case "setSecret": {
                console.log(
                    `[SystemMessageHandler] Handling setSecret for key: ${message.key}`
                );
                try {
                    const { key, value } = message;
                    await this._extensionContext.secrets.store(key, String(value ?? ""));
                    webview.postMessage({
                        command: "setSecretResponse",
                        key,
                        success: true,
                    });
                } catch (error) {
                    console.error(
                        `[SystemMessageHandler] Error in setSecret for key: ${message.key}:`,
                        error
                    );
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    webview.postMessage({
                        command: "setSecretResponse",
                        key: message?.key,
                        success: false,
                        error: errorMessage,
                    });
                }
                break;
            }

            case "getSecret": {
                console.log(
                    `[SystemMessageHandler] Handling getSecret for key: ${message.key}`
                );
                try {
                    const { key } = message;
                    const value = await this._extensionContext.secrets.get(key);
                    webview.postMessage({
                        command: "getSecretResponse",
                        key,
                        value: value ?? null,
                    });
                } catch (error) {
                    console.error(
                        `[SystemMessageHandler] Error in getSecret for key: ${message.key}:`,
                        error
                    );
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    webview.postMessage({
                        command: "getSecretResponse",
                        key: message?.key,
                        value: null,
                        error: errorMessage,
                    });
                }
                break;
            }

            case "deleteSecret": {
                console.log(
                    `[SystemMessageHandler] Handling deleteSecret for key: ${message.key}`
                );
                try {
                    const { key } = message;
                    await this._extensionContext.secrets.delete(key);
                    // 可选：通知删除结果
                    webview.postMessage({
                        command: "deleteSecretResponse",
                        key,
                        success: true,
                    });
                } catch (error) {
                    console.error(
                        `[SystemMessageHandler] Error in deleteSecret for key: ${message.key}:`,
                        error
                    );
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    webview.postMessage({
                        command: "deleteSecretResponse",
                        key: message?.key,
                        success: false,
                        error: errorMessage,
                    });
                }
                break;
            }

            case "getOS": {
                console.log("[SystemMessageHandler] Handling getOS");
                try {
                    const osPlatform = os.platform();
                    webview.postMessage({
                        command: "getOSResponse",
                        data: {
                            os: osPlatform,
                        },
                    });
                } catch (error) {
                    console.error("[SystemMessageHandler] Error in getOS:", error);
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    webview.postMessage({
                        command: "getOSResponse",
                        data: {
                            os: null,
                            error: errorMessage,
                        },
                    });
                }
                break;
            }
        }
    }
}
