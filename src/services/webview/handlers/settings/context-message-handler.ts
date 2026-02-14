import { ContextInspectorService } from "@/services/context-inspector-service";
import { BaseMessageHandler } from "@/services/webview/handlers/settings/base-message-handler";
import {
  ContextRebuildPreviewRequest,
  ExtensionResponse,
  UIRequest,
  UIRequestMessage,
} from "@shared/types/messages";
import * as vscode from "vscode";

export class ContextMessageHandler extends BaseMessageHandler {
  private readonly contextInspectorService = ContextInspectorService.getInstance();

  constructor(extensionContext: vscode.ExtensionContext) {
    super(extensionContext);
  }

  public async handle(
    message: UIRequestMessage,
    webview: vscode.Webview,
  ): Promise<void> {
    switch (message.command) {
      case UIRequest.ContextGetLatest: {
        await webview.postMessage({
          command: ExtensionResponse.ContextLatestLoaded,
          data: this.contextInspectorService.getLatestPreview(),
        });
        break;
      }

      case UIRequest.ContextRebuildPreview: {
        const payload = (message.data || {}) as ContextRebuildPreviewRequest;
        const exclude = Array.isArray(payload.exclude) ? payload.exclude : [];
        await webview.postMessage({
          command: ExtensionResponse.ContextPreviewUpdated,
          data: this.contextInspectorService.rebuildPreview(exclude),
        });
        break;
      }
    }
  }
}
