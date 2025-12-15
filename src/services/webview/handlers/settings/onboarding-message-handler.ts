import { AIProviderFactory } from "@/ai/ai-provider-factory";
import {
    EnvironmentDetectorService,
    type QuickStartTemplate
} from "@/services/settings/environment-detector";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import * as vscode from "vscode";

/**
 * 引导流程状态
 */
interface OnboardingStatus {
    completed: boolean;
    completedAt?: number;
    skipped?: boolean;
}

const ONBOARDING_STATUS_KEY = "onboarding.status";

/**
 * Onboarding 消息处理器 - 处理首次使用引导相关请求
 */
export class OnboardingMessageHandler {
    private readonly environmentDetector: EnvironmentDetectorService;

    constructor(private readonly _extensionContext: vscode.ExtensionContext) {
        this.environmentDetector = EnvironmentDetectorService.getInstance();
    }

    public async handle(message: any, webview: vscode.Webview): Promise<void> {
        switch (message.command) {
            case UIRequest.OnboardingDetectEnvironment: {
                await this.handleDetectEnvironment(webview);
                break;
            }

            case UIRequest.OnboardingGetTemplates: {
                await this.handleGetTemplates(webview);
                break;
            }

            case UIRequest.OnboardingApplyTemplate: {
                await this.handleApplyTemplate(message.data, webview);
                break;
            }

            case UIRequest.OnboardingValidateConfig: {
                await this.handleValidateConfig(message.data, webview);
                break;
            }

            case UIRequest.OnboardingSetCompleted: {
                await this.handleSetCompleted(message.data, webview);
                break;
            }

            case UIRequest.OnboardingGetStatus: {
                await this.handleGetStatus(webview);
                break;
            }
        }
    }

    /**
     * 检测本地环境
     */
    private async handleDetectEnvironment(webview: vscode.Webview): Promise<void> {
        try {
            console.log("[OnboardingMessageHandler] Detecting local environment...");
            const result = await this.environmentDetector.detectLocalServices();

            webview.postMessage({
                command: ExtensionResponse.OnboardingEnvironmentDetected,
                data: {
                    success: true,
                    localServices: result.localServices,
                    recommendedProvider: result.recommendedProvider,
                    hasLocalService: result.hasLocalService,
                },
            });

            console.log(
                `[OnboardingMessageHandler] Environment detected: ${result.localServices.length} local services, recommended: ${result.recommendedProvider?.id || "none"}`
            );
        } catch (error) {
            console.error("[OnboardingMessageHandler] Error detecting environment:", error);
            webview.postMessage({
                command: ExtensionResponse.OnboardingEnvironmentDetected,
                data: {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                    localServices: [],
                    hasLocalService: false,
                },
            });
        }
    }

    /**
     * 获取快速开始模板
     */
    private async handleGetTemplates(webview: vscode.Webview): Promise<void> {
        try {
            console.log("[OnboardingMessageHandler] Getting quick start templates...");
            const templates = await this.environmentDetector.getQuickStartTemplates();

            webview.postMessage({
                command: ExtensionResponse.OnboardingTemplatesLoaded,
                data: {
                    success: true,
                    templates,
                },
            });

            console.log(`[OnboardingMessageHandler] Loaded ${templates.length} templates`);
        } catch (error) {
            console.error("[OnboardingMessageHandler] Error getting templates:", error);
            webview.postMessage({
                command: ExtensionResponse.OnboardingTemplatesLoaded,
                data: {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                    templates: [],
                },
            });
        }
    }

    /**
     * 应用模板配置
     */
    private async handleApplyTemplate(
        data: { templateId: string; template: QuickStartTemplate },
        webview: vscode.Webview
    ): Promise<void> {
        try {
            const { templateId, template } = data;
            console.log(`[OnboardingMessageHandler] Applying template: ${templateId}`);

            // 这里可以根据模板自动配置 profile
            // 由于配置逻辑已有 ProfileManagerService 处理，这里只返回成功信息
            webview.postMessage({
                command: ExtensionResponse.OnboardingTemplateApplied,
                data: {
                    success: true,
                    templateId,
                    providerId: template.providerId,
                    config: template.config,
                },
            });
        } catch (error) {
            console.error("[OnboardingMessageHandler] Error applying template:", error);
            webview.postMessage({
                command: ExtensionResponse.OnboardingTemplateApplied,
                data: {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                },
            });
        }
    }

