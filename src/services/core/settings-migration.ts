import { DISH_CONFIG_PREFIX } from "@/config/constants";
import { ProfileManagerService } from "@/services/profile-manager/profile-manager-service";
import {
  DEFAULT_USER_PREFERENCES,
  Profile,
  ProviderConfig,
  ProviderType,
  UserPreferences,
} from "@/types/settings";
import { formatMessage } from "@/utils/i18n";
import { v4 as uuidv4 } from "uuid";
import * as vscode from "vscode";

export interface MigrationDetectionResult {
  hasOldConfig: boolean;
  providerCount: number;
  hasPreferences: boolean;
  detectedProviders: string[];
}

export interface MigrationPreview {
  profile: Profile;
  source: "package.json";
}

export class SettingsMigration {
  private profileManager: ProfileManagerService;
  private readonly MIGRATION_COMPLETED_KEY = `${DISH_CONFIG_PREFIX}_settings_migration_completed`;

  constructor(profileManager: ProfileManagerService) {
    this.profileManager = profileManager;
  }

  /**
   * Check if migration has already been completed
   */
  isMigrationCompleted(): boolean {
    const context = this.profileManager.getContext();
    if (!context) {
      return false;
    }
    return !!context.workspaceState.get<boolean>(this.MIGRATION_COMPLETED_KEY);
  }

  /**
   * Mark migration as completed
   */
  async markMigrationCompleted(): Promise<void> {
    const context = this.profileManager.getContext();
    if (context) {
      await context.workspaceState.update(this.MIGRATION_COMPLETED_KEY, true);
    }
  }

  /**
   * Detects if there are old configurations in package.json/settings.json
   */
  async detectOldConfiguration(): Promise<MigrationDetectionResult> {
    // If migration is already completed, we don't need to detect anything
    if (this.isMigrationCompleted()) {
      return {
        hasOldConfig: false,
        providerCount: 0,
        hasPreferences: false,
        detectedProviders: [],
      };
    }

    const config = vscode.workspace.getConfiguration("dish-ai-commit");
    const detectedProviders: string[] = [];

    // Check providers
    const providers = this.getAllSupportedProviders();
    for (const providerId of providers) {
      const apiKey = config.get(`providers.${providerId}.apiKey`);
      const baseUrl = config.get(`providers.${providerId}.baseUrl`);
      // Some providers might use other keys like secretKey, endpoint, etc.
      // We check for the most common ones or specific ones.
      const hasConfig =
        apiKey || baseUrl || config.get(`providers.${providerId}.endpoint`);

      if (hasConfig && String(hasConfig).trim().length > 0) {
        detectedProviders.push(providerId);
      }
    }

    // Check preferences (check a few key ones to see if they differ from defaults)
    // Note: get() returns the default value if not set, so we strictly check if it's set in inspection?
    // But inspection API is more complex. For now, we assume if any provider is set, or if base language is set.
    const language = config.get("base.language");
    const hasPreferences =
      language !== "Simplified Chinese" || detectedProviders.length > 0;

    return {
      hasOldConfig: detectedProviders.length > 0 || hasPreferences,
      providerCount: detectedProviders.length,
      hasPreferences,
      detectedProviders,
    };
  }

  /**
   * Generates a preview of the profile that would be created from the old configuration
   */
  async previewMigration(): Promise<MigrationPreview> {
    const profile = await this.createProfileFromConfig();
    return {
      profile,
      source: "package.json",
    };
  }

  /**
   * Performs the actual migration: creates a new profile and saves it.
   * Automatically activates the new profile.
   */
  async performMigration(): Promise<{ success: boolean; profileId: string }> {
    let profile = await this.createProfileFromConfig();
    profile = this.validateAndFixProfile(profile);
    await this.profileManager.saveProfile(profile);
    await this.profileManager.setActiveProfile(profile.id);
    await this.markMigrationCompleted();
    return { success: true, profileId: profile.id };
  }

