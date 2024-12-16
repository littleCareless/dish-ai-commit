import * as vscode from "vscode";
import { COMMANDS } from "./constants";
import { GenerateCommitCommand } from "./commands/GenerateCommitCommand";
import { SelectModelCommand } from "./commands/SelectModelCommand";
import { GenerateWeeklyReportCommand } from "./commands/GenerateWeeklyReportCommand";
import { NotificationHandler } from "./utils/NotificationHandler";

export class CommandManager implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {
    this.registerCommands();
  }

  private registerCommands() {
    try {
      const generateCommand = new GenerateCommitCommand(this.context);
      const selectModelCommand = new SelectModelCommand(this.context);
      const weeklyReportCommand = new GenerateWeeklyReportCommand(this.context);

      this.disposables.push(
        vscode.commands.registerCommand(
          COMMANDS.COMMIT.GENERATE,
          async (...resources: vscode.SourceControlResourceState[]) => {
            try {
              await generateCommand.execute(resources);
            } catch (error) {
              NotificationHandler.error(
                "command.generate.failed",
                3000,
                error instanceof Error ? error.message : String(error)
              );
            }
          }
        ),
        vscode.commands.registerCommand(COMMANDS.MODEL.SHOW, async () => {
          try {
            await selectModelCommand.execute();
          } catch (error) {
            NotificationHandler.error(
              "command.select.model.failed",
              3000,
              error instanceof Error ? error.message : String(error)
            );
          }
        }),
        vscode.commands.registerCommand(
          COMMANDS.WEEKLY_REPORT.GENERATE,
          async () => {
            try {
              await weeklyReportCommand.execute();
            } catch (error) {
              NotificationHandler.error(
                "command.weekly.report.failed",
                3000,
                error instanceof Error ? error.message : String(error)
              );
            }
          }
        )
      );
    } catch (error) {
      NotificationHandler.error(
        "command.register.failed",
        3000,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}

export function registerCommands(context: vscode.ExtensionContext) {
  const commandManager = new CommandManager(context);
  context.subscriptions.push(commandManager);
}
