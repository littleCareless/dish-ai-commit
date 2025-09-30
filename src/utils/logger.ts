import * as vscode from "vscode";

/**
 * A logger class that writes to a VS Code LogOutputChannel.
 * This utilizes the native logging capabilities of VS Code for different log levels.
 */
export class Logger {
  private static _instance: Logger;
  private readonly _outputChannel: vscode.LogOutputChannel;

  private constructor(channelName: string) {
    this._outputChannel = vscode.window.createOutputChannel(channelName, {
      log: true,
    });
  }

  public static getInstance(channelName: string): Logger {
    if (!Logger._instance) {
      Logger._instance = new Logger(channelName);
    }
    return Logger._instance;
  }

  /**
   * Appends a message with a 'Trace' level.
   * Use for detailed debugging information.
   * @param message The message to log.
   */
  public trace(message: string): void {
    this._outputChannel.trace(message);
  }

  /**
   * Appends a message with a 'Debug' level.
   * Use for debugging information.
   * @param message The message to log.
   */
  public debug(message: string): void {
    this._outputChannel.debug(message);
  }

  /**
   * Appends a message with an 'Info' level.
   * This is the general-purpose log method.
   * @param message The message to log.
   */
  public log(message: string): void {
    this._outputChannel.info(message);
  }

  /**
   * Appends a message with an 'Info' level.
   * @param message The message to log.
   */
  public info(message: string): void {
    this._outputChannel.info(message);
  }

  /**
   * Appends a message with a 'Warning' level.
   * @param message The message to log.
   */
  public warn(message: string): void {
    this._outputChannel.warn(message);
  }

  /**
   * Appends a message with an 'Error' level.
   * @param message The message or Error object to log.
   */
  public error(message: string | Error): void {
    this._outputChannel.error(message);
  }

  /**
   * Reveals the output channel in the UI.
   */
  public show(): void {
    this._outputChannel.show();
  }

  /**
   * Hides the output channel from the UI.
   */
  public hide(): void {
    this._outputChannel.hide();
  }

  /**
   * Clears the output channel.
   */
  public clear(): void {
    this._outputChannel.clear();
  }

  /**
   * Disposes the output channel.
   */
  public dispose(): void {
    this._outputChannel.dispose();
  }
}
