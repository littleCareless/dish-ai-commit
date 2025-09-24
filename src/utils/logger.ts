import * as vscode from 'vscode';

/**
 * A logger class that writes to a VS Code output channel.
 */
export class Logger {
  private static _instance: Logger;
  private readonly _outputChannel: vscode.OutputChannel;

  private constructor(channelName: string) {
    this._outputChannel = vscode.window.createOutputChannel(channelName);
  }

  public static getInstance(channelName: string): Logger {
    if (!Logger._instance) {
      Logger._instance = new Logger(channelName);
    }
    return Logger._instance;
  }

  private getFormattedMessage(message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${message}`;
  }

  public log(message: string): void {
    this._outputChannel.appendLine(this.getFormattedMessage(message));
  }

  public info(message: string): void {
    this.log(`[INFO] ${message}`);
  }

  public warn(message: string): void {
    this.log(`[WARN] ${message}`);
  }

  public error(message: string): void {
    this.log(`[ERROR] ${message}`);
  }

  public show(): void {
    this._outputChannel.show();
  }

  public hide(): void {
    this._outputChannel.hide();
  }

  public clear(): void {
    this._outputChannel.clear();
  }

  public dispose(): void {
    this._outputChannel.dispose();
  }
}