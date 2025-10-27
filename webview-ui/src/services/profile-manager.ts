import {
  Profile,
  DEFAULT_USER_PREFERENCES,
  ConfigValidationResult,
} from "../types/settings";
import { vscode } from "../lib/vscode";
import {
  WebviewMessage,
  ExtensionMessage,
  createWebviewMessage,
} from "../types/messages";

export class ProfileManager {
  private profiles: Map<string, Profile> = new Map();
  private activeProfileId: string | null = null;
  private listeners: Set<
    (profiles: Profile[], activeId: string | null) => void
  > = new Set();
  private messageListeners: Set<(message: ExtensionMessage) => void> =
    new Set();

  constructor() {
    this.initializeMessageListener();
  }

  private initializeMessageListener() {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as ExtensionMessage;
      if (this.messageListeners.size > 0) {
        this.messageListeners.forEach((listener) => listener(message));
      }

      switch (message.command) {
        case "profilesLoaded":
          this.handleProfilesLoaded(message.data);
          break;
        case "profileSaved":
          this.handleProfileSaved(message.data);
          break;
        case "profileDeleted":
          this.handleProfileDeleted(message.data);
          break;
        case "activeProfileChanged":
          this.handleActiveProfileChanged(message.data);
          break;
        case "profileImported":
          this.handleProfileImported(message.data);
          break;
        case "settingsMigrated":
          this.handleSettingsMigrated(message.data);
          break;
        case "error":
          console.error("Profile Manager Error:", message.data);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
  }

  private handleProfilesLoaded(data: {
    profiles: Profile[];
    activeProfileId: string;
  }) {
    this.profiles.clear();
    data.profiles.forEach((profile) => {
      this.profiles.set(profile.id, profile);
    });
    this.activeProfileId = data.activeProfileId;
    this.notifyListeners();
  }

  private handleProfileSaved(data: { success: boolean; error?: string }) {
    if (!data.success) {
      console.error("Failed to save profile:", data.error);
    }
  }

  private handleProfileDeleted(data: { success: boolean; error?: string }) {
    if (!data.success) {
      console.error("Failed to delete profile:", data.error);
    }
  }

  private handleActiveProfileChanged(data: { profileId: string }) {
    this.activeProfileId = data.profileId;
    this.notifyListeners();
  }

  private handleProfileImported(data: {
    profile: Profile;
    success: boolean;
    error?: string;
  }) {
    if (data.success) {
      this.profiles.set(data.profile.id, data.profile);
      this.notifyListeners();
    } else {
      console.error("Failed to import profile:", data.error);
    }
  }

  private handleSettingsMigrated(data: {
    success: boolean;
    migratedProfile?: Profile;
    error?: string;
  }) {
    if (data.success && data.migratedProfile) {
      this.profiles.set(data.migratedProfile.id, data.migratedProfile);
      this.notifyListeners();
    } else {
      console.error("Failed to migrate settings:", data.error);
    }
  }

  private notifyListeners() {
    const profiles = Array.from(this.profiles.values());
    this.listeners.forEach((listener) =>
      listener(profiles, this.activeProfileId),
    );
  }

  private async sendMessage(message: WebviewMessage): Promise<void> {
    if (vscode) {
      vscode.postMessage(message);
    } else {
      console.warn("VSCode API not available");
    }
  }

  // Public API methods
  async loadProfiles(): Promise<Profile[]> {
    await this.sendMessage(createWebviewMessage("loadProfiles", undefined));
    return Array.from(this.profiles.values());
  }

  async saveProfile(profile: Profile): Promise<void> {
    const updatedProfile = {
      ...profile,
      updatedAt: new Date(),
    };

    await this.sendMessage(
      createWebviewMessage("saveProfile", { profile: updatedProfile }),
    );
    this.profiles.set(updatedProfile.id, updatedProfile);
    this.notifyListeners();
  }

  async deleteProfile(profileId: string): Promise<void> {
    if (this.profiles.has(profileId)) {
      await this.sendMessage(
        createWebviewMessage("deleteProfile", { profileId }),
      );
      this.profiles.delete(profileId);
      if (this.activeProfileId === profileId) {
        this.activeProfileId = null;
      }
      this.notifyListeners();
    }
  }

  async setActiveProfile(profileId: string): Promise<void> {
    if (this.profiles.has(profileId)) {
      await this.sendMessage(
        createWebviewMessage("setActiveProfile", { profileId }),
      );
      this.activeProfileId = profileId;
      this.notifyListeners();
    }
  }

  async exportProfile(profileId: string): Promise<string> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    await this.sendMessage(
      createWebviewMessage("exportProfile", { profileId }),
    );
    return JSON.stringify(profile, null, 2);
  }

