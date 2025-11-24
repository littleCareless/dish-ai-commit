import { ExtensionContext } from "vscode";
import { ProviderProfiles } from "@/services/profile-manager/types";
import { ProviderProfileRepository } from "@/services/profile-manager/provider-profile-repository";

// Manually defining modes as it's part of the new architecture to be implemented.
export type Mode = {
    slug: string;
    // other properties can be added here as needed
};

export const modes: Mode[] = [
    { slug: "code" },
    { slug: "architect" },
    { slug: "ask" },
    { slug: "debug" },
    { slug: "project-research" },
    { slug: "documentation-writer" },
];

// Type-safe model migrations mapping
type ModelMigrations = {
    [K in string]?: Record<string, string>;
};

const MODEL_MIGRATIONS: ModelMigrations = {
    roo: {
        "roo/code-supernova": "roo/code-supernova-1-million",
    },
} as const;

const DEFAULT_CONSECUTIVE_MISTAKE_LIMIT = 3;

export class ProfileMigrationService {
    private readonly context: ExtensionContext;
    private readonly repository: ProviderProfileRepository;

    constructor(context: ExtensionContext, repository: ProviderProfileRepository) {
        this.context = context;
        this.repository = repository;
    }

    public async runMigrations(providerProfiles: ProviderProfiles): Promise<boolean> {
        let isDirty = false;

        // Migrate existing installs to have per-mode API config map
        if (!providerProfiles.modeApiConfigs) {
            const defaultConfigId = Math.random().toString(36).substring(2, 15);
            // Use the currently selected config for all modes initially
            const currentName = providerProfiles.currentApiConfigName;
            const seedId =
                providerProfiles.apiConfigs[currentName]?.id ??
                Object.values(providerProfiles.apiConfigs)[0]?.id ??
                defaultConfigId;
            providerProfiles.modeApiConfigs = Object.fromEntries(modes.map((m: any) => [m.slug, seedId]));
            isDirty = true;
        }

        // Apply model migrations for all providers
        if (this.applyModelMigrations(providerProfiles)) {
            isDirty = true;
        }

        // Ensure all configs have IDs.
        for (const [_name, apiConfig] of Object.entries(providerProfiles.apiConfigs)) {
            if (!apiConfig.id) {
                apiConfig.id = Math.random().toString(36).substring(2, 15);
                isDirty = true;
            }
        }

        // Ensure migrations field exists
        if (!providerProfiles.migrations) {
            providerProfiles.migrations = {
                rateLimitSecondsMigrated: false,
                diffSettingsMigrated: false,
                openAiHeadersMigrated: false,
                consecutiveMistakeLimitMigrated: false,
                todoListEnabledMigrated: false,
            };
            isDirty = true;
        }

        if (!providerProfiles.migrations.rateLimitSecondsMigrated) {
            await this.migrateRateLimitSeconds(providerProfiles);
            providerProfiles.migrations.rateLimitSecondsMigrated = true;
            isDirty = true;
        }

        if (!providerProfiles.migrations.diffSettingsMigrated) {
            await this.migrateDiffSettings(providerProfiles);
            providerProfiles.migrations.diffSettingsMigrated = true;
            isDirty = true;
        }

        if (!providerProfiles.migrations.openAiHeadersMigrated) {
            await this.migrateOpenAiHeaders(providerProfiles);
            providerProfiles.migrations.openAiHeadersMigrated = true;
            isDirty = true;
        }

        if (!providerProfiles.migrations.consecutiveMistakeLimitMigrated) {
            await this.migrateConsecutiveMistakeLimit(providerProfiles);
            providerProfiles.migrations.consecutiveMistakeLimitMigrated = true;
            isDirty = true;
        }

        if (!providerProfiles.migrations.todoListEnabledMigrated) {
            await this.migrateTodoListEnabled(providerProfiles);
            providerProfiles.migrations.todoListEnabledMigrated = true;
            isDirty = true;
        }

        return isDirty;
    }

