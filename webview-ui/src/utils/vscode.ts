import { useCallback, useEffect } from "react";

declare const acquireVsCodeApi: () => {
  postMessage(message: { command: string; data?: unknown }): void;
  getState<T>(): T | undefined;
  setState<T>(newState: T): void;
};

let vscodeApi: ReturnType<typeof acquireVsCodeApi> | undefined;

function getVscodeApi() {
  if (!vscodeApi) {
    try {
      vscodeApi = acquireVsCodeApi();
    } catch (error) {
      console.error("Could not acquire VSCode API:", error);
    }
  }
  return vscodeApi;
}

/**
 * Sends a message to the VS Code extension.
 * It lazily initializes the vscode api on first call.
 * @param command The message command to send.
 * @param data The data to send with the message.
 */
let lastMessage: { command: string; data?: unknown } | null = null;
let lastMessageTime = 0;

export function postMessage(command: string, data?: unknown) {
  const now = Date.now();
  if (
    lastMessage &&
    now - lastMessageTime < 1000 && // 1秒内防抖
    lastMessage.command === command &&
    JSON.stringify(lastMessage.data) === JSON.stringify(data)
  ) {
    console.log("Duplicate message blocked:", { command, data });
    return;
  }

  const vscode = getVscodeApi();
  if (vscode) {
    vscode.postMessage({
      command,
      data,
    });
    lastMessage = { command, data };
    lastMessageTime = now;
  } else {
    console.warn(
      `VSCode API not available. Could not send message: { command: '${command}' }`,
    );
  }
}

/**
 * A React hook to handle messages from the VS Code extension.
 * @param messageCallback The callback function to handle incoming messages.
 */
export function useMessageHandler(
  messageCallback: (event: MessageEvent) => void,
) {
  const memoizedCallback = useCallback(
    (event: MessageEvent) => {
      messageCallback(event);
    },
    [messageCallback],
  );

  useEffect(() => {
    window.addEventListener("message", memoizedCallback);
    return () => {
      window.removeEventListener("message", memoizedCallback);
    };
  }, [memoizedCallback]);
}

/**
 * Shows an information message to the user.
 * @param message The message to show.
 * @param options The options to show in the message.
 * @returns A promise that resolves to the selected option.
 */
export function showInformationMessage(
  message: string,
  ...options: string[]
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const callbackId = `callback_${Date.now()}_${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const { type, data } = event.data;
      if (
        type === "showInformationMessageResponse" &&
        data.callbackId === callbackId
      ) {
        window.removeEventListener("message", handler);
        resolve(data.selection);
      }
    };

    window.addEventListener("message", handler);

    postMessage("showInformationMessage", { message, options, callbackId });
  });
}
