import { GenerateBranchNameCommand } from "@/commands/generate-branch-name/generate-branch-name-command";
import { GenerateCommitCommand } from "@/commands/generate-commit/generate-commit-command";
import { GeneratePRSummaryCommand } from "@/commands/generate-pr-summary-command";
import { GenerateWeeklyReportCommand } from "@/commands/generate-weekly-report-command";
import { ReviewCodeCommand } from "@/commands/review-code-command";
import { SyncModelCatalogCommand } from "@/commands/sync-model-catalog-command";
import { COMMANDS } from "@/constants";
import { notify } from "@/utils";
import * as vscode from "vscode";

/**
 * 管理VS Code命令的注册和销毁
 * @implements {vscode.Disposable}
 */
import { ProfileManagerService } from "./services/profile-manager/profile-manager-service";

export type CommandExecutionResult =
  | { success: true }
  | { success: false; error: string };

export class CommandManager implements vscode.Disposable {
  /** 存储所有已注册命令的disposal tokens */
  private disposables: vscode.Disposable[] = [];

  /**
   * 创建新的命令管理器实例
   * @param {vscode.ExtensionContext} context - VS Code扩展上下文
   */
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly profileManager: ProfileManagerService
  ) {
    this.registerCommands();
  }

  /**
   * 注册所有扩展命令到VS Code
   * @private
   * @throws {Error} 如果命令注册失败
   */
  private registerCommands() {
    try {
      // 初始化各个命令处理器
      const generateCommand = new GenerateCommitCommand(this.context);
      const weeklyReportCommand = new GenerateWeeklyReportCommand(this.context);
      const reviewCodeCommand = new ReviewCodeCommand(this.context);
      const branchNameCommand = new GenerateBranchNameCommand(
        this.context,
        this.profileManager
      );
      const prSummaryCommand = new GeneratePRSummaryCommand(this.context);
      const syncModelCatalogCommand = new SyncModelCatalogCommand(this.context);

      this.disposables.push(
        // 注册生成commit信息命令
        vscode.commands.registerCommand(
          COMMANDS.COMMIT.GENERATE,
          async (...args: any[]) =>
            this.executeCommandWithStatus(
              () => generateCommand.execute(...args),
              "command.generate.failed",
              { notifyOnError: false },
            )
        ),
        // 注册周报生成命令
        vscode.commands.registerCommand(
          COMMANDS.WEEKLY_REPORT.GENERATE,
          async () =>
            this.executeCommandWithStatus(
              () => weeklyReportCommand.execute(),
              "command.weekly.report.failed"
            )
        ),
        // 注册代码审查命令
        vscode.commands.registerCommand(
          COMMANDS.CODE_REVIEW.REVIEW,
          async (...resources: vscode.SourceControlResourceState[]) =>
            this.executeCommandWithStatus(
              () => reviewCodeCommand.execute(resources),
              "command.review.code.failed"
            )
        ),
        // 注册分支名称生成命令
        vscode.commands.registerCommand(
          COMMANDS.BRANCH_NAME.GENERATE,
          async (...resources: vscode.SourceControlResourceState[]) =>
            this.executeCommandWithStatus(
              () => branchNameCommand.execute(resources),
              "command.branch.name.failed"
            )
        ),
        // 注册PR摘要生成命令
        vscode.commands.registerCommand(
          COMMANDS.PR_SUMMARY.GENERATE,
          async (...args: any[]) =>
            this.executeCommandWithStatus(
              () => prSummaryCommand.execute(args),
              "command.pr.summary.failed"
            )
        ),
        // 注册模型目录同步命令
        vscode.commands.registerCommand(
          COMMANDS.MODEL_CATALOG.SYNC,
          async () =>
            this.executeCommandWithStatus(
              () => syncModelCatalogCommand.execute(),
              "model.catalog.sync.failed"
            )
        )
      );
    } catch (error) {
      // 处理命令注册过程的整体失败
      notify.error("command.register.failed", [
        error instanceof Error ? error.message : String(error),
      ]);
    }
  }

  private async executeCommandWithStatus(
    commandExecutor: () => Promise<void>,
    errorKey: string,
    options: {
      notifyOnError?: boolean;
    } = {},
  ): Promise<CommandExecutionResult> {
    const notifyOnError = options.notifyOnError ?? true;

    try {
      await commandExecutor();
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (notifyOnError) {
        notify.error(errorKey, [errorMessage]);
      }
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 销毁所有注册的命令
   * 实现vscode.Disposable接口
   */
  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}

/**
 * 为扩展注册所有命令
 * @param {vscode.ExtensionContext} context - VS Code扩展上下文
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  profileManager: ProfileManagerService
) {
  const commandManager = new CommandManager(context, profileManager);
  context.subscriptions.push(commandManager);
}
