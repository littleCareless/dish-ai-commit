import { GenerateBranchNameCommand } from "@/commands/generate-branch-name/generate-branch-name-command";
import { GenerateCommitCommand } from "@/commands/generate-commit/generate-commit-command";
import { GeneratePRSummaryCommand } from "@/commands/generate-pr-summary-command";
import { GenerateWeeklyReportCommand } from "@/commands/generate-weekly-report-command";
import { ReviewCodeCommand } from "@/commands/review-code-command";
import { COMMANDS } from "@/constants";
import { notify } from "@/utils";
import * as vscode from "vscode";

/**
 * 管理VS Code命令的注册和销毁
 * @implements {vscode.Disposable}
 */
import { ProfileManagerService } from "./services/profile-manager/profile-manager-service";
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
      const generateCommand = new GenerateCommitCommand(
        this.context,
        this.profileManager
      );
      const weeklyReportCommand = new GenerateWeeklyReportCommand(this.context);
      const reviewCodeCommand = new ReviewCodeCommand(this.context);
      const branchNameCommand = new GenerateBranchNameCommand(
        this.context,
        this.profileManager
      );
      const prSummaryCommand = new GeneratePRSummaryCommand(
        this.context,
        this.profileManager
      );

      this.disposables.push(
        // 注册生成commit信息命令
        vscode.commands.registerCommand(
          COMMANDS.COMMIT.GENERATE,
          async (...resources: vscode.SourceControlResourceState[]) => {
            try {
              await generateCommand.execute(resources);
            } catch (error) {
              // 处理commit生成失败
              notify.error("command.generate.failed", [
                error instanceof Error ? error.message : String(error),
              ]);
            }
          }
        ),
        // 注册周报生成命令
        vscode.commands.registerCommand(
          COMMANDS.WEEKLY_REPORT.GENERATE,
          async () => {
            try {
              await weeklyReportCommand.execute();
            } catch (error) {
              // 处理周报生成失败
              notify.error("command.weekly.report.failed", [
                error instanceof Error ? error.message : String(error),
              ]);
            }
          }
        ),
        // 注册代码审查命令
        vscode.commands.registerCommand(
          COMMANDS.CODE_REVIEW.REVIEW,
          async (...resources: vscode.SourceControlResourceState[]) => {
            try {
              await reviewCodeCommand.execute(resources);
            } catch (error) {
              // 处理代码审查失败
              notify.error("command.review.code.failed", [
                error instanceof Error ? error.message : String(error),
              ]);
            }
          }
        ),
        // 注册分支名称生成命令
        vscode.commands.registerCommand(
          COMMANDS.BRANCH_NAME.GENERATE,
          async (...resources: vscode.SourceControlResourceState[]) => {
            try {
              await branchNameCommand.execute(resources);
            } catch (error) {
              // 处理分支名称生成失败
              notify.error("command.branch.name.failed", [
                error instanceof Error ? error.message : String(error),
              ]);
            }
          }
        ),
        // 注册PR摘要生成命令
        vscode.commands.registerCommand(
          COMMANDS.PR_SUMMARY.GENERATE,
          async () => {
            try {
              await prSummaryCommand.execute();
            } catch (error) {
              // 处理PR摘要生成失败
              notify.error("command.pr.summary.failed", [
                error instanceof Error ? error.message : String(error),
              ]);
            }
          }
        )
      );
    } catch (error) {
      // 处理命令注册过程的整体失败
      notify.error("command.register.failed", [
        error instanceof Error ? error.message : String(error),
      ]);
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
