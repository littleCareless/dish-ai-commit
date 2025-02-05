import * as vscode from "vscode";
import { NotificationType, NotificationConfig } from "./NotificationTypes";
import { formatMessage } from "../i18n/LocalizationManager";

// 常量配置
const DEFAULT_TIMEOUT = 3000;
const MIN_TIMEOUT = 1000;
const MAX_TIMEOUT = 10000;
const MAX_CONCURRENT = 3;

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

// 纯函数: 按优先级排序
const sortByPriority = (items: NotificationItem[]): NotificationItem[] =>
  [...items].sort(
    (a, b) => (b.options?.priority || 0) - (a.options?.priority || 0)
  );

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
): Promise<void> => {
  try {
    validateOptions(options);

    const message = formatMessage(messageKey, args);
    const notifyFn = getNotifyFunction(type);

    // 直接使用字符串数组作为按钮
    const result = await notifyFn(
      message,
      { modal: options?.modal },
      ...(options?.buttons || [])
    );

    // 执行对应的处理函数
    if (result && options?.buttonHandlers) {
      const handler = options.buttonHandlers[result];
      handler?.();
    }

    // 处理超时
    if (options?.timeout) {
      await Promise.all([
        new Promise((resolve) => setTimeout(resolve, options.timeout)),
        vscode.commands.executeCommand("closeNotification"),
      ]);
    }
  } catch (error) {
    console.error(`Failed to show ${type} notification:`, error);
  }
};

// 副作用函数: 处理通知队列
let notificationQueue: NotificationItem[] = [];
let isProcessing = false;

const processQueue = async () => {
  if (notificationQueue.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const batch = notificationQueue.splice(0, MAX_CONCURRENT);

  await Promise.all(
    batch.map(({ type, messageKey, args, options }) =>
      showNotification(type, messageKey, args, options)
    )
  );

  processQueue();
};

// Notify接口定义
interface INotify {
  add: (item: NotificationItem) => void;
  info: (
    messageKey: string,
    args?: any[],
    options?: NotificationOptions
  ) => void;
  warn: (
    messageKey: string,
    args?: any[],
    options?: NotificationOptions
  ) => void;
  error: (
    messageKey: string,
    args?: any[],
    options?: NotificationOptions
  ) => void;
  confirm: (messageKey: string, onYes: () => void, onNo?: () => void) => void;
  prompt: (
    messageKey: string,
    ...actions: Array<{ title: string; handler: () => void }>
  ) => void;
}

// 导出的函数接口使用显式类型
export const notify: INotify = {
  // 基础通知方法
  add: (item: NotificationItem) => {
    notificationQueue = sortByPriority([...notificationQueue, item]);
    if (!isProcessing) {
      processQueue();
    }
  },

  info: (messageKey: string, args?: any[], options?: NotificationOptions) =>
    notify.add({ type: "info", messageKey, args, options }),

  warn: (messageKey: string, args?: any[], options?: NotificationOptions) =>
    notify.add({ type: "warn", messageKey, args, options }),

  error: (messageKey: string, args?: any[], options?: NotificationOptions) =>
    notify.add({ type: "error", messageKey, args, options }),

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