    private async migrateRateLimitSeconds(providerProfiles: ProviderProfiles) {
        try {
            let rateLimitSeconds: number | undefined;

            try {
                rateLimitSeconds = await this.context.globalState.get<number>("rateLimitSeconds");
            } catch (error) {
                console.error("[MigrateRateLimitSeconds] Error getting global rate limit:", error);
            }

            if (rateLimitSeconds === undefined) {
                rateLimitSeconds = 0;
            }

            for (const [_name, apiConfig] of Object.entries(providerProfiles.apiConfigs)) {
                if (apiConfig.rateLimitSeconds === undefined) {
                    apiConfig.rateLimitSeconds = rateLimitSeconds;
                }
            }
        } catch (error) {
            console.error(`[MigrateRateLimitSeconds] Failed to migrate rate limit settings:`, error);
        }
    }

    private async migrateDiffSettings(providerProfiles: ProviderProfiles) {
        try {
            let diffEnabled: boolean | undefined;
            let fuzzyMatchThreshold: number | undefined;

            try {
                diffEnabled = await this.context.globalState.get<boolean>("diffEnabled");
                fuzzyMatchThreshold = await this.context.globalState.get<number>("fuzzyMatchThreshold");
            } catch (error) {
                console.error("[MigrateDiffSettings] Error getting global diff settings:", error);
            }

            if (diffEnabled === undefined) {
                diffEnabled = true;
            }

            if (fuzzyMatchThreshold === undefined) {
                fuzzyMatchThreshold = 1.0;
            }

            for (const [_name, apiConfig] of Object.entries(providerProfiles.apiConfigs)) {
                if (apiConfig.diffEnabled === undefined) {
                    apiConfig.diffEnabled = diffEnabled;
                }
                if (apiConfig.fuzzyMatchThreshold === undefined) {
                    apiConfig.fuzzyMatchThreshold = fuzzyMatchThreshold;
                }
            }
        } catch (error) {
            console.error(`[MigrateDiffSettings] Failed to migrate diff settings:`, error);
        }
    }

    private async migrateOpenAiHeaders(providerProfiles: ProviderProfiles) {
        try {
            for (const [_name, apiConfig] of Object.entries(providerProfiles.apiConfigs)) {
                const configAny = apiConfig as any;

                if (
                    configAny.openAiHostHeader &&
                    (!apiConfig.openAiHeaders || Object.keys(apiConfig.openAiHeaders || {}).length === 0)
                ) {
                    apiConfig.openAiHeaders = { Host: configAny.openAiHostHeader };
                    configAny.openAiHostHeader = undefined;
                }
            }
        } catch (error) {
            console.error(`[MigrateOpenAiHeaders] Failed to migrate OpenAI headers:`, error);
        }
    }

    private async migrateConsecutiveMistakeLimit(providerProfiles: ProviderProfiles) {
        try {
            for (const [name, apiConfig] of Object.entries(providerProfiles.apiConfigs)) {
                if (apiConfig.consecutiveMistakeLimit == null) {
                    apiConfig.consecutiveMistakeLimit = DEFAULT_CONSECUTIVE_MISTAKE_LIMIT;
                }
            }
        } catch (error) {
            console.error(`[MigrateConsecutiveMistakeLimit] Failed to migrate consecutive mistake limit:`, error);
        }
    }

    private async migrateTodoListEnabled(providerProfiles: ProviderProfiles) {
        try {
            for (const [_name, apiConfig] of Object.entries(providerProfiles.apiConfigs)) {
                if (apiConfig.todoListEnabled === undefined) {
                    apiConfig.todoListEnabled = true;
                }
            }
        } catch (error) {
            console.error(`[MigrateTodoListEnabled] Failed to migrate todo list enabled setting:`, error);
        }
    }

    private applyModelMigrations(providerProfiles: ProviderProfiles): boolean {
        let migrated = false;
        try {
            for (const [_name, apiConfig] of Object.entries(providerProfiles.apiConfigs)) {
                if (!apiConfig.apiProvider || !apiConfig.apiModelId) {
                    continue;
                }

                const provider = apiConfig.apiProvider as string;
                const providerMigrations = MODEL_MIGRATIONS[provider];
                if (!providerMigrations) {
                    continue;
                }

                const newModelId = providerMigrations[apiConfig.apiModelId];
                if (newModelId && newModelId !== apiConfig.apiModelId) {
                    console.log(
                        `[ModelMigration] Migrating ${apiConfig.apiProvider} model from ${apiConfig.apiModelId} to ${newModelId}`,
                    );
                    apiConfig.apiModelId = newModelId;
                    migrated = true;
                }
            }
        } catch (error) {
            console.error(`[ModelMigration] Failed to apply model migrations:`, error);
        }
        return migrated;
    }
}