  async importProfile(jsonData: string): Promise<Profile> {
    await this.sendMessage(createWebviewMessage("importProfile", { jsonData }));
    // The actual profile will be added in handleProfileImported
    return JSON.parse(jsonData) as Profile;
  }

  async validateConfig(profile: Profile): Promise<ConfigValidationResult> {
    await this.sendMessage(
      createWebviewMessage("validateConfig", {
        config: profile.providers[Object.keys(profile.providers)[0]],
      }),
    );
    // This will be handled by the message listener
    return { isValid: true, errors: [], warnings: [] };
  }

  async migrateSettings(): Promise<Profile | null> {
    await this.sendMessage(createWebviewMessage("migrateSettings", undefined));
    // The migrated profile will be handled by handleSettingsMigrated
    return null;
  }

  async resetToDefaults(): Promise<void> {
    await this.sendMessage(createWebviewMessage("resetToDefaults", undefined));
  }

  getActiveProfile(): Profile | null {
    return this.activeProfileId
      ? this.profiles.get(this.activeProfileId) || null
      : null;
  }

  getAllProfiles(): Profile[] {
    return Array.from(this.profiles.values());
  }

  getProfileById(id: string): Profile | null {
    return this.profiles.get(id) || null;
  }

  // Event subscription methods
  subscribe(
    listener: (profiles: Profile[], activeId: string | null) => void,
  ): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeToMessages(
    listener: (message: ExtensionMessage) => void,
  ): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  // Utility methods
  createDefaultProfile(name: string, description?: string): Profile {
    const now = new Date();
    return {
      id: `profile_${Date.now()}`,
      name,
      description,
      isDefault: false,
      providers: {},
      preferences: { ...DEFAULT_USER_PREFERENCES },
      createdAt: now,
      updatedAt: now,
      version: "1.0.0",
    };
  }

  cloneProfile(profileId: string, newName: string): Profile | null {
    const original = this.profiles.get(profileId);
    if (!original) return null;

    const now = new Date();
    return {
      ...original,
      id: `profile_${Date.now()}`,
      name: newName,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  validateProfile(profile: Profile): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!profile.name.trim()) {
      errors.push("Profile name is required");
    }

    if (Object.keys(profile.providers).length === 0) {
      warnings.push("No providers configured");
    }

    Object.values(profile.providers).forEach((provider) => {
      if (!provider.apiKey && provider.type !== "local") {
        errors.push(`${provider.name} API key is required`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Static factory methods
  static createFromProvider(
    providerId: string,
    providerName: string,
    apiKey: string,
  ): Profile {
    const now = new Date();
    return {
      id: `profile_${Date.now()}`,
      name: `${providerName} Profile`,
      description: `Profile for ${providerName}`,
      isDefault: false,
      providers: {
        [providerId]: {
          id: providerId,
          name: providerName,
          type: "openai-compatible",
          apiKey,
          models: [],
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      },
      preferences: { ...DEFAULT_USER_PREFERENCES },
      createdAt: now,
      updatedAt: now,
      version: "1.0.0",
    };
  }
}

// Export singleton instance
export const profileManager = new ProfileManager();
