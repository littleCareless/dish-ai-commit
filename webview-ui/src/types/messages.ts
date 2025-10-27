import {
  Profile,
  ProviderConfig,
  ModelConfig,
  ConnectionTestResult,
} from "./settings";

// Webview 到 Extension 的消息类型
export type WebviewMessage =
  | { command: "loadProfiles"; data?: never }
  | { command: "saveProfile"; data: { profile: Profile } }
  | { command: "deleteProfile"; data: { profileId: string } }
  | { command: "setActiveProfile"; data: { profileId: string } }
  | {
      command: "testConnection";
      data: { providerId: string; config: ProviderConfig };
    }
  | { command: "getModels"; data: { providerId: string } }
  | { command: "exportProfile"; data: { profileId: string } }
  | { command: "importProfile"; data: { jsonData: string } }
  | { command: "validateConfig"; data: { config: ProviderConfig } }
  | { command: "migrateSettings"; data?: never }
  | { command: "getActiveProfile"; data?: never }
  | { command: "resetToDefaults"; data?: never };

// Extension 到 Webview 的消息类型
export type ExtensionMessage =
  | {
      command: "profilesLoaded";
      data: { profiles: Profile[]; activeProfileId: string };
    }
  | { command: "profileSaved"; data: { success: boolean; error?: string } }
  | { command: "profileDeleted"; data: { success: boolean; error?: string } }
  | { command: "activeProfileChanged"; data: { profileId: string } }
  | { command: "connectionTestResult"; data: ConnectionTestResult }
  | { command: "modelsLoaded"; data: { models: ModelConfig[] } }
  | { command: "profileExported"; data: { json: string } }
  | {
      command: "profileImported";
      data: { profile: Profile; success: boolean; error?: string };
    }
  | {
      command: "configValidated";
      data: { isValid: boolean; errors: string[]; warnings: string[] };
    }
  | {
      command: "settingsMigrated";
      data: { success: boolean; migratedProfile?: Profile; error?: string };
    }
  | { command: "activeProfileResponse"; data: { profile: Profile | null } }
  | { command: "defaultsReset"; data: { success: boolean; error?: string } }
  | { command: "error"; data: { message: string; code?: string } };

// 消息处理器类型
export type MessageHandler<T extends WebviewMessage = WebviewMessage> = (
  message: T,
  sendResponse: (response: ExtensionMessage) => void,
) => Promise<void> | void;

// 消息监听器类型
export type MessageListener<T extends ExtensionMessage = ExtensionMessage> = (
  message: T,
) => void;

// 消息验证器
export const isWebviewMessage = (message: any): message is WebviewMessage => {
  return (
    message && typeof message.command === "string" && message.data !== undefined
  );
};

export const isExtensionMessage = (
  message: any,
): message is ExtensionMessage => {
  return (
    message && typeof message.command === "string" && message.data !== undefined
  );
};

// 消息工厂函数
export const createWebviewMessage = <T extends WebviewMessage["command"]>(
  command: T,
  data: Extract<WebviewMessage, { command: T }>["data"],
): Extract<WebviewMessage, { command: T }> => {
  return { command, data } as Extract<WebviewMessage, { command: T }>;
};

export const createExtensionMessage = <T extends ExtensionMessage["command"]>(
  command: T,
  data: Extract<ExtensionMessage, { command: T }>["data"],
): Extract<ExtensionMessage, { command: T }> => {
  return { command, data } as Extract<ExtensionMessage, { command: T }>;
};

// 错误消息类型
export interface ErrorMessage {
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
}

// 消息队列类型
export interface MessageQueue {
  messages: WebviewMessage[];
  isProcessing: boolean;
  add(message: WebviewMessage): void;
  process(): Promise<void>;
  clear(): void;
}

// 消息历史类型
export interface MessageHistory {
  messages: (WebviewMessage | ExtensionMessage)[];
  add(message: WebviewMessage | ExtensionMessage): void;
  getLast(count: number): (WebviewMessage | ExtensionMessage)[];
  clear(): void;
}
