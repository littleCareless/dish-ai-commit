export type DragDropLogLevel = "info" | "warn" | "error" | "success";

const LOG_PREFIX = "[CommitChat DragDrop]";
const LEVEL_TO_CONSOLE: Record<DragDropLogLevel, "log" | "warn" | "error" | "info"> = {
  info: "info",
  warn: "warn",
  error: "error",
  success: "log",
};

export class DragDropDebugger {
  private static debugEnabled: boolean | null = null;

  static setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled;
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem("commit-chat-drag-debug", String(enabled));
      } catch {
        // 忽略本地存储异常
      }
    }
  }

  private static isDebugEnabled(): boolean {
    if (this.debugEnabled !== null) {
      return this.debugEnabled;
    }

    if (typeof window === "undefined" || !window.localStorage) {
      this.debugEnabled = false;
      return this.debugEnabled;
    }

    try {
      this.debugEnabled = window.localStorage.getItem("commit-chat-drag-debug") === "true";
    } catch {
      this.debugEnabled = false;
    }

    return this.debugEnabled;
  }

  private static shouldLog(level: DragDropLogLevel): boolean {
    if (level === "error" || level === "warn") {
      return true;
    }

    return this.isDebugEnabled();
  }

  static log(level: DragDropLogLevel, message: string, details?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const consoleMethod = LEVEL_TO_CONSOLE[level];
    const payload = `${LOG_PREFIX} [${level.toUpperCase()}] ${message}`;
    const logger = (console[consoleMethod] as (...args: unknown[]) => void) ?? console.log;

    if (details) {
      logger.call(console, payload, details);
    } else {
      logger.call(console, payload);
    }
  }
}
