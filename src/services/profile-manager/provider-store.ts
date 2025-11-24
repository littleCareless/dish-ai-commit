import { ExtensionContext } from "vscode";
import {
  CloudSyncService,
  SyncCloudProfilesResult,
} from "@/services/profile-manager/cloud-sync-service";
import { ModelCapabilityService } from "@/services/profile-manager/model-capability-service";
import { ProfileMigrationService } from "@/services/profile-manager/profile-migration-service";
import { ProviderProfileRepository } from "@/services/profile-manager/provider-profile-repository";
import {
  discriminatedProviderSettingsWithIdSchema,
  Mode,
  ProviderProfiles,
  ProviderSettingsWithId,
} from "@/services/profile-manager/types";

type Subscriber = (profiles: ProviderProfiles) => void;

export class ProviderStore {
  private static instance: ProviderStore;

  private readonly repository: ProviderProfileRepository;
  private readonly migrationService: ProfileMigrationService;
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
    this.migrationService = new ProfileMigrationService(
      context,
      this.repository
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
      const isDirty = await this.migrationService.runMigrations(loadedProfiles);

      // If no active profile is set, activate the first one
      if (!loadedProfiles.currentApiConfigName) {
        if (Object.keys(loadedProfiles.apiConfigs).length > 0) {
          const firstProfileName = Object.keys(loadedProfiles.apiConfigs)[0];
          loadedProfiles.currentApiConfigName = firstProfileName;
          console.log(`Auto-activated first profile: ${firstProfileName}`);
          await this.repository.store(loadedProfiles);
        }
      } else if (isDirty) {
        await this.repository.store(loadedProfiles);
      }

      console.log("initialize", loadedProfiles);
      this.profiles = loadedProfiles;
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
    name: string,
    config: ProviderSettingsWithId
  ): Promise<string> {
    let id = "";
    await this.updateProfiles(async (profiles) => {
      const existingId = profiles.apiConfigs[name]?.id;
      id = config.id || existingId || this.generateId();

      // Check if there's another profile with the same ID but a different name
      // This handles renaming: if we are saving "NewName" with ID "123",
      // we should remove "OldName" which also has ID "123".
      const existingEntry = Object.entries(profiles.apiConfigs).find(
        ([key, conf]) => conf.id === id && key !== name
      );

      if (existingEntry) {
        const [oldName] = existingEntry;
        delete profiles.apiConfigs[oldName];
        // If the old profile was active, update the active profile name
        if (profiles.currentApiConfigName === oldName) {
          profiles.currentApiConfigName = name;
        }
      }

      const filteredConfig =
        discriminatedProviderSettingsWithIdSchema.parse(config);
      profiles.apiConfigs[name] = { ...filteredConfig, id };
    });
    return id;
  }

  public async activateProfile(
    params: { name: string } | { id: string }
  ): Promise<void> {
    await this.updateProfiles(async (profiles) => {
      let nameToActivate: string;
      if ("name" in params) {
        nameToActivate = params.name;
      } else {
        const entry = Object.entries(profiles.apiConfigs).find(
          ([_, apiConfig]) => apiConfig.id === params.id
        );
        if (!entry) {
          throw new Error(`Config with ID '${params.id}' not found`);
        }
        nameToActivate = entry[0];
      }
      profiles.currentApiConfigName = nameToActivate;
    });
  }

  public async deleteConfig(name: string): Promise<void> {
    await this.updateProfiles((profiles) => {
      if (!profiles.apiConfigs[name]) {
        throw new Error(`Config '${name}' not found`);
      }
      if (Object.keys(profiles.apiConfigs).length === 1) {
        throw new Error(`Cannot delete the last remaining configuration`);
      }
      delete profiles.apiConfigs[name];
    });
  }

  public async setModeConfig(mode: string, configId: string): Promise<void> {
    await this.updateProfiles((profiles) => {
      if (!profiles.modeApiConfigs) {
        profiles.modeApiConfigs = {};
      }
      profiles.modeApiConfigs[mode] = configId;
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
    const modes: Mode[] = [
      { slug: "code" },
      { slug: "architect" },
      { slug: "ask" },
      { slug: "debug" },
      { slug: "project-research" },
      { slug: "documentation-writer" },
    ];
    const defaultModeApiConfigs: Record<string, string> = Object.fromEntries(
      modes.map((mode) => [mode.slug, defaultConfigId])
    );
    return {
      currentApiConfigName: "default",
      apiConfigs: { default: { id: defaultConfigId } },
      modeApiConfigs: defaultModeApiConfigs,
      migrations: {
        rateLimitSecondsMigrated: true,
        diffSettingsMigrated: true,
        openAiHeadersMigrated: true,
        consecutiveMistakeLimitMigrated: true,
        todoListEnabledMigrated: true,
      },
    };
  }
  public async importProfile(profile: ProviderProfiles): Promise<void> {
    await this.updateProfiles(async (profiles) => {
      // A simple merge strategy: overwrite existing configs, add new ones.
      for (const [name, config] of Object.entries(profile.apiConfigs)) {
        profiles.apiConfigs[name] = config;
      }
      if (
        profile.currentApiConfigName &&
        profiles.apiConfigs[profile.currentApiConfigName]
      ) {
        profiles.currentApiConfigName = profile.currentApiConfigName;
      }
    });
  }
}
