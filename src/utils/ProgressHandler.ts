import * as vscode from "vscode";
import { DISPLAY_NAME } from "../constants";

export class ProgressHandler {
  /**
   * 显示进度提示，直到任务完成
   */
  static async withProgress<T>(
    title: string,
    task: (
      progress: vscode.Progress<{ message?: string; increment?: number }>,
      token: vscode.CancellationToken
    ) => Promise<T>
  ): Promise<T> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `[${DISPLAY_NAME}]: ${title}`,
        cancellable: true,
      },
      async (progress, token) => {
        try {
          return await task(progress, token);
        } catch (error) {
          console.error(`Progress task failed:`, error);
          throw error;
        }
      }
    );
  }
}
