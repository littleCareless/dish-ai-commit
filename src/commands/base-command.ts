import { AIProviderFactory } from "@/ai/ai-provider-factory";
import { AIModel, AIProvider } from "@/ai/types";

import { DISH_CONFIG_PREFIX } from "@/config/constants";
import { ISCMProvider, SCMFactory } from "@/scm/scm-provider";
import { SCMDetectorService } from "@/services/core/scm-detector-service";
import { ProfileManagerService } from "@/services/profile-manager/profile-manager-service";
import { getMessage } from "@/utils/i18n";
import { Logger } from "@/utils/logger";
import { notify } from "@/utils/notification/notification-manager";
import { stateManager } from "@/utils/state/state-manager";
import * as vscode from "vscode";

/**
 * 基础命令类,提供通用的命令执行功能
 */
export abstract class BaseCommand {
  /** VSCode扩展上下文 */
  protected context: vscode.ExtensionContext;
  protected logger: Logger;

  /**
   * 创建命令实例
   * @param context - VSCode扩展上下下文
   */
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.logger = Logger.getInstance("Dish AI Commit Gen");
  }

  /**
   * 验证配置是否有效
   * @returns 配置是否有效
   */
  protected async validateConfig(): Promise<boolean> {
    const profileManager = await ProfileManagerService.create(this.context);
    if (!(await profileManager.hasProfiles())) {
      await notify.error(getMessage("command.execution.failed"));
      return false;
    }
    return true;
  }

  /**
   * 处理执行过程中的错误
   * @param error - 错误对象
   * @param errorMessage - 错误消息模板
   */
  protected async handleError(
    error: unknown,
    errorMessage: string
  ): Promise<void> {
    const message = `${errorMessage}: ${error instanceof Error ? error.message : String(error)}`;
    if (error instanceof Error) {
      this.logger.logError(error, errorMessage);
      await notify.error(errorMessage, [error.message]);
    } else {
      this.logger.error(message);
      await notify.error(errorMessage);
    }
  }

  /**
   * 处理AI配置
   * @returns AI提供商和模型信息,如果配置无效则返回undefined
   */
  protected handleConfiguration(
    profile: any,
    featureSettings: any
  ): { provider: string; model: string; config: any } | undefined {
    if (!profile) {
      this.logger.error("handleConfiguration: Profile is missing", {
        operation: "handleConfiguration",
      });
      throw new Error(getMessage("profile.not.found"));
    }

    this.logger.debug(`获取到配置: ${JSON.stringify(profile, null, 2)}`);

    // Step 2: 从 profile 中提取配置信息
    // 使用统一的 ProviderSelectionService 选择 provider
    const { ProviderSelectionService } =
      require("@/services/core/provider-selection-service") as typeof import("@/services/core/provider-selection-service");

    const selection = ProviderSelectionService.selectProvider(profile);
    const provider = selection.provider;
    const model = selection.model;
    let config = selection.config as any;

    this.logger.debug("Provider 选择完成", {
      data: {
        provider,
        model,
        hasConfig: !!config,
        configKeys: Object.keys(config || {}),
        apiKey: config?.apiKey,
      },
    });

    // Step 3: 验证配置完整性
    if (!provider || !model) {
      this.logger.error(
        `配置不完整 - Provider: ${provider}, Model: ${model}, Config: ${JSON.stringify(config)}`
      );
      this.logger.error(`配置数据: ${JSON.stringify(profile, null, 2)}`);
      throw new Error(getMessage("profile.incomplete"));
    }

    // 构建完整配置
    const fullConfig = {
      ...config,
      base: {
        language: profile.preferences.language || "Simplified Chinese",
      },
      features: {
        suppressNonCriticalWarnings:
          featureSettings.suppressNonCriticalWarnings,
        commitFormat: {
          enableMergeCommit: featureSettings.enableMergeCommit,
          enableEmoji: featureSettings.enableEmoji,
          enableBody: featureSettings.enableBody,
          enableLayeredCommit: featureSettings.enableLayeredCommit,
          enableGlobalContext: featureSettings.enableGlobalContext,
        },
        commitMessage: {
          useRecentCommitsAsReference:
            featureSettings.useRecentCommitsAsReference,
          systemPrompt: undefined,
        },
        codeAnalysis: {
          diffTarget: featureSettings.diffTarget,
          autoDetectStaged: featureSettings.autoDetectStaged,
          fallbackToAll: featureSettings.fallbackToAll,
          simplifyDiff: featureSettings.simplifyDiff,
        },
        codeReview: {
          systemPrompt: undefined,
        },
        branchName: {
          systemPrompt: undefined,
        },
        weeklyReport: {
          systemPrompt: undefined,
        },
        prSummary: {
          systemPrompt: undefined,
          baseBranch: undefined,
          headBranch: undefined,
        },
      },
      preferences: profile.preferences,
    };

    this.logger.info(
      `最终配置 - Provider: ${provider}, Model: ${model}, FullConfig Keys: ${Object.keys(fullConfig).join(", ")}, ApiKey: ${fullConfig.apiKey ? "***" : "undefined"}`
    );

    return { provider, model, config: fullConfig };
  }

  /**
   * 验证模型可用性
   * 通过发起一个轻量级的AI调用来验证模型是否真实可用
   * @param provider - AI提供商
   * @param model - 模型ID
   */
  protected async verifyModelAvailability(
    provider: string,
    model: string,
    config?: any
  ): Promise<void> {
    const { ModelValidationService } =
      await import("@/services/core/model-validation-service");
    return ModelValidationService.verifyModelExists(
      provider,
      model,
      config,
      config
    );
  }

  /**
   * 检测并获取SCM提供程序。
   * 此方法将所有复杂的检测逻辑委托给 SCMDetectorService。
   * @param {vscode.SourceControlResourceState | vscode.SourceControlResourceState[] | string[] | undefined} resourcesOrFiles - 可选的资源状态、文件路径列表或字符串数组
   * @returns SCM提供程序实例和相关信息
   */
  protected async detectSCMProvider(
    resourcesOrFiles?:
      | vscode.SourceControlResourceState
      | vscode.SourceControlResourceState[]
      | string[]
  ) {
    return SCMDetectorService.detectSCMProvider(resourcesOrFiles);
  }

  /**
   * 获取提交信息
   * @param scmProvider - SCM提供程序实例
   * @returns 提交信息
   */
  protected async getCommitInput(scmProvider: any) {
    return await scmProvider.getCommitInput();
  }

  /**
   * Shows a confirmation dialog to the user regarding AI provider terms of service.
   * @returns A promise that resolves to true if the user accepts, false otherwise.
   */
  protected async showConfirmAIProviderToS(): Promise<boolean> {
    const confirmed =
      stateManager.getGlobal<boolean>(
        `${DISH_CONFIG_PREFIX}_confirm_ai_tos`,
        false
      ) ||
      stateManager.getWorkspace<boolean>(
        `${DISH_CONFIG_PREFIX}_confirm_ai_tos`,
        false
      );
    if (confirmed) {
      return true;
    }

    const acceptAlways: vscode.MessageItem = {
      title: getMessage("confirm.ai.provider.tos.accept"),
    };
    const acceptWorkspace: vscode.MessageItem = {
      title: getMessage("confirm.ai.provider.tos.acceptWorkspace"),
    };
    const cancel: vscode.MessageItem = {
      title: getMessage("confirm.ai.provider.tos.cancel"),
      isCloseAffordance: true,
    };

    const result = await notify.info(
      "confirm.ai.provider.tos.message",
      undefined,
      {
        modal: true,
        buttons: [acceptAlways.title, acceptWorkspace.title, cancel.title],
      }
    );

    if (result === acceptWorkspace.title) {
      void stateManager
        .setWorkspace(`${DISH_CONFIG_PREFIX}_confirm_ai_tos`, true)
        .catch();
      return true;
    }

    if (result === acceptAlways.title) {
      void stateManager
        .setGlobal(`${DISH_CONFIG_PREFIX}_confirm_ai_tos`, true)
        .catch();
      return true;
    }

    return false;
  }
  /**
   * 准备命令执行环境
   * 执行通用的前置检查：ToS确认、配置验证、SCM检测、模型验证
   * @param arg - 命令参数
   * @param options - 选项
   * @returns 命令上下文，如果检查失败返回undefined
   */
  protected async prepare(
    arg: any,
    options: {
      requireSelectedFiles?: boolean;
      validateModel?: boolean;
      progress?: vscode.Progress<{ message?: string; increment?: number }>;
    } = {}
  ): Promise<CommandContext | undefined> {
    // 1. 验证AI提供商服务条款
    if ((await this.showConfirmAIProviderToS()) === false) {
      this.logger.warn("User did not confirm AI provider ToS.");
      return;
    }

    // 2. 验证配置
    const profileManager = await ProfileManagerService.create(this.context);
    const activeProfileId = profileManager.getActiveProfileId();
    const profile = activeProfileId
      ? profileManager.getProfileById(activeProfileId)
      : null;

    if (!profile) {
      this.logger.error("prepare: Active profile not found", {
        operation: "prepare",
      });
      await notify.error(getMessage("profile.not.found"));
      return;
    }
    const featureSettings = profileManager.getFeatureSettings();

    const configResult = this.handleConfiguration(profile, featureSettings);
    if (!configResult) {
      this.logger.warn("Configuration is not valid.");
      return;
    }
    const { provider, model, config } = configResult;
    this.logger.debug("配置处理完成", {
      data: { provider, model, hasConfig: !!config },
    });
    // 验证模型可用性
    if (options.progress) {
      options.progress.report({
        message: getMessage("verifying.model.availability"),
      });
    }
    try {
      await this.verifyModelAvailability(provider, model, config);
    } catch (error) {
      this.logger.logError(
        error as Error,
        "Model availability verification failed",
        { data: { provider, model } }
      );
      await notify.error(getMessage("model.not.available"), [provider, model]);
      return;
    }

    // 3. 检测SCM和文件
    if (options.progress) {
      options.progress.report({
        message: getMessage("detecting.scm.provider"),
      });
    }

    const scmResult = await this.resolveSCMContext(arg);
    if (!scmResult) {
      this.logger.warn("SCM provider not detected.");
      return;
    }

    const { scmProvider, selectedFiles, repositoryPath } = scmResult;

    // 检查是否需要选中的文件
    if (
      options.requireSelectedFiles &&
      (!selectedFiles || selectedFiles.length === 0)
    ) {
      this.logger.warn("No files selected.");
      await notify.warn("no.changes.selected");
      return;
    }

    // 4. 验证模型 (可选) - 已移除，由ProfileManager保证配置有效性
    let aiContext: { aiProvider?: AIProvider; selectedModel?: AIModel } = {};
    if (options.validateModel) {
      // 模型验证逻辑已移除
      // 我们假设ProfileManager返回的配置是有效的，或者在执行时处理错误
      // 🔥 关键修复：传递 config 以确保 API key 等配置被正确传递
      const aiProvider = await AIProviderFactory.getProvider(provider, config);
      // 确保设置全局配置（包含 preferences 等）
      if (aiProvider && typeof aiProvider.setGlobalConfig === "function") {
        aiProvider.setGlobalConfig(config);
      }
      aiContext = {
        aiProvider,
        selectedModel: undefined, // 我们不再预先获取模型详情
      };
    }

    return {
      provider,
      model,
      providerConfig: config,
      scmProvider,
      selectedFiles,
      repositoryPath,
      ...aiContext,
    };
  }

  /**
   * 解析参数并获取SCM上下文
   * @param arg - 命令参数
   */
  protected async resolveSCMContext(arg: any): Promise<
    | {
        scmProvider: ISCMProvider;
        selectedFiles: string[] | undefined;
        repositoryPath: string | undefined;
      }
    | undefined
  > {
    // 1. 如果是SourceControl对象 (来自SCM标题菜单)
    if (arg && arg.rootUri && arg.id) {
      const repositoryPath = arg.rootUri.fsPath;
      const scmProvider = await SCMFactory.detectSCM(undefined, repositoryPath);
      if (!scmProvider) {
        await notify.error(getMessage("scm.not.detected"));
        return undefined;
      }
      return { scmProvider, selectedFiles: undefined, repositoryPath };
    }

    // 2. 委托给SCMDetectorService处理资源状态或undefined
    return SCMDetectorService.detectSCMProvider(arg);
  }

  /**
   * 执行命令
   * @param args - 命令参数
   */
  abstract execute(...args: any[]): Promise<void>;
}

/**
 * 命令执行上下文
 */
export interface CommandContext {
  provider: string;
  model: string;
  providerConfig?: any;
  scmProvider: ISCMProvider;
  selectedFiles?: string[];
  repositoryPath?: string;
  aiProvider?: AIProvider;
  selectedModel?: AIModel;
}