    /**
     * 验证配置（连接测试）
     */
    private async handleValidateConfig(
        data: { providerId: string; apiKey?: string; baseUrl?: string },
        webview: vscode.Webview
    ): Promise<void> {
        try {
            const { providerId, apiKey, baseUrl } = data;
            console.log(`[OnboardingMessageHandler] Validating config for: ${providerId}`);

            const provider = AIProviderFactory.getProvider(providerId, {
                apiKey,
                baseUrl,
                providerId,
            });

            // 尝试获取模型列表来验证连接
            const startTime = Date.now();
            const isAvailable = await provider.isAvailable();
            const duration = Date.now() - startTime;

            let models: string[] = [];
            if (isAvailable) {
                try {
                    const modelList = await provider.getModels();
                    models = modelList.map((m) => m.id);
                } catch {
                    // 获取模型失败不影响验证结果
                }
            }

            webview.postMessage({
                command: ExtensionResponse.OnboardingConfigValidated,
                data: {
                    success: true,
                    providerId,
                    isValid: isAvailable,
                    models,
                    duration,
                    message: isAvailable
                        ? "Configuration validated successfully"
                        : "Unable to connect to the provider",
                },
            });

            console.log(
                `[OnboardingMessageHandler] Config validation result: ${isAvailable}, took ${duration}ms`
            );
        } catch (error) {
            console.error("[OnboardingMessageHandler] Error validating config:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);

            // 提供更友好的错误信息
            let userFriendlyMessage = errorMessage;
            if (errorMessage.includes("401") || errorMessage.includes("unauthorized")) {
                userFriendlyMessage = "Invalid API key. Please check your credentials.";
            } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
                userFriendlyMessage = "Network error. Please check your internet connection.";
            } else if (errorMessage.includes("timeout")) {
                userFriendlyMessage = "Connection timed out. The service might be unavailable.";
            }

            webview.postMessage({
                command: ExtensionResponse.OnboardingConfigValidated,
                data: {
                    success: true, // API 调用成功，只是验证失败
                    providerId: data.providerId,
                    isValid: false,
                    errorType: this.classifyError(errorMessage),
                    message: userFriendlyMessage,
                },
            });
        }
    }

    /**
     * 设置引导完成状态
     */
    private async handleSetCompleted(
        data: { completed: boolean; skipped?: boolean },
        webview: vscode.Webview
    ): Promise<void> {
        try {
            const status: OnboardingStatus = {
                completed: data.completed,
                completedAt: data.completed ? Date.now() : undefined,
                skipped: data.skipped,
            };

            await this._extensionContext.globalState.update(ONBOARDING_STATUS_KEY, status);

            webview.postMessage({
                command: ExtensionResponse.OnboardingStatusLoaded,
                data: {
                    success: true,
                    ...status,
                },
            });

            console.log(
                `[OnboardingMessageHandler] Onboarding status set: completed=${data.completed}, skipped=${data.skipped}`
            );
        } catch (error) {
            console.error("[OnboardingMessageHandler] Error setting status:", error);
        }
    }

    /**
     * 获取引导状态
     */
    private async handleGetStatus(webview: vscode.Webview): Promise<void> {
        try {
            const status = this._extensionContext.globalState.get<OnboardingStatus>(
                ONBOARDING_STATUS_KEY
            ) || { completed: false };

            webview.postMessage({
                command: ExtensionResponse.OnboardingStatusLoaded,
                data: {
                    success: true,
                    ...status,
                },
            });
        } catch (error) {
            console.error("[OnboardingMessageHandler] Error getting status:", error);
            webview.postMessage({
                command: ExtensionResponse.OnboardingStatusLoaded,
                data: {
                    success: false,
                    completed: false,
                },
            });
        }
    }

    /**
     * 分类错误类型
     */
    private classifyError(message: string): "auth" | "network" | "timeout" | "unknown" {
        const lowerMessage = message.toLowerCase();
        if (
            lowerMessage.includes("401") ||
            lowerMessage.includes("unauthorized") ||
            lowerMessage.includes("invalid") ||
            lowerMessage.includes("api key")
        ) {
            return "auth";
        }
        if (
            lowerMessage.includes("network") ||
            lowerMessage.includes("fetch") ||
            lowerMessage.includes("econnrefused")
        ) {
            return "network";
        }
        if (lowerMessage.includes("timeout")) {
            return "timeout";
        }
        return "unknown";
    }
}
