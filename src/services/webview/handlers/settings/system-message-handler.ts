import { UIRequest, ExtensionResponse } from "@/types/messages";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

export class SystemMessageHandler {
    constructor(private readonly _extensionContext: vscode.ExtensionContext) { }

    public async handle(message: any, webview: vscode.Webview): Promise<void> {
        switch (message.command) {
            case UIRequest.SystemShowMessage: {
                console.log(
                    "[SystemMessageHandler] Handling showInformationMessage"
                );
                const { message: msg, options, callbackId } = message.data;
                vscode.window
                    .showInformationMessage(msg, ...options)
                    .then((selection) => {
                        webview.postMessage({
                            command: ExtensionResponse.SystemMessageShown,
                            data: { callbackId, selection },
                        });
                    });
                break;
            }
            case UIRequest.SystemGetPackageInfo: {
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
                        command: ExtensionResponse.SystemPackageInfoLoaded,
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
                        command: ExtensionResponse.SystemError,
                        data: { message: `Failed to load package.json: ${errorMessage}` },
                    });
                }
                break;
            }
            // === 使用 globalState 进行持久化存储（替代旧的 workspace.getConfiguration） ===
            case UIRequest.SystemSetGlobalState: {
                console.log(
                    `[SystemMessageHandler] Handling setGlobalState for key: ${message.key}`
                );
                try {
                    const { key, value } = message;
                    // 使用 globalState 进行持久化存储，不会写入 settings.json
                    await this._extensionContext.globalState.update(key, value);
                    webview.postMessage({
                        command: ExtensionResponse.SystemGlobalStateUpdated,
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
                        command: ExtensionResponse.SystemGlobalStateUpdated,
                        key: message?.key,
                        success: false,
                        error: errorMessage,
                    });
                }
                break;
            }

            case UIRequest.SystemGetGlobalState: {
                console.log(
                    `[SystemMessageHandler] Handling getGlobalState for key: ${message.key}`
                );
                try {
                    const { key } = message;
                    const value = this._extensionContext.globalState.get(key);
                    webview.postMessage({
                        command: ExtensionResponse.SystemGlobalStateLoaded,
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
                        command: ExtensionResponse.SystemGlobalStateLoaded,
                        key: message?.key,
                        value: null,
                        error: errorMessage,
                    });
                }
                break;
            }

            // === 使用 secrets API 进行敏感信息存储 ===
            case UIRequest.SystemSetSecret: {
                console.log(
                    `[SystemMessageHandler] Handling setSecret for key: ${message.key}`
                );
                try {
                    const { key, value } = message;
                    await this._extensionContext.secrets.store(key, String(value ?? ""));
                    webview.postMessage({
                        command: ExtensionResponse.SystemSecretUpdated,
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
                        command: ExtensionResponse.SystemSecretUpdated,
                        key: message?.key,
                        success: false,
                        error: errorMessage,
                    });
                }
                break;
            }

            case UIRequest.SystemGetSecret: {
                console.log(
                    `[SystemMessageHandler] Handling getSecret for key: ${message.key}`
                );
                try {
                    const { key } = message;
                    const value = await this._extensionContext.secrets.get(key);
                    webview.postMessage({
                        command: ExtensionResponse.SystemSecretLoaded,
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
                        command: ExtensionResponse.SystemSecretLoaded,
                        key: message?.key,
                        value: null,
                        error: errorMessage,
                    });
                }
                break;
            }

            case UIRequest.SystemDeleteSecret: {
                console.log(
                    `[SystemMessageHandler] Handling deleteSecret for key: ${message.key}`
                );
                try {
                    const { key } = message;
                    await this._extensionContext.secrets.delete(key);
                    // 可选：通知删除结果
                    webview.postMessage({
                        command: ExtensionResponse.SystemSecretDeleted,
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
                        command: ExtensionResponse.SystemSecretDeleted,
                        key: message?.key,
                        success: false,
                        error: errorMessage,
                    });
                }
                break;
            }

            case UIRequest.SystemGetOS: {
                console.log("[SystemMessageHandler] Handling getOS");
                try {
                    const osPlatform = os.platform();
                    webview.postMessage({
                        command: ExtensionResponse.SystemOSInfoLoaded,
                        data: {
                            os: osPlatform,
                        },
                    });
                } catch (error) {
                    console.error("[SystemMessageHandler] Error in getOS:", error);
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    webview.postMessage({
                        command: ExtensionResponse.SystemOSInfoLoaded,
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
