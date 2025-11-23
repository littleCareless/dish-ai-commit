import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { z, ZodError } from "zod";
import { formatMessage as t } from "../../../../utils/i18n/localization-manager";
import { safeWriteJson } from "../../../../utils/safe-write-json";
import { ProfileManagerService } from "../../../profile-manager/profile-manager-service";
import { ProviderStore } from "../../../profile-manager/provider-store";
import { LanguageSettingsManager } from "../../../settings/language-settings-manager";

export class ProfileMessageHandler {
    private _profileManager: ProfileManagerService;
    private _providerStore: ProviderStore;

    constructor(private readonly _extensionContext: vscode.ExtensionContext) {
        this._profileManager = ProfileManagerService.getInstance();
        this._providerStore = ProviderStore.getInstance(_extensionContext);
    }

    public async handle(message: any, webview: vscode.Webview): Promise<void> {
        switch (message.command) {
            case "loadProfiles": {
                console.log("[ProfileMessageHandler] Handling loadProfiles");
                const { requestId } = message.data;
                try {
                    const profiles = await this._profileManager.getAllProfiles();
                    const activeProfileId =
                        await this._profileManager.getActiveProfileId();

                    // 从 VSCode Configuration 读取 language 并合并到每个 profile
                    const language = await LanguageSettingsManager.getLanguage();
                    const profilesWithLanguage = profiles.map(profile => ({
                        ...profile,
                        preferences: {
                            ...profile.preferences,
                            language,
                        },
                    }));

                    console.log("profiles", profilesWithLanguage);
                    console.log("activeProfileId", activeProfileId);
                    webview.postMessage({
                        command: "loadProfilesResponse",
                        requestId,
                        payload: { profiles: profilesWithLanguage, activeProfileId },
                    });
                } catch (error) {
                    console.error(
                        "[ProfileMessageHandler] Error in loadProfiles:",
                        error
                    );
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    webview.postMessage({
                        command: "loadProfilesResponse",
                        requestId,
                        error: `Failed to load profiles: ${errorMessage}`,
                    });
                }
                break;
            }

            case "getAllProviders": {
                console.log("[ProfileMessageHandler] Handling getAllProviders");
                const { requestId } = message.data;
                try {
                    const providers = await this._profileManager.getAllProviders();
                    webview.postMessage({
                        command: "getAllProvidersResponse",
                        requestId,
                        payload: providers,
                    });
                } catch (error) {
                    console.error(
                        "[ProfileMessageHandler] Error in getAllProviders:",
                        error
                    );
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    webview.postMessage({
                        command: "getAllProvidersResponse",
                        requestId,
                        error: `Failed to get all providers: ${errorMessage}`,
                    });
                }
                break;
            }

            case "saveProfile": {
                const { requestId, profile } = message.data;
                console.log(
                    `[ProfileMessageHandler] Handling saveProfile for profile: ${profile?.id}`
                );
                try {
                    // 提取 language 并单独保存到 VSCode Configuration
                    const language = profile.preferences?.language;
                    if (language) {
                        await LanguageSettingsManager.updateLanguage(
                            language,
                            vscode.ConfigurationTarget.Global // 默认保存到用户级别
                        );
                    }

                    // 从 profile 中移除 language，其他字段正常保存
                    const { language: _, ...preferencesWithoutLanguage } = profile.preferences || {};
                    const profileToSave = {
                        ...profile,
                        preferences: preferencesWithoutLanguage,
                    };

                    await this._profileManager.saveProfile(profileToSave);
                    webview.postMessage({
                        command: "saveProfileResponse",
                        requestId,
                        payload: { success: true },
                    });
                } catch (error) {
                    console.error(
                        `[ProfileMessageHandler] Error in saveProfile for profile ${profile?.id}:`,
                        error
                    );
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    webview.postMessage({
                        command: "saveProfileResponse",
                        requestId,
                        error: errorMessage,
                    });
                }
                break;
            }

            case "deleteProfile": {
                const { requestId, profileId } = message.data;
                console.log(
                    `[ProfileMessageHandler] Handling deleteProfile for profileId: ${profileId}`
                );
                try {
                    await this._profileManager.deleteProfile(profileId);
                    webview.postMessage({
                        command: "deleteProfileResponse",
                        requestId,
                        payload: { success: true },
                    });
                } catch (error) {
                    console.error(
                        `[ProfileMessageHandler] Error in deleteProfile for profileId ${profileId}:`,
                        error
                    );
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    webview.postMessage({
                        command: "deleteProfileResponse",
                        requestId,
                        error: errorMessage,
                    });
                }
                break;
            }

            case "setActiveProfile": {
                const { requestId, profileId } = message.data;
                console.log(
                    `[ProfileMessageHandler] Handling setActiveProfile for profileId: ${profileId}`
                );
                try {
                    await this._profileManager.setActiveProfile(profileId);
                    webview.postMessage({
                        command: "setActiveProfileResponse",
                        requestId,
                        payload: { profileId },
                    });
                } catch (error) {
                    console.error(
                        `[ProfileMessageHandler] Error in setActiveProfile for profileId ${profileId}:`,
                        error
                    );
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    webview.postMessage({
                        command: "setActiveProfileResponse",
                        requestId,
                        error: `Failed to set active profile: ${errorMessage}`,
                    });
                }
                break;
            }

            case "exportProfile": {
                const { profileId } = message.data;
                console.log(
                    `[ProfileMessageHandler] Handling exportProfile for profileId: ${profileId}`
                );
                const uri = await vscode.window.showSaveDialog({
                    filters: { JSON: ["json"] },
                    defaultUri: vscode.Uri.file(
                        path.join(os.homedir(), "Documents", "dish-ai-commit-profile.json")
                    ),
                    title: t("profile.export.title"),
                });

                if (!uri) {
                    break;
                }

                try {
                    const profiles = await this._providerStore.export();
                    const packageInfo = JSON.parse(
                        await fs.readFile(
                            path.join(this._extensionContext.extensionPath, "package.json"),
                            "utf-8"
                        )
                    );
                    const exportData = {
                        version: "2.0",
                        profile: profiles,
                        metadata: {
                            exportedAt: new Date().toISOString(),
                            exportedBy: "dish-ai-commit",
                            extensionVersion: packageInfo.version,
                        },
                    };
                    await safeWriteJson(uri.fsPath, exportData);
                    vscode.window.showInformationMessage(t("profile.export.success"));
                } catch (e) {
                    const error = e instanceof Error ? e.message : "Unknown error";
                    vscode.window.showErrorMessage(`Failed to export profile: ${error}`);
                }
                break;
            }

            case "importProfile": {
                console.log("[ProfileMessageHandler] Handling importProfile");
                const uris = await vscode.window.showOpenDialog({
                    filters: { JSON: ["json"] },
                    canSelectMany: false,
                    title: t("profile.import.title"),
                });

                if (!uris || uris.length === 0) {
                    break;
                }

                try {
                    const filePath = uris[0].fsPath;
                    const fileContent = await fs.readFile(filePath, "utf-8");
                    const jsonData = JSON.parse(fileContent);

                    // The schema should validate the entire ProviderProfiles structure
                    const importFileSchema = z.object({
                        version: z.string(),
                        profile: z.any(), // We'll have to trust the structure for now
                        metadata: z.object({
                            exportedAt: z.string().datetime(),
                            exportedBy: z.string(),
                            extensionVersion: z.string(),
                        }),
                    });

                    const parsedData = importFileSchema.parse(jsonData);

                    await this._providerStore.importProfile(parsedData.profile);

                    // Since importProfile is void, we can't get the imported profile directly.
                    // We'll just notify success and let the UI reload profiles.
                    webview.postMessage({
                        command: "profileImported",
                        data: { success: true },
                    });
                    vscode.window.showInformationMessage(
                        t("profile.import.success.general")
                    );
                } catch (e) {
                    let error = "Unknown error";
                    if (e instanceof ZodError) {
                        error = e.issues
                            .map((issue) => `[${issue.path.join(".")}]: ${issue.message}`)
                            .join("\n");
                    } else if (e instanceof Error) {
                        error = e.message;
                    }
                    webview.postMessage({
                        command: "profileImported",
                        data: { success: false, error: error },
                    });
                    vscode.window.showErrorMessage(t("profile.import.failed", [error]));
                }
                break;
            }

            case "migrateSettings": {
                console.log("[ProfileMessageHandler] Handling migrateSettings");
                const { requestId } = message.data;
                try {
                    const migratedProfile =
                        await this._profileManager.migrateFromPackageJson();
                    webview.postMessage({
                        command: "migrateSettingsResponse",
                        requestId,
                        payload: { success: true, migratedProfile },
                    });
                } catch (error) {
                    console.error(
                        "[ProfileMessageHandler] Error in migrateSettings:",
                        error
                    );
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    webview.postMessage({
                        command: "migrateSettingsResponse",
                        requestId,
                        error: errorMessage,
                    });
                }
                break;
            }

            case "resetToDefaults": {
                console.log("[ProfileMessageHandler] Handling resetToDefaults");
                const { requestId } = message.data;
                try {
                    await this._profileManager.resetToDefaults();
                    webview.postMessage({
                        command: "resetToDefaultsResponse",
                        requestId,
                        payload: { success: true },
                    });
                } catch (error) {
                    console.error(
                        "[ProfileMessageHandler] Error in resetToDefaults:",
                        error
                    );
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    webview.postMessage({
                        command: "resetToDefaultsResponse",
                        requestId,
                        error: errorMessage,
                    });
                }
                break;
            }
        }
    }
}
