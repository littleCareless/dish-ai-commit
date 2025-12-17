import { z } from "zod";

/**
 * Zod schema for ProviderConfig.
 * This defines the shape and types of a provider profile configuration.
 */
export const providerConfigSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    provider: z.string(),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
    modelId: z.string().optional(),
  })
  .passthrough();

/**
 * Represents the configuration for a specific AI provider profile.
 * This is the canonical type for a profile object, inferred from the Zod schema.
 */
export type ProviderConfig = z.infer<typeof providerConfigSchema>;
