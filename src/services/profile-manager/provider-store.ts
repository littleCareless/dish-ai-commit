import {
  CloudSyncService,
  SyncCloudProfilesResult,
} from "@/services/profile-manager/cloud-sync-service";
import { ModelCapabilityService } from "@/services/profile-manager/model-capability-service";
import { ProviderProfileRepository } from "@/services/profile-manager/provider-profile-repository";
import {
  discriminatedProviderSettingsWithIdSchema,
  ProviderProfiles,
  ProviderSettingsWithId,
} from "@/services/profile-manager/types";
import {
  DEFAULT_OPENAI_CONFIG,
  DEFAULT_USER_PREFERENCES,
} from "@/types/settings";
import { ExtensionContext } from "vscode";

type Subscriber = (profiles: ProviderProfiles) => void;

export class ProviderStore {
  private static instance: ProviderStore;

  private readonly repository: ProviderProfileRepository;
  private readonly cloudSyncService: CloudSyncService;
  private readonly capabilityService: ModelCapabilityService;

  private profiles: ProviderProfiles | null = null;
  private subscribers: Subscriber[] = [];
  private initPromise: Promise<void>;

  private constructor(context: ExtensionContext) {
    const defaultProviderProfiles = this.getDefaultProfiles();
    this.repository = new ProviderProfileRepository(
      context,
      defaultProviderProfiles
    );
    this.cloudSyncService = new CloudSyncService(this.repository);
    this.capabilityService = ModelCapabilityService.instance;
    this.initPromise = this.initialize().catch(console.error);
  }

  public async waitForInitialization(): Promise<void> {
    await this.initPromise;
  }

  public static getInstance(context: ExtensionContext): ProviderStore {
    if (!ProviderStore.instance) {
      ProviderStore.instance = new ProviderStore(context);
    }
    return ProviderStore.instance;
  }

  private async initialize(): Promise<void> {
    await this.repository.lock(async () => {
      const loadedProfiles = await this.repository.load();
      let shouldSave = false;

      // 1. Validate Active Profile ID
      if (
        loadedProfiles.currentApiConfigId &&
        !loadedProfiles.apiConfigs[loadedProfiles.currentApiConfigId]
      ) {
        console.warn(
          `Active profile ID '${loadedProfiles.currentApiConfigId}' not found. Resetting.`
        );
        loadedProfiles.currentApiConfigId = "";
        shouldSave = true;
      }

      // 2. Check if we have any profiles
      const hasProfiles = Object.keys(loadedProfiles.apiConfigs).length > 0;

      if (!hasProfiles) {
        // No profiles (first init or all deleted): create default
        const defaultProfiles = this.getDefaultProfiles();
        loadedProfiles.apiConfigs = defaultProfiles.apiConfigs;
        loadedProfiles.currentApiConfigId = defaultProfiles.currentApiConfigId;
        shouldSave = true;
        console.log("Initialized with default profile");
      } else {
        // Has profiles, ensure one is active
        if (!loadedProfiles.currentApiConfigId) {
          const firstProfileId = Object.keys(loadedProfiles.apiConfigs)[0];
          loadedProfiles.currentApiConfigId = firstProfileId;
          console.log(`Auto-activated first profile by ID: ${firstProfileId}`);
          shouldSave = true;
        }
      }

      if (shouldSave) {
        await this.repository.store(loadedProfiles);
      }

      this.profiles = loadedProfiles;
      console.log("initialize", loadedProfiles);

      this.notify();
    });
  }

  public subscribe(callback: Subscriber): () => void {
    this.subscribers.push(callback);
    if (this.profiles) {
      callback(this.profiles);
    }
    return () => {
      this.subscribers = this.subscribers.filter((sub) => sub !== callback);
    };
  }

  private notify(): void {
    if (this.profiles) {
      this.subscribers.forEach((callback) => callback(this.profiles!));
    }
  }

  private async updateProfiles(
    updateFn: (profiles: ProviderProfiles) => Promise<void> | void
  ): Promise<void> {
    await this.repository.lock(async () => {
      const currentProfiles = await this.repository.load();
      await updateFn(currentProfiles);
      await this.repository.store(currentProfiles);
      this.profiles = currentProfiles;
      this.notify();
    });
  }

  public getProfiles(): ProviderProfiles | null {
    return this.profiles;
  }

  public async saveConfig(config: ProviderSettingsWithId): Promise<string> {
    let id = "";
    await this.updateProfiles(async (profiles) => {
      // Generate ID if not provided
      id = config.id || this.generateId();

      const filteredConfig =
        discriminatedProviderSettingsWithIdSchema.parse(config);
      profiles.apiConfigs[id] = { ...filteredConfig, id };
    });
    return id;
  }

  public async activateProfile(id: string): Promise<void> {
    await this.updateProfiles(async (profiles) => {
      // Verify the ID exists
      if (!profiles.apiConfigs[id]) {
        throw new Error(`Config with ID '${id}' not found`);
      }
      profiles.currentApiConfigId = id;
    });
  }

  public async deleteConfig(id: string): Promise<void> {
    await this.updateProfiles((profiles) => {
      if (!profiles.apiConfigs[id]) {
        throw new Error(`Config with ID '${id}' not found`);
      }
      if (Object.keys(profiles.apiConfigs).length === 1) {
        throw new Error(`Cannot delete the last remaining configuration`);
      }
      delete profiles.apiConfigs[id];
    });
  }

  public async export(): Promise<ProviderProfiles> {
    // Return the profiles as-is from the repository.
    // The previous logic attempted to modify provider-specific settings (modelMaxTokens)
    // based on capabilities. This logic is complex to adapt to the new Profile structure
    // (nested providers) and might not be necessary for a simple export.
    // If we need to strip capabilities-incompatible settings, we should iterate through
    // profile.providers values.
    return await this.repository.load();
  }

  public async syncCloudProfiles(
    cloudProfiles: Record<string, ProviderSettingsWithId>,
    currentActiveProfileName?: string
  ): Promise<SyncCloudProfilesResult> {
    const result = await this.cloudSyncService.syncCloudProfiles(
      cloudProfiles,
      currentActiveProfileName
    );
    await this.initialize(); // Re-initialize to load and notify changes
    return result;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private getDefaultProfiles(): ProviderProfiles {
    const defaultConfigId = this.generateId();
    return {
      currentApiConfigId: defaultConfigId,
      apiConfigs: {
        [defaultConfigId]: {
          id: defaultConfigId,
          name: "默认配置",
          description: "Default Profile",
          providers: {
            openai: {
              ...DEFAULT_OPENAI_CONFIG,
              apiKey: "",
              baseUrl: "https://api.openai.com/v1",
            },
          },
          preferences: DEFAULT_USER_PREFERENCES,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: "1.0.0",
          activeProviderId: "openai",
        },
      },
    };
  }
  public async importProfile(profile: ProviderProfiles): Promise<void> {
    await this.updateProfiles(async (profiles) => {
      // Merge imported configs (keys are already IDs)
      for (const [id, config] of Object.entries(profile.apiConfigs)) {
        profiles.apiConfigs[id] = config;
      }

      // Set active profile if it exists in imported data
      if (
        profile.currentApiConfigId &&
        profiles.apiConfigs[profile.currentApiConfigId]
      ) {
        profiles.currentApiConfigId = profile.currentApiConfigId;
      }
    });
  }
}
