import { ProfileManagerService } from "@/services/profile-manager/profile-manager-service";
import { Profile, ProviderConfig, ProviderType } from "@/types/settings";
import * as vscode from "vscode";

export class SettingsMigration {
  private profileManager: ProfileManagerService;

  constructor(profileManager: ProfileManagerService) {
    this.profileManager = profileManager;
  }

  async migrateFromPackageJson(): Promise<Profile> {
    const config = vscode.workspace.getConfiguration("dish-ai-commit");

    // Create default profile from package.json configuration
    const now = new Date();
    const defaultProfile: Profile = {
      id: "default",
      name: "Default Profile",
      description: "Migrated from package.json configuration",
      providers: {},
      preferences: {
        temperature: config.get("base.temperature", 0),
        verbosity: config.get("base.verbosity", 0),
        rateLimitSeconds: config.get("base.rateLimitSeconds", 5),
        consecutiveMistakeLimit: config.get("base.consecutiveMistakeLimit", 3),
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
          createdAt: now,
          updatedAt: now,
        };

        defaultProfile.providers[providerId] = providerConfig;
      }
    }

    // Save the migrated profile
    await this.profileManager.saveProfile(defaultProfile);

    // Set as active profile
    await this.profileManager.setActiveProfile(defaultProfile.id);

    return defaultProfile;
  }

  async migrateWorkspaceSettings(): Promise<void> {
    // This would migrate workspace-specific settings
    // For now, we'll keep the existing workspace settings system
    console.log("Workspace settings migration not implemented yet");
  }

  async migrateUserPreferences(): Promise<void> {
    // This would migrate user-specific preferences
    // For now, we'll keep the existing user preferences system
    console.log("User preferences migration not implemented yet");
  }

  async validateMigration(): Promise<boolean> {
    try {
      // Check if migration was successful
      const profiles = await this.profileManager.getAllProfiles();
      const activeProfileId = await this.profileManager.getActiveProfileId();

      return profiles.length > 0 && activeProfileId !== null;
    } catch (error) {
      console.error("Migration validation failed:", error);
      return false;
    }
  }

  async rollbackMigration(): Promise<void> {
    try {
      // Remove all profiles
      const profiles = await this.profileManager.getAllProfiles();
      for (const profile of profiles) {
        await this.profileManager.deleteProfile(profile.id);
      }

      console.log("Migration rolled back successfully");
    } catch (error) {
      console.error("Failed to rollback migration:", error);
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
}

// Export singleton instance
export const settingsMigration = new SettingsMigration(
  ProfileManagerService.getInstance()
);
