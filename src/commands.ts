import * as vscode from "vscode";
import { COMMANDS } from "./constants";
import { GenerateCommitCommand } from "./commands/GenerateCommitCommand";
import { SelectModelCommand } from "./commands/SelectModelCommand";
import { GenerateWeeklyReportCommand } from "./commands/GenerateWeeklyReportCommand";
import { ReviewCodeCommand } from "./commands/ReviewCodeCommand";
import { NotificationHandler } from "./utils/NotificationHandler";

/**
 * 管理VS Code命令的注册和销毁
 * @implements {vscode.Disposable}
 */
export class CommandManager implements vscode.Disposable {
  /** 存储所有已注册命令的disposal tokens */
  private disposables: vscode.Disposable[] = [];

  /**
   * 创建新的命令管理器实例
   * @param {vscode.ExtensionContext} context - VS Code扩展上下文
   */
  constructor(private readonly context: vscode.ExtensionContext) {
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
      const selectModelCommand = new SelectModelCommand(this.context);
      const weeklyReportCommand = new GenerateWeeklyReportCommand(this.context);
      const reviewCodeCommand = new ReviewCodeCommand(this.context);

      this.disposables.push(
        // 注册生成commit信息命令
        vscode.commands.registerCommand(
          COMMANDS.COMMIT.GENERATE,
          async (...resources: vscode.SourceControlResourceState[]) => {
            try {
              await generateCommand.execute(resources);
            } catch (error) {
              // 处理commit生成失败
              NotificationHandler.error(
                "command.generate.failed",
                3000,
                error instanceof Error ? error.message : String(error)
              );
            }
          }
        ),
        // 注册模型选择命令
        vscode.commands.registerCommand(COMMANDS.MODEL.SHOW, async () => {
          try {
            await selectModelCommand.execute();
          } catch (error) {
            // 处理模型选择失败
            NotificationHandler.error(
              "command.select.model.failed",
              3000,
              error instanceof Error ? error.message : String(error)
            );
          }
        }),
        // 注册周报生成命令
        vscode.commands.registerCommand(
          COMMANDS.WEEKLY_REPORT.GENERATE,
          async () => {
            try {
              await weeklyReportCommand.execute();
            } catch (error) {
              // 处理周报生成失败
              NotificationHandler.error(
                "command.weekly.report.failed",
                3000,
                error instanceof Error ? error.message : String(error)
              );
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
              NotificationHandler.error(
                "command.review.code.failed",
                3000,
                error instanceof Error ? error.message : String(error)
              );
            }
          }
        )
      );
    } catch (error) {
      // 处理命令注册过程的整体失败
      NotificationHandler.error(
        "command.register.failed",
        3000,
        error instanceof Error ? error.message : String(error)
      );
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
export function registerCommands(context: vscode.ExtensionContext) {
  const commandManager = new CommandManager(context);
  context.subscriptions.push(commandManager);
}
