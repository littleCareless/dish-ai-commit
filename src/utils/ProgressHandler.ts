import * as vscode from 'vscode';
import { DISPLAY_NAME } from '../constants';

export class ProgressHandler {
    /**
     * 显示进度提示，直到任务完成
     */
    static async withProgress<T>(
        title: string,
        task: (
            progress: vscode.Progress<{ message?: string; increment?: number }>
        ) => Promise<T>
    ): Promise<T> {
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `[${DISPLAY_NAME}] ${title}`,
                cancellable: false
            },
            async (progress) => {
                progress.report({ increment: 0 });
                return await task(progress);
            }
        );
    }
}
