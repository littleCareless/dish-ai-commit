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
): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestId = uuidv4();
    const expectedResponse = commandToResponse[command];

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
    }, 15000); // 15-second timeout

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
      "profile.loadAll",
    );
  }

  async saveProfile(profile: Profile): Promise<void> {
    return invoke<void>("profile.save", { profile });
  }

  async deleteProfile(profileId: string): Promise<void> {
    return invoke<void>("profile.delete", { profileId });
  }

  async setActiveProfile(profileId: string): Promise<void> {
    return invoke<void>("profile.setActive", { profileId });
  }

  async getAllProviders(): Promise<ProviderConfig[]> {
    return invoke<ProviderConfig[]>("profile.getAllProviders");
  }

  async exportProfile(profileId: string): Promise<void> {
    // This is a fire-and-forget command that triggers a VS Code dialog
    postMessage("profile.export", { profileId });
  }

  async importProfile(): Promise<Profile> {
    // This triggers a dialog and the result is pushed from the extension
    // The UI should listen for a "profileImported" message
    return new Promise((resolve, reject) => {
      const handleResponse = (event: MessageEvent) => {
        const message = event.data as {
          command: string;
          data: { profile: Profile; success: boolean; error?: string };
        };
        if (message.command === "profileImported") {
          window.removeEventListener("message", handleResponse);
          if (message.data.success) {
            resolve(message.data.profile);
          } else {
            reject(new Error(message.data.error));
          }
        }
      };
      window.addEventListener("message", handleResponse);
      postMessage("profile.import");
    });
  }

  async migrateSettings(): Promise<Profile | null> {
    return invoke<Profile | null>("profile.migrateSettings");
  }

  async resetToDefaults(): Promise<void> {
    return invoke<void>("profile.resetDefaults");
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
