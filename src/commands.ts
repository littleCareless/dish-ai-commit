import * as vscode from "vscode";
import { COMMANDS } from "./constants";
import { GenerateCommitCommand } from "./commands/GenerateCommitCommand";
import { SelectModelCommand } from "./commands/SelectModelCommand";

export class CommandManager implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {
    this.registerCommands();
  }

  private registerCommands() {
    const generateCommand = new GenerateCommitCommand(this.context);
    const selectModelCommand = new SelectModelCommand(this.context);

    this.disposables.push(
      vscode.commands.registerCommand(
        COMMANDS.GENERATE,
        async (...resources: vscode.SourceControlResourceState[]) => {
          await generateCommand.execute(resources);
        }
      ),
      vscode.commands.registerCommand(
        "dish-ai-commit.selectModel",
        async () => {
          await selectModelCommand.execute();
        }
      )
    );
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
