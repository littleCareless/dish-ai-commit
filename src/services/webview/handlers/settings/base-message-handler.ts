import { UIRequestMessage } from "@shared/types/messages";
import * as vscode from "vscode";

export abstract class BaseMessageHandler {
  constructor(protected readonly extensionContext: vscode.ExtensionContext) {}

  public abstract handle(
    message: UIRequestMessage,
    webview: vscode.Webview
  ): Promise<void>;
}
