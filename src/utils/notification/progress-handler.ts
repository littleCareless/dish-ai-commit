import * as vscode from "vscode";
import { DISPLAY_NAME } from "../../constants";

/**
 * 处理 VSCode 进度提示的工具类
 */
export class ProgressHandler {
  /**
   * 显示进度提示,直到指定任务完成
   * @param title 进度提示的标题
   * @param task 需要执行的异步任务,接收进度对象和取消令牌
   * @returns 任务执行的结果
   * @throws 当任务执行失败时抛出错误
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
        location: vscode.ProgressLocation.Notification, // 在通知区域显示进度
        // ${DISPLAY_NAME}
        title: `[Dish]: ${title}`, // 添加插件名称作为前缀
        cancellable: true, // 允许用户取消任务
      },
      async (progress, token) => {
        try {
          return await task(progress, token);
        } catch (error) {
          console.error(`Progress task failed:`, error);
          throw error; // 重新抛出错误以便上层处理
        }
      }
    );
  }
}
