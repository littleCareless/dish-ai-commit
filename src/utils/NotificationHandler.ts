import * as vscode from 'vscode';
import { DISPLAY_NAME } from '../constants';

/**
 * 提供通用的通知功能
 */
export class NotificationHandler {
    /**
     * 显示信息通知
     */
    static info(message: string, ...items: string[]): Thenable<string | undefined> {
        return vscode.window.showInformationMessage(`[${DISPLAY_NAME}] ${message}`, ...items);
    }

    /**
     * 显示警告通知
     */
    static warn(message: string, ...items: string[]): Thenable<string | undefined> {
        return vscode.window.showWarningMessage(`[${DISPLAY_NAME}] ${message}`, ...items);
    }

    /**
     * 显示错误通知
     */
    static error(message: string, ...items: string[]): Thenable<string | undefined> {
        return vscode.window.showErrorMessage(`[${DISPLAY_NAME}] ${message}`, ...items);
    }
}