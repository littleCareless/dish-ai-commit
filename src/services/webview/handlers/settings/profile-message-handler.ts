import { settingsMigration } from "@/services/core/settings-migration";
import { ProfileManagerService } from "@/services/profile-manager/profile-manager-service";
import { ProviderStore } from "@/services/profile-manager/provider-store";
import { LanguageSettingsManager } from "@/services/settings/language-settings-manager";
import { ExtensionResponse, UIRequest } from "@/types/messages";
import { formatMessage as t } from "@/utils/i18n/localization-manager";
import { safeWriteJson } from "@/utils/safe-write-json";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { z, ZodError } from "zod";

export class ProfileMessageHandler {
    private _profileManager: ProfileManagerService | null = null;
    private _providerStore: ProviderStore;

    constructor(private readonly _extensionContext: vscode.ExtensionContext) {
        this._providerStore = ProviderStore.getInstance(_extensionContext);
    }

    private get profileManager(): ProfileManagerService {
        if (!this._profileManager) {
            this._profileManager = ProfileManagerService.getInstance();
        }
        return this._profileManager;
    }

    public async handle(message: any, webview: vscode.Webview): Promise<void> {
        switch (message.command) {
            case UIRequest.ProfileLoadAll: {
                console.log("[ProfileMessageHandler] Handling loadProfiles");
                const { requestId } = message.data;
                try {
                    const profiles = await this.profileManager.getAllProfiles();
                    const activeProfileId =
                        await this.profileManager.getActiveProfileId();

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
                        command: ExtensionResponse.ProfileAllLoaded,
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
                        command: ExtensionResponse.ProfileAllLoaded,
                        requestId,
                        error: `Failed to load profiles: ${errorMessage}`,
                    });
                }
                break;
            }

            case UIRequest.ProfileGetAllProviders: {
                console.log("[ProfileMessageHandler] Handling getAllProviders");
                const { requestId } = message.data;
                try {
                    const providers = await this.profileManager.getAllProviders();
                    webview.postMessage({
                        command: ExtensionResponse.ProfileAllProvidersLoaded,
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
                        command: ExtensionResponse.ProfileAllProvidersLoaded,
                        requestId,
                        error: `Failed to get all providers: ${errorMessage}`,
                    });
                }
                break;
            }

            case UIRequest.ProfileSave: {
                const { requestId, profile } = message.data;
                console.log(
                    `[ProfileMessageHandler] Handling saveProfile for profile: ${profile?.id}`
                );
                try {
                    // 直接保存整个 profile，包括 language（现在 language 存储在 profile 的 preferences 中）
                    await this.profileManager.saveProfile(profile);
                    webview.postMessage({
                        command: ExtensionResponse.ProfileSaved,
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
                        command: ExtensionResponse.ProfileSaved,
                        requestId,
                        error: errorMessage,
                    });
                }
                break;
            }

            case UIRequest.ProfileDelete: {
                const { requestId, profileId } = message.data;
                console.log(
                    `[ProfileMessageHandler] Handling deleteProfile for profileId: ${profileId}`
                );
                try {
                    await this.profileManager.deleteProfile(profileId);
                    webview.postMessage({
                        command: ExtensionResponse.ProfileDeleted,
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
                        command: ExtensionResponse.ProfileDeleted,
                        requestId,
                        error: errorMessage,
                    });
                }
                break;
            }

            case UIRequest.ProfileSetActive: {
                const { requestId, profileId } = message.data;
                console.log(
                    `[ProfileMessageHandler] Handling setActiveProfile for profileId: ${profileId}`
                );
                try {
                    await this.profileManager.setActiveProfile(profileId);
                    webview.postMessage({
                        command: ExtensionResponse.ProfileActiveChanged,
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
                        command: ExtensionResponse.ProfileActiveChanged,
                        requestId,
                        error: `Failed to set active profile: ${errorMessage}`,
                    });
                }
                break;
            }

            case UIRequest.ProfileExport: {
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

            case UIRequest.ProfileImport: {
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
                        command: ExtensionResponse.ProfileImported,
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
                        command: ExtensionResponse.ProfileImported,
                        data: { success: false, error: error },
                    });
                    vscode.window.showErrorMessage(t("profile.import.failed", [error]));
                }
                break;
            }

            case UIRequest.ProfileMigrateSettings: {
                console.log("[ProfileMessageHandler] Handling profile.migrateSettings");
                const { requestId, detectOnly, preview, execute } = message.data;
                try {
                    if (detectOnly) {
                        const result = await settingsMigration.detectOldConfiguration();
                        webview.postMessage({
                            command: ExtensionResponse.ProfileSettingsMigrated,
                            requestId,
                            payload: { detectResult: result },
                        });
                    } else if (preview) {
                        const result = await settingsMigration.previewMigration();
                        webview.postMessage({
                            command: ExtensionResponse.ProfileSettingsMigrated,
                            requestId,
                            payload: { previewResult: result },
                        });
                    } else if (execute) {
                        const result = await settingsMigration.performMigration();
                        webview.postMessage({
                            command: ExtensionResponse.ProfileSettingsMigrated,
                            requestId,
                            payload: { success: result.success, profileId: result.profileId },
                        });
                    } else {
                        // Default fallback (legacy behavior)
                        const migratedProfile =
                            await this.profileManager.migrateFromPackageJson();
                        webview.postMessage({
                            command: ExtensionResponse.ProfileSettingsMigrated,
                            requestId,
                            payload: { success: true, migratedProfile },
                        });
                    }
                } catch (error) {
                    console.error(
                        "[ProfileMessageHandler] Error in migrateSettings:",
                        error
                    );
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    webview.postMessage({
                        command: ExtensionResponse.ProfileSettingsMigrated,
                        requestId,
                        error: errorMessage,
                    });
                }
                break;
            }

            case UIRequest.ProfileResetDefaults: {
                console.log("[ProfileMessageHandler] Handling resetToDefaults");
                const { requestId } = message.data;
                try {
                    await this.profileManager.resetToDefaults();
                    webview.postMessage({
                        command: ExtensionResponse.ProfileResetComplete,
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
                        command: ExtensionResponse.ProfileResetComplete,
                        requestId,
                        error: errorMessage,
                    });
                }
                break;
            }
        }
    }
}
