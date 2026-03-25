import {
  DEFAULT_USER_PREFERENCES,
  Profile,
  ProviderConfig,
} from "@/types/settings";
import { postMessage } from "@/utils/vscode";
import {
  ExtensionResponse,
  ExtensionResponseMessage,
  UIRequest,
} from "@shared/types/messages";
import { v4 as uuidv4 } from "uuid";

// Map UIRequest commands to their corresponding ExtensionResponse
const commandToResponse: Record<string, ExtensionResponse> = {
  [UIRequest.ProfileLoadAll]: ExtensionResponse.ProfileAllLoaded,
  [UIRequest.ProfileSave]: ExtensionResponse.ProfileSaved,
  [UIRequest.ProfileDelete]: ExtensionResponse.ProfileDeleted,
  [UIRequest.ProfileSetActive]: ExtensionResponse.ProfileActiveChanged,
  [UIRequest.ProfileGetAllProviders]:
    ExtensionResponse.ProfileAllProvidersLoaded,
  [UIRequest.ProfileExport]: ExtensionResponse.ProfileExported,
  [UIRequest.ProfileImport]: ExtensionResponse.ProfileImported,
  [UIRequest.ProfileMigrateSettings]: ExtensionResponse.ProfileSettingsMigrated,
  [UIRequest.ProfileResetDefaults]: ExtensionResponse.ProfileResetComplete,
};

// Helper function to create a request-response mechanism
function invoke<T>(
  command: string,
  data?: Record<string, unknown>,
  options?: {
    timeoutMs?: number;
  },
): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestId = uuidv4();
    const expectedResponse = commandToResponse[command];
    const timeoutMs = options?.timeoutMs ?? 15000;

    if (!expectedResponse) {
      reject(new Error(`No response mapping found for command: ${command}`));
      return;
    }

    const handleResponse = (event: MessageEvent) => {
      const message = event.data as ExtensionResponseMessage;
      if (
        message.command === expectedResponse &&
        message.requestId === requestId
      ) {
        window.removeEventListener("message", handleResponse);
        if (message.error) {
          reject(new Error(message.error));
        } else {
          resolve(message.payload as T);
        }
      }
    };

    window.addEventListener("message", handleResponse);

    // Add a timeout to prevent hanging requests
    setTimeout(() => {
      window.removeEventListener("message", handleResponse);
      reject(new Error(`Request for command '${command}' timed out.`));
    }, timeoutMs);

    postMessage(command, { ...data, requestId });
  });
}

export class ProfileManager {
  // No local state anymore!

  constructor() {
    // The message listener is now handled by the `invoke` function
  }

  // Public API methods are now simple async functions
  async loadProfiles(): Promise<{
    profiles: Profile[];
    activeProfileId: string;
  }> {
    return invoke<{ profiles: Profile[]; activeProfileId: string }>(
      UIRequest.ProfileLoadAll,
    );
  }

  async saveProfile(profile: Profile): Promise<void> {
    return invoke<void>(UIRequest.ProfileSave, { profile });
  }

  async deleteProfile(profileId: string): Promise<void> {
    return invoke<void>(UIRequest.ProfileDelete, { profileId });
  }

  async setActiveProfile(profileId: string): Promise<void> {
    return invoke<void>(UIRequest.ProfileSetActive, { profileId });
  }

  async getAllProviders(): Promise<ProviderConfig[]> {
    return invoke<ProviderConfig[]>(UIRequest.ProfileGetAllProviders);
  }

  async exportProfile(profileId: string): Promise<void> {
    await invoke<{ success: boolean; canceled?: boolean }>(
      UIRequest.ProfileExport,
      { profileId },
      { timeoutMs: 300000 },
    );
  }

  async importProfile(): Promise<void> {
    const result = await invoke<{
      success: boolean;
      canceled?: boolean;
      error?: string;
    }>(UIRequest.ProfileImport, undefined, { timeoutMs: 300000 });

    if (result && result.success === false && !result.canceled) {
      throw new Error(result.error || "Import profile failed");
    }
  }

  async migrateSettings(): Promise<Profile | null> {
    return invoke<Profile | null>(UIRequest.ProfileMigrateSettings);
  }

  async resetToDefaults(): Promise<void> {
    return invoke<void>(UIRequest.ProfileResetDefaults);
  }

  // Utility methods can remain if they are pure functions
  createDefaultProfile(name: string, description?: string): Profile {
    const now = new Date();
    return {
      id: `profile_${Date.now()}`,
      name,
      description,
      providers: {},
      preferences: { ...DEFAULT_USER_PREFERENCES },
      createdAt: now,
      updatedAt: now,
      version: "1.0.0",
    };
  }

  cloneProfile(profile: Profile, newName: string): Profile {
    const now = new Date();
    return {
      ...profile,
      id: `profile_${Date.now()}`,
      name: newName,
      createdAt: now,
      updatedAt: now,
    };
  }
}

// Export singleton instance
export const profileManager = new ProfileManager();
