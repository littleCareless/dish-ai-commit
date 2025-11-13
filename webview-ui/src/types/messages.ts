import { Profile } from "./settings";

// A generic response message from the extension
export interface ResponseMessage<T = unknown> {
  command: string;
  requestId: string;
  payload?: T;
  error?: string;
}

// Webview to Extension
export type WebviewMessage =
  | { command: "loadProfiles"; data: { requestId: string } }
  | { command: "saveProfile"; data: { profile: Profile; requestId: string } }
  | { command: "deleteProfile"; data: { profileId: string; requestId: string } }
  | {
      command: "setActiveProfile";
      data: { profileId: string; requestId: string };
    }
  | { command: "exportProfile"; data: { profileId: string; requestId: string } }
  | { command: "importProfile"; data: { requestId: string } }
  | { command: "migrateSettings"; data: { requestId: string } }
  | { command: "resetToDefaults"; data: { requestId: string } };

// Extension to Webview
export type ExtensionMessage =
  | ResponseMessage<{ profiles: Profile[]; activeProfileId: string }>
  | ResponseMessage<void>
  | ResponseMessage<Profile>
  | {
      command: "profileImported";
      data: { profile: Profile; success: boolean; error?: string };
    };

export function createWebviewMessage<T extends WebviewMessage["command"]>(
  command: T,
  data: Omit<Extract<WebviewMessage, { command: T }>["data"], "requestId">,
) {
  return {
    command,
    data,
  };
}

export enum MessageType {
  // Webview to Extension
  GetAllPrompts = "getAllPrompts",
  UpdatePrompt = "updatePrompt",
  ResetPrompt = "resetPrompt",
  ResetAllPrompts = "resetAllPrompts",
  CreatePrompt = "createPrompt",
  DeletePrompt = "deletePrompt",
  RenamePrompt = "renamePrompt",

  // Extension to Webview
  AllPrompts = "allPrompts",
}
