import * as vscode from "vscode";
import { NotificationHandler } from "../utils/NotificationHandler";
import { ConfigurationManager } from "../config/ConfigurationManager";

export abstract class BaseCommand {
  constructor(protected readonly context: vscode.ExtensionContext) {}

  protected async validateConfig(): Promise<boolean> {
    if (!(await ConfigurationManager.getInstance().validateConfiguration())) {
      await NotificationHandler.error("command.execution.failed");
      return false;
    }
    return true;
  }

  abstract execute(...args: any[]): Promise<void>;
}