  /**
   * Validates the profile and attempts to fix issues, such as an invalid active provider.
   */
  private validateAndFixProfile(profile: Profile): Profile {
    let activeProviderId = profile.activeProviderId;

    // Safety check: if no active provider ID is set, try to find one
    if (!activeProviderId) {
      const firstId = Object.keys(profile.providers)[0];
      if (firstId) {
        activeProviderId = firstId;
        profile.activeProviderId = activeProviderId;
      } else {
        // No providers at all? Return as is.
        return profile;
      }
    }

    const activeConfig = profile.providers[activeProviderId];
    const isLocal =
      activeProviderId === "ollama" || activeProviderId === "lmstudio";

    // If active provider is valid (has API key or is local), return as is
    if (activeConfig && (activeConfig.apiKey || isLocal)) {
      return profile;
    }

    // Try to find a better active provider
    let bestProviderId = activeProviderId;
    for (const [id, config] of Object.entries(profile.providers)) {
      if (config.apiKey || id === "ollama" || id === "lmstudio") {
        bestProviderId = id;
        break; // Found one, use it
      }
    }

    if (bestProviderId !== activeProviderId) {
      profile.activeProviderId = bestProviderId;
    }

    return profile;
  }

  private async createProfileFromConfig(): Promise<Profile> {
    const config = vscode.workspace.getConfiguration("dish-ai-commit");
    const now = new Date();

    // Global model from old config
    const globalModel = config.get<string>("base.model");

    // 1. Map Preferences
    const preferences: UserPreferences = {
      ...DEFAULT_USER_PREFERENCES,
      temperature: config.get(
        "base.temperature",
        DEFAULT_USER_PREFERENCES.temperature
      ),
      verbosity: config.get(
        "base.verbosity",
        DEFAULT_USER_PREFERENCES.verbosity
      ),
      rateLimitSeconds: config.get(
        "base.rateLimitSeconds",
        DEFAULT_USER_PREFERENCES.rateLimitSeconds
      ),
      consecutiveMistakeLimit: config.get(
        "base.consecutiveMistakeLimit",
        DEFAULT_USER_PREFERENCES.consecutiveMistakeLimit
      ),
      language: this.mapLanguage(
        config.get("base.language", "Simplified Chinese")
      ) as UserPreferences["language"],
      maxTokens: config.get(
        "base.maxTokens",
        DEFAULT_USER_PREFERENCES.maxTokens
      ),
      timeout: config.get("base.timeout", DEFAULT_USER_PREFERENCES.timeout),
      retryAttempts: config.get(
        "base.retryAttempts",
        DEFAULT_USER_PREFERENCES.retryAttempts
      ),
    };

    // 2. Map Providers
    const providersConfig: Record<string, ProviderConfig> = {};
    const supportedProviders = this.getAllSupportedProviders();

    for (const providerId of supportedProviders) {
      const providerConfig = this.extractProviderConfig(
        config,
        providerId,
        now
      );
      if (providerConfig) {
        providersConfig[providerId] = providerConfig;
      }
    }

    // 3. Determine Active Provider
    // Map the display name from config to the internal ID
    const configProviderName = config.get("base.provider", "OpenAI");
    let activeProviderId = this.mapProviderNameToId(configProviderName);

    // Smart fallback: if the configured provider has no config (and is not local), try to find one that has config
    const activeProviderConfig = providersConfig[activeProviderId];
    const isLocalProvider =
      activeProviderId === "ollama" || activeProviderId === "lmstudio";

    if (!activeProviderConfig && !isLocalProvider) {
      // Try to find the first available provider with config
      const availableProviderId = Object.keys(providersConfig)[0];
      if (availableProviderId) {
        activeProviderId = availableProviderId;
      }
    }

    // Apply global model to active provider if it exists
    if (globalModel && providersConfig[activeProviderId]) {
      providersConfig[activeProviderId].defaultModel = globalModel;
    }

    // 4. Create Profile
    const profile: Profile = {
      id: uuidv4(),
      name: formatMessage("migration.profile.name"),
      description: formatMessage("migration.profile.description", [
        now.toLocaleString(),
      ]),
      providers: providersConfig,
      preferences: preferences,
      createdAt: now,
      updatedAt: now,
      version: "1.0.0",
      activeProviderId: activeProviderId,
      isAutoMigrated: true,
    };

    return profile;
  }

