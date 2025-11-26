import { BaseCommand } from "@/commands/base-command";
import { ChangesModeHandler } from "@/commands/generate-branch-name/handlers/changes-mode-handler";
import { DescriptionModeHandler } from "@/commands/generate-branch-name/handlers/description-mode-handler";
import { BranchSuggester } from "@/commands/generate-branch-name/services/branch-suggester";
import { getMessage } from "@/utils/i18n";
import {
  withProgress
} from "@/utils/notification/notification-manager";
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
  constructor(context: vscode.ExtensionContext) {
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
          const { configuration } = this.getExtConfig();

          this.logger.info(
            `Model validated. AI Provider: ${aiProvider?.getId()}, Model: ${selectedModel?.id
            }`
          );

          // 步骤3: 选择生成模式
          const generationMode = await this.selectGenerationMode();
          if (!generationMode) {
            this.logger.info("User cancelled branch name generation mode selection.");
            return;
          }

          // 步骤4: 执行对应的生成逻辑
          const branchName = await this.executeBranchGeneration(
            generationMode,
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

            await this.branchSuggester.showBranchNameSuggestion(branchName);
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
   * 选择生成模式
   * @returns {Promise<any>} 选中的生成模式
   */
  private async selectGenerationMode(): Promise<any> {
    const generationMode = await vscode.window.showQuickPick(
      [
        {
          label: getMessage("branch.gen.mode.from.changes.label"),
          description: getMessage("branch.gen.mode.from.changes.description"),
          detail: getMessage("branch.gen.mode.from.changes.detail"),
        },
        {
          label: getMessage("branch.gen.mode.from.description.label"),
          description: getMessage("branch.gen.mode.from.description.description"),
          detail: getMessage("branch.gen.mode.from.description.detail"),
        },
      ],
      {
        placeHolder: getMessage("branch.gen.mode.select.placeholder"),
        ignoreFocusOut: true,
      }
    );

    if (generationMode) {
      this.logger.info(`User selected generation mode: ${generationMode.label}`);
    }

    return generationMode;
  }

  /**
   * 执行分支名称生成
   * @param generationMode - 生成模式
   * @param aiProvider - AI 提供程序
   * @param model - 选中的模型
   * @param configuration - 配置对象
   * @param resources - 资源列表
   * @returns {Promise<string | undefined>} 生成的分支名称
   */
  private async executeBranchGeneration(
    generationMode: any,
    aiProvider: any,
    model: any,
    configuration: any,
    resources?: vscode.SourceControlResourceState[]
  ): Promise<string | undefined> {
    if (
      generationMode.label === getMessage("branch.gen.mode.from.description.label")
    ) {
      // 描述模式
      return await this.descriptionHandler.handle(
        aiProvider,
        model,
        configuration
      );
    } else {
      // 代码变更模式
      const result = await this.changesHandler.handle(
        resources,
        aiProvider,
        model,
        configuration,
        (files: any) => this.detectSCMProvider(files)
      );

      return result?.branchName;
    }
  }
}
