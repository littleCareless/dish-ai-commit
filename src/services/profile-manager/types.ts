import { z } from "zod";

// Manually implementing the schemas and types based on the provided code.
// This is a placeholder implementation and may need to be adjusted.

export const providerSettingsWithIdSchema = z.any();
export const discriminatedProviderSettingsWithIdSchema = z.any();
export const isSecretStateKey = (key: string): boolean => false;
export type ProviderSettingsEntry = {
    name: string;
    id: string;
    apiProvider?: string;
    modelId?: string;
};
export const DEFAULT_CONSECUTIVE_MISTAKE_LIMIT = 3;
export const getModelId = (config: any): string | undefined => config.apiModelId;
export type ProviderName = string;
export type ProviderSettingsWithId = z.infer<typeof providerSettingsWithIdSchema>;


export const providerProfilesSchema = z.object({
    currentApiConfigId: z.string(),
    apiConfigs: z.record(z.string(), providerSettingsWithIdSchema),
    cloudProfileIds: z.array(z.string()).optional(),
});

export type ProviderProfiles = z.infer<typeof providerProfilesSchema>;

export type Mode = {
    slug: string;
};