  private extractProviderConfig(
    config: vscode.WorkspaceConfiguration,
    providerId: string,
    now: Date
  ): ProviderConfig | null {
    const section = `providers.${providerId}`;
    const apiKey = config.get<string>(`${section}.apiKey`);
    const baseUrl = config.get<string>(`${section}.baseUrl`);

    // Check for other specific fields
    const endpoint = config.get<string>(`${section}.endpoint`);
    const apiVersion = config.get<string>(`${section}.apiVersion`);
    const orgId = config.get<string>(`${section}.orgId`);
    const accountId = config.get<string>(`${section}.accountId`);
    const projectId = config.get<string>(`${section}.projectId`);
    const location = config.get<string>(`${section}.location`);
    const apiEndpoint = config.get<string>(`${section}.apiEndpoint`);
    const googleAuthOptions = config.get<string>(
      `${section}.googleAuthOptions`
    );

    // Basic validation: if no key/url/endpoint is set, skip it (unless it's a local provider that might not need it, but usually they need a URL)
    // For local providers like Ollama, baseUrl is default, so we might want to include it if it's explicitly set or just always include it?
    // Let's include it if any relevant field is non-empty string.
    const hasAnyConfig = [apiKey, baseUrl, endpoint, projectId].some(
      (v) => v && v.trim().length > 0
    );

    // Special case for Ollama: it has a default URL, so we might want to include it even if user didn't change it?
    // But to avoid clutter, maybe only if we detect usage?
    // For migration, let's be generous: if we can map it, we map it.
    // But we don't want to create empty configs for all 20 providers.
    if (!hasAnyConfig && providerId !== "ollama" && providerId !== "lmstudio") {
      return null;
    }

    // Construct the config object
    // We use 'any' for the extra fields to bypass strict typing if ProviderConfig doesn't have them all yet,
    // but we should try to match the schema.
    const baseConfig: any = {
      id: providerId,
      name: this.capitalize(providerId),
      type: this.getProviderType(providerId),
      createdAt: now,
      updatedAt: now,
    };

    if (apiKey) {
      baseConfig.apiKey = apiKey;
    }
    if (baseUrl) {
      baseConfig.baseUrl = baseUrl;
    }

    // Provider specific fields mapping
    if (providerId === "azureOpenai") {
      if (endpoint) {
        baseConfig.endpoint = endpoint;
      }
      if (apiVersion) {
        baseConfig.apiVersion = apiVersion;
      }
      if (orgId) {
        baseConfig.orgId = orgId;
      }
    }
    if (providerId === "cloudflare" && accountId) {
      baseConfig.accountId = accountId;
    }
    if (providerId === "vertexai") {
      if (projectId) {
        baseConfig.projectId = projectId;
      }
      if (location) {
        baseConfig.location = location;
      }
      if (apiEndpoint) {
        baseConfig.apiEndpoint = apiEndpoint;
      }
      if (googleAuthOptions) {
        baseConfig.googleAuthOptions = googleAuthOptions;
      }
    }

    // Map model if it exists in base config and this is the active provider?
    // Or does each provider have a model config?
    // In the old config, `base.model` was global.
    // We should set the default model for the provider if it matches the active one,
    // or just leave it to default.
    // The new ProviderConfig has `models` array and `defaultModel`.
    // We'll leave `models` empty (will be fetched) and set `defaultModel` if applicable.

    return baseConfig as ProviderConfig;
  }

  private mapLanguage(lang: string) {
    const map: Record<string, string> = {
      zh: "Simplified Chinese",
      "zh-cn": "Simplified Chinese",
      "zh-CN": "Simplified Chinese",
      en: "English",
      "en-US": "English",
      // Add other legacy codes if necessary
    };
    return map[lang] || lang;
  }

