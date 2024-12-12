import * as vscode from "vscode";
import { COMMANDS } from "./constants";
import { GenerateCommitCommand } from "./commands/GenerateCommitCommand";
import { SelectModelCommand } from "./commands/SelectModelCommand";
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
      console.log("COMMANDS.MODEL.SHOW", COMMANDS.MODEL.SHOW);

      this.disposables.push(
        vscode.commands.registerCommand(
          COMMANDS.COMMIT.GENERATE,
          async (...resources: vscode.SourceControlResourceState[]) => {
            try {
              await generateCommand.execute(resources);
            } catch (error) {
              NotificationHandler.error(
                "command.generate.failed",
                error instanceof Error ? error.message : String(error)
              );
            }
          }
        ),
        vscode.commands.registerCommand(COMMANDS.MODEL.SHOW, async () => {
          try {
            await selectModelCommand.execute();
          } catch (error) {
            console.log("error", error);
            NotificationHandler.error(
              "command.select.model.failed",
              error instanceof Error ? error.message : String(error)
            );
          }
        })
      );
    } catch (error) {
      NotificationHandler.error(
        "command.register.failed",
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
