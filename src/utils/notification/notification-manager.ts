import * as vscode from "vscode";
import { NotificationType, NotificationConfig } from "./notification-types";
import { formatMessage } from "../i18n/localization-manager";

// 常量配置
const DEFAULT_TIMEOUT = 3000;
const MIN_TIMEOUT = 1000;
const MAX_TIMEOUT = 10000;

// 类型定义
type NotificationItem = {
  type: NotificationType;
  messageKey: string;
  args?: any[];
  options?: NotificationOptions;
};

interface NotificationOptions extends vscode.MessageOptions {
  timeout?: number;
  buttons?: Array<string>; // 改为只接受字符串数组
  buttonHandlers?: Record<string, () => void>; // 新增处理函数映射
  priority?: number;
}

// 验证函数
const validateTimeout = (timeout?: number): void => {
  if (timeout && (timeout < MIN_TIMEOUT || timeout > MAX_TIMEOUT)) {
    throw new Error(
      `Timeout must be between ${MIN_TIMEOUT} and ${MAX_TIMEOUT}`
    );
  }
};

const validateButtons = (options?: NotificationOptions): void => {
  if (!options?.buttons) {
    return;
  }
  if (!Array.isArray(options.buttons)) {
    throw new Error("Buttons must be an array of strings");
  }
  if (options.buttonHandlers) {
    const invalidHandler = Object.entries(options.buttonHandlers).find(
      ([key, handler]) =>
        !options.buttons?.includes(key) || typeof handler !== "function"
    );
    if (invalidHandler) {
      throw new Error("Invalid button handler configuration");
    }
  }
};

// 纯函数: 验证选项
const validateOptions = (options?: NotificationOptions): void => {
  if (!options) {
    return;
  }
  validateTimeout(options.timeout);
  validateButtons(options);
};

// 纯函数: 获取通知函数
const getNotifyFunction = (type: NotificationType) => {
  const fns = {
    info: vscode.window.showInformationMessage,
    warn: vscode.window.showWarningMessage,
    error: vscode.window.showErrorMessage,
  };
  return fns[type];
};

// 副作用函数: 显示单个通知
const showNotification = async (
  type: NotificationType,
  messageKey: string,
  args?: any[],
  options?: NotificationOptions
): Promise<string | undefined> => {
  try {
    validateOptions(options);

    const message = formatMessage(messageKey, args);
    const notifyFn = getNotifyFunction(type);

    // If buttons are present, timeout is ignored because programmatically closing notifications with buttons is not supported by the VS Code API.
    const hasButtons = options?.buttons && options.buttons.length > 0;
    const effectiveTimeout = hasButtons ? undefined : options?.timeout;

    const notificationPromise = notifyFn(
      message,
      { modal: options?.modal },
      ...(options?.buttons || [])
    );

    let result: string | undefined | symbol;
    let timeoutId: NodeJS.Timeout | undefined;

    if (effectiveTimeout) {
      const timeoutMarker = Symbol("timeout");
      const timeoutPromise = new Promise<symbol>((resolve) => {
        timeoutId = setTimeout(() => resolve(timeoutMarker), effectiveTimeout);
      });
      result = await Promise.race([notificationPromise, timeoutPromise]);
    } else {
      result = await notificationPromise;
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (typeof result === "symbol") {
      // Timeout occurred. The notification will disappear on its own as it has no buttons.
      return undefined;
    }

    // User interacted.
    if (result && options?.buttonHandlers) {
      const handler = options.buttonHandlers[result];
      handler?.();
    }

    return result;
  } catch (error) {
    console.error(`Failed to show ${type} notification:`, error);
    return undefined;
  }
};

// Notify接口定义
interface INotify {
  add: (item: NotificationItem) => Promise<string | undefined>;
  info: (
    messageKey: string,
    args?: any[],
    options?: NotificationOptions
  ) => Promise<string | undefined>;
  warn: (
    messageKey: string,
    args?: any[],
    options?: NotificationOptions
  ) => Promise<string | undefined>;
  error: (
    messageKey: string,
    args?: any[],
    options?: NotificationOptions
  ) => Promise<string | undefined>;
  confirm: (
    messageKey: string,
    onYes: () => void,
    onNo?: () => void
  ) => Promise<string | undefined>;
  prompt: (
    messageKey: string,
    ...actions: Array<{ title: string; handler: () => void }>
  ) => void;
}

// 导出的函数接口使用显式类型
export const notify: INotify = {
  // 基础通知方法
  add: (item: NotificationItem) =>
    showNotification(item.type, item.messageKey, item.args, item.options),

  info: (messageKey: string, args?: any[], options?: NotificationOptions) =>
    notify.add({
      type: "info",
      messageKey,
      args,
      options: { timeout: DEFAULT_TIMEOUT, ...options },
    }),

  warn: (messageKey: string, args?: any[], options?: NotificationOptions) =>
    notify.add({
      type: "warn",
      messageKey,
      args,
      options: { timeout: DEFAULT_TIMEOUT, ...options },
    }),

  error: (messageKey: string, args?: any[], options?: NotificationOptions) =>
    notify.add({
      type: "error",
      messageKey,
      args,
      options: { timeout: DEFAULT_TIMEOUT, ...options },
    }),

  // 快捷方法
  confirm: (messageKey: string, onYes: () => void, onNo?: () => void) =>
    notify.add({
      type: "info",
      messageKey,
      options: {
        buttons: ["Yes", "No"],
        buttonHandlers: {
          Yes: onYes,
          No: onNo || (() => {}),
        },
      },
    }),

  prompt: (
    messageKey: string,
    ...actions: Array<{ title: string; handler: () => void }>
  ) =>
    notify.add({
      type: "info",
      messageKey,
      options: {
        buttons: actions.map((a) => a.title),
        buttonHandlers: Object.fromEntries(
          actions.map((a) => [a.title, a.handler])
        ),
      },
    }),
};

// Progress相关保持不变
export async function withProgress<T>(
  title: string,
  task: (
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken
  ) => Promise<T>,
  options: {
    cancellable?: boolean;
    location?: vscode.ProgressLocation;
  } = {}
): Promise<T> {
  return vscode.window.withProgress(
    {
      location: options.location || vscode.ProgressLocation.Notification,
      title,
      cancellable: options.cancellable ?? true,
    },
    async (progress, token) => {
      try {
        return await task(progress, token);
      } catch (error) {
        console.error("Progress task failed:", error);
        const message = error instanceof Error ? error.message : String(error);
        await notify.error("progress.failed", [message]);
        throw error;
      }
    }
  );
}