  private mapProviderNameToId(name: string): string {
    const map: Record<string, string> = {
      OpenAI: "openai",
      Ollama: "ollama",
      "VS Code Provided": "vscode",
      Zhipu: "zhipu",
      DashScope: "dashscope",
      Doubao: "doubao",
      Gemini: "gemini",
      Deepseek: "deepseek",
      Siliconflow: "siliconflow",
      OpenRouter: "openrouter",
      PremAI: "premai",
      Together: "together",
      Anthropic: "anthropic",
      Mistral: "mistral",
      "Baidu Qianfan": "baiduQianfan",
      "Azure OpenAI": "azureOpenai",
      Cloudflare: "cloudflare",
      GoogleAI: "google",
      VertexAI: "vertexai",
      LMStudio: "lmstudio",
    };
    return map[name] || "openai";
  }

  private getAllSupportedProviders(): string[] {
    return [
      "openai",
      "zhipu",
      "dashscope",
      "doubao",
      "ollama",
      "gemini",
      "baiduQianfan",
      "deepseek",
      "siliconflow",
      "openrouter",
      "perplexity",
      "premai",
      "together",
      "xai",
      "anthropic",
      "mistral",
      "azureOpenai",
      "cloudflare",
      "vertexai",
      "groq",
      "lmstudio",
      "openai-compatible",
    ];
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
      lmstudio: "local",
      azureOpenai: "cloud",
      vertexai: "cloud",
      bedrock: "cloud",
      cloudflare: "cloud",
    };
    return typeMap[providerId] || "openai-compatible";
  }

  // Deprecated method, kept for compatibility if needed, but we redirect to performMigration
  async migrateFromPackageJson(): Promise<Profile> {
    const result = await this.performMigration();
    return this.profileManager.getProfileById(result.profileId);
  }

  /**
   * Ensures a default profile exists if no profiles are present.
   */
  async ensureDefaultProfile(): Promise<{
    created: boolean;
    profileId?: string;
  }> {
    const hasProfiles = await this.profileManager.hasProfiles();
    if (hasProfiles) {
      return { created: false };
    }

    const now = new Date();
    const profileId = uuidv4();
    const defaultProfile: Profile = {
      id: profileId,
      name: formatMessage("migration.profile.defaultName") || "Default Profile",
      description:
        formatMessage("migration.profile.defaultDescription") ||
        "Created by Dish AI Commit",
      providers: {},
      preferences: { ...DEFAULT_USER_PREFERENCES },
      createdAt: now,
      updatedAt: now,
      version: "1.0.0",
      activeProviderId: undefined,
    };

    // Add a default OpenAI placeholder
    defaultProfile.providers["openai"] = {
      id: "openai",
      name: "OpenAI",
      type: "first-party",
      createdAt: now,
      updatedAt: now,
    };
    defaultProfile.activeProviderId = "openai";

    await this.profileManager.saveProfile(defaultProfile);
    await this.profileManager.setActiveProfile(profileId);

    return { created: true, profileId };
  }
}

// Export singleton instance with lazy initialization
let _settingsMigration: SettingsMigration | null = null;

export function getSettingsMigration(): SettingsMigration {
  if (!_settingsMigration) {
    _settingsMigration = new SettingsMigration(
      ProfileManagerService.getInstance()
    );
  }
  return _settingsMigration;
}

// For backward compatibility, export as a getter
export const settingsMigration = {
  detectOldConfiguration: () => getSettingsMigration().detectOldConfiguration(),
  previewMigration: () => getSettingsMigration().previewMigration(),
  performMigration: () => getSettingsMigration().performMigration(),
  migrateFromPackageJson: () => getSettingsMigration().migrateFromPackageJson(),
  ensureDefaultProfile: () => getSettingsMigration().ensureDefaultProfile(),
};
