import { v4 as uuidv4 } from "uuid";
import { ResponseMessage } from "@/types/messages";
import {
  DEFAULT_USER_PREFERENCES,
  Profile,
  ProviderConfig,
} from "@/types/settings";
import { postMessage } from "@/utils/vscode";

// Helper function to create a request-response mechanism
function invoke<T>(
  command: string,
  data?: Record<string, unknown>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestId = uuidv4();

    const handleResponse = (event: MessageEvent) => {
      const message = event.data as ResponseMessage;
      if (
        message.command === `${command}Response` &&
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
    }, 150000); // 15-second timeout

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
      "loadProfiles",
    );
  }

  async saveProfile(profile: Profile): Promise<void> {
    return invoke<void>("saveProfile", { profile });
  }

  async deleteProfile(profileId: string): Promise<void> {
    return invoke<void>("deleteProfile", { profileId });
  }

  async setActiveProfile(profileId: string): Promise<void> {
    return invoke<void>("setActiveProfile", { profileId });
  }

  async getAllProviders(): Promise<ProviderConfig[]> {
    return invoke<ProviderConfig[]>("getAllProviders");
  }

  async exportProfile(profileId: string): Promise<void> {
    // This is a fire-and-forget command that triggers a VS Code dialog
    postMessage("exportProfile", { profileId });
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
      postMessage("importProfile");
    });
  }

  async migrateSettings(): Promise<Profile | null> {
    return invoke<Profile | null>("migrateSettings");
  }

  async resetToDefaults(): Promise<void> {
    return invoke<void>("resetToDefaults");
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
