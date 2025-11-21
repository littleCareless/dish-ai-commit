import { ExtensionContext } from "vscode";
import { z, ZodError } from "zod";
import { TelemetryService } from "../telemetry-service";
import {
  ProviderProfiles,
  providerProfilesSchema,
  ProviderSettingsWithId,
  providerSettingsWithIdSchema,
} from "./types";

export class ProviderProfileRepository {
  private static readonly SCOPE_PREFIX = "dish_config_";
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
    return `${ProviderProfileRepository.SCOPE_PREFIX}api_config`;
  }

  public lock<T>(cb: () => Promise<T>): Promise<T> {
    const next = this._lock.then(cb);
    this._lock = next.catch(() => {}) as Promise<void>;
    return next;
  }

  public async load(): Promise<ProviderProfiles> {
    try {
      console.log("this.secretsKey", this.secretsKey);
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
          return result.success ? { ...acc, [key]: result.data } : acc;
        },
        {} as Record<string, ProviderSettingsWithId>
      );

      return {
        ...providerProfiles,
        apiConfigs: Object.fromEntries(
          Object.entries(apiConfigs).filter(
            ([_, apiConfig]) => apiConfig !== null
          )
        ),
      };
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
        JSON.stringify(providerProfiles, null, 2)
      );
    } catch (error) {
      throw new Error(`Failed to write provider profiles to secrets: ${error}`);
    }
  }

  public async resetAll(): Promise<void> {
    await this.context.secrets.delete(this.secretsKey);
  }
}
