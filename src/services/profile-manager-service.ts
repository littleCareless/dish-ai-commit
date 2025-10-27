import * as vscode from "vscode";
import {
  Profile,
  ProviderConfig,
  ProviderType,
  DEFAULT_USER_PREFERENCES,
} from "../types/settings";

export class ProfileManagerService {
  private static instance: ProfileManagerService;
  private context: vscode.ExtensionContext;
  private profiles: Map<string, Profile> = new Map();
  private activeProfileId: string | null = null;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadProfiles();
  }

  public static getInstance(
    context?: vscode.ExtensionContext
  ): ProfileManagerService {
    if (!ProfileManagerService.instance && context) {
      ProfileManagerService.instance = new ProfileManagerService(context);
    }
    return ProfileManagerService.instance;
  }

  private async loadProfiles(): Promise<void> {
    try {
      const profiles = this.context.globalState.get<Profile[]>("profiles", []);
      this.profiles.clear();

      profiles.forEach((profile) => {
        // Convert date strings back to Date objects
        const profileWithDates: Profile = {
          ...profile,
          createdAt: new Date(profile.createdAt),
          updatedAt: new Date(profile.updatedAt),
        };

        // Convert provider dates
        Object.values(profileWithDates.providers).forEach((provider) => {
          if (provider.createdAt) {
            provider.createdAt = new Date(provider.createdAt);
          }
          if (provider.updatedAt) {
            provider.updatedAt = new Date(provider.updatedAt);
          }
        });

        this.profiles.set(profile.id, profileWithDates);
      });

      this.activeProfileId = this.context.globalState.get<string>(
        "activeProfileId",
        ""
      );
    } catch (error) {
      console.error("Failed to load profiles:", error);
    }
  }

  async getAllProfiles(): Promise<Profile[]> {
    return Array.from(this.profiles.values());
  }

  async saveProfile(profile: Profile): Promise<void> {
    try {
      const updatedProfile = {
        ...profile,
        updatedAt: new Date(),
      };

      this.profiles.set(updatedProfile.id, updatedProfile);

      // Save to global state
      const profiles = Array.from(this.profiles.values());
      await this.context.globalState.update("profiles", profiles);

      // Save sensitive information to secrets
      for (const [providerId, providerConfig] of Object.entries(
        updatedProfile.providers
      )) {
        if (providerConfig.apiKey) {
          await this.context.secrets.store(
            `profile_${profile.id}_provider_${providerId}_apikey`,
            providerConfig.apiKey
          );
        }
      }

      console.log(`Profile ${profile.id} saved successfully`);
    } catch (error) {
      console.error("Failed to save profile:", error);
      throw error;
    }
  }

  async deleteProfile(profileId: string): Promise<void> {
    try {
      if (!this.profiles.has(profileId)) {
        throw new Error("Profile not found");
      }

      // Remove from memory
      this.profiles.delete(profileId);

      // Update global state
      const profiles = Array.from(this.profiles.values());
      await this.context.globalState.update("profiles", profiles);

      // Clean up secrets
      const profile = this.profiles.get(profileId);
      if (profile) {
        for (const providerId of Object.keys(profile.providers)) {
          await this.context.secrets.delete(
            `profile_${profileId}_provider_${providerId}_apikey`
          );
        }
      }

      // Update active profile if deleted profile was active
      if (this.activeProfileId === profileId) {
        this.activeProfileId = null;
        await this.context.globalState.update("activeProfileId", "");
      }

      console.log(`Profile ${profileId} deleted successfully`);
    } catch (error) {
      console.error("Failed to delete profile:", error);
      throw error;
    }
  }

  async getActiveProfileId(): Promise<string> {
    return this.activeProfileId || "";
  }

  async setActiveProfile(profileId: string): Promise<void> {
    try {
      if (!this.profiles.has(profileId)) {
        throw new Error("Profile not found");
      }

      this.activeProfileId = profileId;
      await this.context.globalState.update("activeProfileId", profileId);

      console.log(`Active profile set to ${profileId}`);
    } catch (error) {
      console.error("Failed to set active profile:", error);
      throw error;
    }
  }

  async exportProfile(profileId: string): Promise<string> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    // Create export format
    const exportData = {
      version: "1.0.0",
      profile: profile,
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: "Dish AI Commit Extension",
        extensionVersion: "1.0.0",
      },
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importProfile(jsonData: string): Promise<Profile> {
    try {
      const importData = JSON.parse(jsonData);

      // Validate import data
      if (!importData.profile || !importData.version) {
        throw new Error("Invalid profile format");
      }

      const profile = importData.profile as Profile;

      // Generate new ID and timestamps
      const now = new Date();
      const importedProfile: Profile = {
        ...profile,
        id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
        version: "1.0.0",
      };

      // Import the profile
      await this.saveProfile(importedProfile);

      console.log(`Profile imported successfully: ${importedProfile.id}`);
      return importedProfile;
    } catch (error) {
      console.error("Failed to import profile:", error);
      throw error;
    }
  }

  async migrateFromPackageJson(): Promise<Profile> {
    try {
      const config = vscode.workspace.getConfiguration("dish-ai-commit");

      // Create default profile from package.json configuration
      const now = new Date();
      const defaultProfile: Profile = {
        id: "default",
        name: "Default Profile",
        description: "Migrated from package.json configuration",
        isDefault: true,
        providers: {},
        preferences: {
          temperature: config.get("base.temperature", 0),
          verbosity: config.get("base.verbosity", 0),
          rateLimitSeconds: config.get("base.rateLimitSeconds", 5),
          consecutiveMistakeLimit: config.get(
            "base.consecutiveMistakeLimit",
            3
          ),
          language: config.get("base.language", "zh") as "zh" | "en",
          maxTokens: config.get("base.maxTokens", 4000),
          timeout: config.get("base.timeout", 30000),
          retryAttempts: config.get("base.retryAttempts", 3),
        },
        createdAt: now,
        updatedAt: now,
        version: "1.0.0",
      };

      // Migrate provider configurations
      const providers = ["openai", "anthropic", "ollama", "gemini", "bedrock"];
      for (const providerId of providers) {
        const apiKey = config.get(`providers.${providerId}.apiKey`);
        if (apiKey) {
          const providerConfig: ProviderConfig = {
            id: providerId,
            name: this.capitalize(providerId),
            type: this.getProviderType(providerId),
            apiKey: apiKey as string,
            models: [],
            isActive: true,
            createdAt: now,
            updatedAt: now,
          };

          defaultProfile.providers[providerId] = providerConfig;
        }
      }

      // Save the migrated profile
      await this.saveProfile(defaultProfile);

      // Set as active profile
      await this.setActiveProfile(defaultProfile.id);

      console.log("Migration from package.json completed successfully");
      return defaultProfile;
    } catch (error) {
      console.error("Failed to migrate from package.json:", error);
      throw error;
    }
  }

  async resetToDefaults(): Promise<void> {
    try {
      // Clear all profiles
      this.profiles.clear();
      await this.context.globalState.update("profiles", []);

      // Clear active profile
      this.activeProfileId = null;
      await this.context.globalState.update("activeProfileId", "");

      // Create default profile
      const now = new Date();
      const defaultProfile: Profile = {
        id: "default",
        name: "Default Profile",
        description: "Default profile with basic settings",
        isDefault: true,
        providers: {},
        preferences: { ...DEFAULT_USER_PREFERENCES },
        createdAt: now,
        updatedAt: now,
        version: "1.0.0",
      };

      await this.saveProfile(defaultProfile);
      await this.setActiveProfile(defaultProfile.id);

      console.log("Reset to defaults completed successfully");
    } catch (error) {
      console.error("Failed to reset to defaults:", error);
      throw error;
    }
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private getProviderType(providerId: string): ProviderType {
    const typeMap: Record<string, ProviderType> = {
      openai: "first-party",
      anthropic: "first-party",
      gemini: "first-party",
      ollama: "local",
      bedrock: "cloud",
    };

    return typeMap[providerId] || "openai-compatible";
  }

  // Utility methods
  async getProfileById(id: string): Promise<Profile | null> {
    return this.profiles.get(id) || null;
  }

  async hasProfiles(): Promise<boolean> {
    return this.profiles.size > 0;
  }

  async getProfileCount(): Promise<number> {
    return this.profiles.size;
  }
}
