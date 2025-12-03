import {
  CloudSyncService,
  SyncCloudProfilesResult,
} from "@/services/profile-manager/cloud-sync-service";
import { ModelCapabilityService } from "@/services/profile-manager/model-capability-service";
import { ProviderProfileRepository } from "@/services/profile-manager/provider-profile-repository";
import {
  discriminatedProviderSettingsWithIdSchema,
  ProviderProfiles,
  ProviderSettingsWithId
} from "@/services/profile-manager/types";
import { ExtensionContext } from "vscode";

type Subscriber = (profiles: ProviderProfiles) => void;

export class ProviderStore {
  private static instance: ProviderStore;

  private readonly repository: ProviderProfileRepository;
  private readonly cloudSyncService: CloudSyncService;
  private readonly capabilityService: ModelCapabilityService;

  private profiles: ProviderProfiles | null = null;
  private subscribers: Subscriber[] = [];

  private constructor(context: ExtensionContext) {
    const defaultProviderProfiles = this.getDefaultProfiles();
    this.repository = new ProviderProfileRepository(
      context,
      defaultProviderProfiles
    );
    this.cloudSyncService = new CloudSyncService(this.repository);
    this.capabilityService = ModelCapabilityService.instance;
    this.initialize().catch(console.error);
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

      // Check if this is the first initialization (no profiles in storage)
      const isFirstInit = Object.keys(loadedProfiles.apiConfigs).length === 0;

      if (isFirstInit) {
        // First time initialization: use default profiles and persist them
        const defaultProfiles = this.getDefaultProfiles();
        await this.repository.store(defaultProfiles);
        this.profiles = defaultProfiles;
        console.log("First initialization: created and saved default profile");
      } else {
        // Existing profiles: check if active profile is set
        if (!loadedProfiles.currentApiConfigId) {
          if (Object.keys(loadedProfiles.apiConfigs).length > 0) {
            const firstProfileId = Object.values(loadedProfiles.apiConfigs)[0].id;
            loadedProfiles.currentApiConfigId = firstProfileId;
            console.log(`Auto-activated first profile by ID: ${firstProfileId}`);
            await this.repository.store(loadedProfiles);
          }
        }
        this.profiles = loadedProfiles;
        console.log("initialize", loadedProfiles);
      }

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

  public async saveConfig(
    config: ProviderSettingsWithId
  ): Promise<string> {
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
    const profiles = await this.repository.load();
    const configs = profiles.apiConfigs;
    for (const name in configs) {
      const config = configs[name];
      if (!config.apiProvider) {
        continue;
      }

      const modelInfo = await this.capabilityService.getModelInfo(config);
      if (modelInfo) {
        // Adapt to the actual AIModel structure, which uses a 'capabilities' object.
        // The logic for 'supportsBudget' is an assumption based on the original code's intent.
        const supportsBudget = modelInfo.capabilities?.functionCalling;
        if (!supportsBudget) {
          delete config.modelMaxTokens;
          delete config.modelMaxThinkingTokens;
        }
      }
    }
    return profiles;
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
    const now = new Date().toISOString();
    return {
      currentApiConfigId: defaultConfigId,
      apiConfigs: {
        [defaultConfigId]: {
          id: defaultConfigId,
          name: "默认配置",
          description: "系统默认配置",
          createdAt: now,
          updatedAt: now,
          version: "1.0.0",
          activeProviderId: "openai",
          providers: {
            openai: {
              apiKey: "",
              baseUrl: "https://api.openai.com/v1",
              model: "gpt-3.5-turbo"
            }
          },
          preferences: {
            temperature: 0.0,
            commitTemperature: 0.3,
            reviewTemperature: 0.6,
            branchNameTemperature: 0.4,
            weeklyReportTemperature: 0.3,
            verbosity: 0,
            rateLimitSeconds: 5,
            consecutiveMistakeLimit: 3,
            language: "Simplified Chinese",
            maxTokens: 4000,
            timeout: 30000,
            retryAttempts: 3,
          },
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
      if (profile.currentApiConfigId && profiles.apiConfigs[profile.currentApiConfigId]) {
        profiles.currentApiConfigId = profile.currentApiConfigId;
      }
    });
  }
}
