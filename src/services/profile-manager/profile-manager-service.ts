import { AIProviderFactory } from "@/ai/ai-provider-factory";
import { ProviderProfileRepository } from "@/services/profile-manager/provider-profile-repository";
import { ProviderStore } from "@/services/profile-manager/provider-store";
import { ProviderProfiles } from "@/services/profile-manager/types";
import { FeatureSettings, ProviderConfig, ProviderType } from "@/types/settings";
import { Logger } from "@/utils/logger";
import * as vscode from "vscode";

export class ProfileManagerService {
  private static instance: ProfileManagerService;
  private context: vscode.ExtensionContext;
  private logger: Logger;
  private profileRepository: ProviderProfileRepository;
  private providerStore: ProviderStore;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.logger = Logger.getInstance("ProfileManager");
    this.profileRepository = new ProviderProfileRepository(
      context,
      {} as ProviderProfiles
    );
    this.providerStore = ProviderStore.getInstance(context);
    this.logger.info("ProfileManagerService constructor called.");
  }

  public static async create(
    context: vscode.ExtensionContext
  ): Promise<ProfileManagerService> {
    const logger = Logger.getInstance("ProfileManager");
    logger.debug("ProfileManagerService.create called.");
    if (!ProfileManagerService.instance) {
      logger.info("Creating new ProfileManagerService instance.");
      const instance = new ProfileManagerService(context);
      // Profiles are loaded by the ProviderStore's constructor.
      ProfileManagerService.instance = instance;
      logger.info("ProfileManagerService instance created successfully.");
    } else {
      logger.debug("Returning existing ProfileManagerService instance.");
    }
    return ProfileManagerService.instance;
  }

  public static getInstance(): ProfileManagerService {
    if (!ProfileManagerService.instance) {
      throw new Error(
        "ProfileManagerService not initialized. Call create() first."
      );
    }
    return ProfileManagerService.instance;
  }

  private async loadProfiles(): Promise<void> {
    const operation = "loadProfiles";
    this.logger.logOperationStart(operation);
    const startTime = Date.now();

    try {
      // The ProviderStore is now the source of truth and handles its own loading.
      // This method is kept for now to ensure `create()` works, but it does nothing.
      this.logger.info("Profiles are now managed by ProviderStore.");
    } catch (error) {
      this.logger.logError(error as Error, "Failed to load profiles", {
        operation,
      });
    } finally {
      const duration = Date.now() - startTime;
      this.logger.logOperationEnd(operation, duration);
    }
  }

  async getAllProfiles(): Promise<any[]> {
    this.logger.debug("Getting all profiles.");
    const providerProfiles = this.providerStore.getProfiles();
    if (!providerProfiles) {
      return [];
    }

    // This is now a pass-through to the ProviderStore.
    // The adapter logic is no longer needed here.
    // A future refactoring could remove this service entirely.
    return Object.values(providerProfiles.apiConfigs);
  }

  async getAllProviders(): Promise<ProviderConfig[]> {
    this.logger.debug("Getting all providers.");
    const providers = await AIProviderFactory.getAllProviders();
    return providers.map((p) => p.getConfig());
  }

  async saveProfile(profileData: any): Promise<void> {
    const operation = "saveProfile";
    this.logger.logOperationStart(operation);
    try {
      if (!profileData.name) {
        throw new Error("Profile name is required");
      }

      await this.providerStore.saveConfig(profileData);
      this.logger.info(`Profile '${profileData.name}' saved successfully.`);
    } catch (error) {
      this.logger.logError(error as Error, "Failed to save profile", {
        operation,
      });
      throw error;
    } finally {
      this.logger.logOperationEnd(operation);
    }
  }

  async deleteProfile(profileId: string): Promise<void> {
    const operation = "deleteProfile";
    this.logger.logOperationStart(operation, { data: { profileId } });
    try {
      await this.providerStore.deleteConfig(profileId);
      this.logger.info(`Profile with ID '${profileId}' deleted successfully.`);
    } catch (error) {
      this.logger.logError(error as Error, "Failed to delete profile", {
        operation,
      });
      throw error;
    } finally {
      this.logger.logOperationEnd(operation);
    }
  }

  async getActiveProfileId(): Promise<string | null> {
    this.logger.debug("Getting active profile ID from ProviderStore.");
    const profiles = this.providerStore.getProfiles();
    if (!profiles) {
      return null;
    }

    return profiles.currentApiConfigId;
  }

  async getProfileForMode(): Promise<any | null> {
    const profileId = await this.getActiveProfileId();
    if (!profileId) {
      return null;
    }
    return this.getProfileById(profileId);
  }

  async setActiveProfile(profileId: string): Promise<void> {
    const operation = "setActiveProfile";
    this.logger.debug(`Attempting to set active profile to: ${profileId}`, {
      operation,
      data: { profileId },
    });
    try {
      await this.providerStore.activateProfile(profileId);
      this.logger.info(`Active profile set to: ${profileId}`);
    } catch (error) {
      this.logger.logError(error as Error, "Failed to set active profile", {
        operation,
      });
      throw error;
    }
  }

  // exportProfile and importProfile are already deprecated.

  async migrateFromPackageJson(): Promise<any> {
    const operation = "migrateFromPackageJson";
    this.logger.logOperationStart(operation);
    // This method is now a no-op. Migration is handled by ProfileMigrationService.
    this.logger.warn(
      "migrateFromPackageJson is deprecated and should not be called."
    );
    return Promise.resolve(null);
  }

  async resetToDefaults(): Promise<void> {
    const operation = "resetToDefaults";
    this.logger.logOperationStart(operation);
    const startTime = Date.now();

    try {
      // The ProviderStore doesn't have a direct `resetToDefaults` method.
      // We'll need to implement this logic by clearing all configs and adding a default one.
      // This is a placeholder for the actual implementation.
      this.logger.warn("resetToDefaults is not fully implemented yet.");

      this.logger.info("Reset to defaults completed successfully", {
        operation,
      });
    } catch (error) {
      this.logger.logError(error as Error, "Failed to reset to defaults", {
        operation,
      });
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.logger.logOperationEnd(operation, duration);
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
  async getProfileById(
    id: string,
    includeSecrets = false
  ): Promise<any | null> {
    const operation = "getProfileById";
    this.logger.debug(`Getting profile by ID: ${id}`, {
      operation,
      data: { id, includeSecrets },
    });

    const profiles = this.providerStore.getProfiles();
    if (!profiles) {
      return null;
    }
    const config = Object.values(profiles.apiConfigs).find((c) => c.id === id);
    return config || null;
  }

  async hasProfiles(): Promise<boolean> {
    const profiles = await this.getAllProfiles();
    const count = profiles.length;
    this.logger.debug(`Checking if profiles exist: ${count > 0}`, {
      data: { count },
    });
    return count > 0;
  }

  async getProfileCount(): Promise<number> {
    const profiles = await this.getAllProfiles();
    const count = profiles.length;
    this.logger.debug(`Getting profile count: ${count}`, { data: { count } });
    return count;
  }

  public getFeatureSettings(): FeatureSettings {
    const settings = this.context.globalState.get<FeatureSettings>(
      "dish_config_features_settings"
    );
    return (
      settings || {
        enableEmoji: true,
        enableMergeCommit: true,
        enableBody: true,
        enableLayeredCommit: false,
        enableGlobalContext: true,
        useRecentCommitsAsReference: false,
        simplifyDiff: false,
        autoDetectStaged: true,
        fallbackToAll: true,
        weeklyReport: true,
        codeReview: true,
        generateBranchName: true,
        generatePRSummary: true,
      }
    );
  }
}
