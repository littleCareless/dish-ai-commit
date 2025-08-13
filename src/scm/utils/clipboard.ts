import * as vscode from "vscode";
import { notify } from "../../utils/notification/notification-manager";
import { SCMErrorHandler } from "./error-handler";

/**
 * 统一剪贴板工具
 */
export class SCMClipboard {
  /**
   * 复制文本到剪贴板
   */
  static async copy(message: string): Promise<void> {
    try {
      await vscode.env.clipboard.writeText(message);
      notify.info("commit.message.copied");
    } catch (error) {
      SCMErrorHandler.handleClipboardError(message, error);
    }
  }
}


