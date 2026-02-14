import { DISH_CONFIG_PREFIX } from "@/config/constants";
import {
  ProviderProfiles,
  providerProfilesSchema,
  ProviderSettingsWithId,
  providerSettingsWithIdSchema,
} from "@/services/profile-manager/types";
import { TelemetryService } from "@/services/telemetry-service";
import { ExtensionContext } from "vscode";
import { z, ZodError } from "zod";

export class ProviderProfileRepository {
  private readonly context: ExtensionContext;
  private readonly defaultProviderProfiles: ProviderProfiles;
  // Synchronize readConfig/writeConfig operations to avoid data loss.
  private _lock = Promise.resolve();

  constructor(
    context: ExtensionContext,
    defaultProviderProfiles: ProviderProfiles
  ) {
    this.context = context;
    this.defaultProviderProfiles = defaultProviderProfiles;
  }

  private get secretsKey(): string {
    return `${DISH_CONFIG_PREFIX}_api_config`;
  }

  public lock<T>(cb: () => Promise<T>): Promise<T> {
    const next = this._lock.then(cb);
    this._lock = next.catch(() => {}) as Promise<void>;
    return next;
  }

  public async load(): Promise<ProviderProfiles> {
    try {
      const content = await this.context.secrets.get(this.secretsKey);

      if (!content) {
        return this.defaultProviderProfiles;
      }

      const providerProfiles = providerProfilesSchema
        .extend({
          apiConfigs: z.record(z.string(), z.any()),
        })
        .parse(JSON.parse(content));

      const apiConfigs = Object.entries(providerProfiles.apiConfigs).reduce(
        (acc, [key, apiConfig]) => {
          const result = providerSettingsWithIdSchema.safeParse(apiConfig);
          if (result.success) {
            return { ...acc, [key]: result.data };
          } else {
            console.error(
              `[ProviderProfileRepository] Failed to parse API config with key '${key}'. Skipping.`,
              {
                error: result.error.flatten(),
                data: apiConfig,
              }
            );
            TelemetryService.instance.captureSchemaValidationError({
              schemaName: `ProviderSettingsWithId:${key}`,
              error: result.error,
              data: apiConfig,
            });
            return acc;
          }
        },
        {} as Record<string, ProviderSettingsWithId>
      );

      const loaded = {
        ...providerProfiles,
        apiConfigs: Object.fromEntries(
          Object.entries(apiConfigs).filter(
            ([_, apiConfig]) => apiConfig !== null
          )
        ),
      };

      return loaded;
    } catch (error) {
      if (error instanceof ZodError) {
        TelemetryService.instance.captureSchemaValidationError({
          schemaName: "ProviderProfiles",
          error,
        });
      }

      throw new Error(
        `Failed to read provider profiles from secrets: ${error}`
      );
    }
  }

  public async store(providerProfiles: ProviderProfiles): Promise<void> {
    try {
      await this.context.secrets.store(
        this.secretsKey,
        JSON.stringify(this.sanitizeProfiles(providerProfiles), null, 2)
      );
    } catch (error) {
      throw new Error(`Failed to write provider profiles to secrets: ${error}`);
    }
  }

  public async resetAll(): Promise<void> {
    await this.context.secrets.delete(this.secretsKey);
  }

  private sanitizeProfiles(profiles: ProviderProfiles): ProviderProfiles {
    const sanitized: ProviderProfiles = {
      ...profiles,
      apiConfigs: Object.fromEntries(
        Object.entries(profiles.apiConfigs).map(([key, value]) => [
          key,
          this.stripPreferences(value),
        ])
      ),
    };

    return sanitized;
  }

  private stripPreferences(profile: ProviderSettingsWithId): ProviderSettingsWithId {
    const { preferences, ...rest } = profile;
    return rest as ProviderSettingsWithId;
  }
}
