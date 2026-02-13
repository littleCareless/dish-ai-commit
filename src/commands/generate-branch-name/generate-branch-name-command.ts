import { BaseCommand } from "@/commands/base-command";
import { ChangesModeHandler } from "@/commands/generate-branch-name/handlers/changes-mode-handler";
import { DescriptionModeHandler } from "@/commands/generate-branch-name/handlers/description-mode-handler";
import { BranchSuggester } from "@/commands/generate-branch-name/services/branch-suggester";
import { ProfileManagerService } from "@/services/profile-manager/profile-manager-service";
import { PreferencesSettingsManager } from "@/services/settings/preferences-settings-manager";
import { getMessage } from "@/utils/i18n";
import { notify, withProgress } from "@/utils/notification/notification-manager";
import * as vscode from "vscode";

/**
 * 分支名称生成命令类 - 重构后的精简版本
 * 只负责命令入口和基本验证，具体执行委托给处理器和服务
 */
export class GenerateBranchNameCommand extends BaseCommand {
  private descriptionHandler: DescriptionModeHandler;
  private changesHandler: ChangesModeHandler;
  private branchSuggester: BranchSuggester;

  /**
   * 创建命令实例
   * @param context - VSCode扩展上下文
   */
  constructor(
    context: vscode.ExtensionContext,
    private readonly profileManager: ProfileManagerService
  ) {
    super(context);
    this.descriptionHandler = new DescriptionModeHandler(this.logger);
    this.changesHandler = new ChangesModeHandler(this.logger);
    this.branchSuggester = new BranchSuggester(this.logger);
  }

  /**
   * 执行分支名称生成命令
   * @param resources - 源代码管理资源状态列表，代表需要分析的文件
   * @returns {Promise<void>}
   */
  async execute(
    resources?: vscode.SourceControlResourceState[]
  ): Promise<void> {
    this.logger.info("Executing GenerateBranchNameCommand...");

    try {
      await withProgress(
        getMessage("generating.branch.name"),
        async (progress) => {
          // 使用 prepare 方法进行前置检查
          const context = await this.prepare(resources, {
            requireSelectedFiles: false, // 分支生成可能基于描述，不一定需要文件
            validateModel: true,
            progress,
          });

          if (!context) {
            return;
          }

          const { aiProvider, selectedModel } = context;

          // Get configuration from profile and preferences
          const featureSettings = this.profileManager.getFeatureSettings();
          const preferences =
            PreferencesSettingsManager.getInstance().getSettings();
          const configuration = {
            base: { language: preferences.language },
            features: featureSettings,
          };

          this.logger.info(
            `Model validated. AI Provider: ${aiProvider?.getId()}, Model: ${
              selectedModel?.id
            }`
          );

          // 步骤3: 自动执行生成逻辑（优先基于代码变更，必要时回退到描述模式）
          const branchName = await this.executeBranchGeneration(
            aiProvider,
            selectedModel,
            configuration,
            resources
          );

          if (branchName) {
            // 步骤5: 显示分支名称建议
            progress.report({
              increment: 25,
              message: getMessage("preparing.results"),
            });

            await this.branchSuggester.showBranchNameSuggestion(
              branchName,
              featureSettings.branchNamePostAction,
              featureSettings.branchNameSelectionMode,
              featureSettings.branchCreationFailureAction
            );
          }

          progress.report({
            increment: 100,
          });
        }
      );
    } catch (error) {
      this.logger.error("GenerateBranchNameCommand error");
      await this.handleError(error, "branch.name.generation.failed");
    }
  }

  /**
   * 执行分支名称生成
   * @param aiProvider - AI 提供程序
   * @param model - 选中的模型
   * @param configuration - 配置对象
   * @param resources - 资源列表
   * @returns {Promise<string | undefined>} 生成的分支名称
   */
  private async executeBranchGeneration(
    aiProvider: any,
    model: any,
    configuration: any,
    resources?: vscode.SourceControlResourceState[]
  ): Promise<string | undefined> {
    // 优先使用代码变更模式，减少额外选择步骤
    const result = await this.changesHandler.handle(
      resources,
      aiProvider,
      model,
      configuration,
      (files: any) => this.detectSCMProvider(files)
    );

    if (result?.branchName) {
      this.logger.info("Branch name generated from code changes.");
      return result.branchName;
    }

    // 在没有传入资源时才回退到描述模式，避免对 SCM 入口场景增加输入负担
    if (!resources || resources.length === 0) {
      const continueByDescription = getMessage(
        "branch.gen.mode.from.description.label"
      );
      const action = await notify.info("branch.description.fallback.suggested", [], {
        buttons: [continueByDescription],
      });
      if (action !== continueByDescription) {
        this.logger.info(
          "Skipped description fallback because user did not opt in."
        );
        return undefined;
      }

      this.logger.info(
        "Falling back to description mode after changes-based generation."
      );
      return await this.descriptionHandler.handle(
        aiProvider,
        model,
        configuration
      );
    }

    return undefined;
  }
}
