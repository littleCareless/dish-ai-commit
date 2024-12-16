import * as vscode from "vscode";
import { NotificationHandler } from "../utils/NotificationHandler";
import { ConfigurationManager } from "../config/ConfigurationManager";
import { LocalizationManager } from "../utils/LocalizationManager";

export abstract class BaseCommand {
  protected context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  protected async validateConfig(): Promise<boolean> {
    // if (!(await ConfigurationManager.getInstance().validateConfiguration())) {
    //   NotificationHandler.error("command.execution.failed");
    //   return false;
    // }
    return true;
  }

  protected async handleError(
    error: unknown,
    errorMessage: string
  ): Promise<void> {
    console.error(errorMessage, error);
    if (error instanceof Error) {
      NotificationHandler.error(
        LocalizationManager.getInstance().format(errorMessage, error.message)
      );
    }
  }

  abstract execute(...args: any[]): Promise<void>;
}
