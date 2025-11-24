import { z } from "zod";

// Zod Schema for ProviderType
export const providerTypeSchema = z.enum([
  "first-party",
  "aggregator",
  "local",
  "cloud",
  "openai-compatible",
]);
export type ProviderType = z.infer<typeof providerTypeSchema>;

// Zod Schema for ModelConfig
export const modelConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  maxTokens: z.object({
    input: z.number(),
    output: z.number(),
  }),
  deprecated: z.boolean().optional(),
  capabilities: z
    .object({
      streaming: z.boolean().optional(),
      functionCalling: z.boolean().optional(),
    })
    .optional(),
  cost: z
    .object({
      input: z.number(),
      output: z.number(),
    })
    .optional(),
});
export type ModelConfig = z.infer<typeof modelConfigSchema>;

// Zod Schema for ProviderConfig
export const providerConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: providerTypeSchema,
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  region: z.string().optional(),
  projectId: z.string().optional(),
  customHeaders: z.record(z.string(), z.string()).optional(),
  models: z.array(modelConfigSchema),
  defaultModel: z.string().optional(),
  organization: z.string().optional(),
  isActive: z.boolean().optional(),
  createdAt: z.date().or(z.string().datetime()).optional(),
  updatedAt: z.date().or(z.string().datetime()).optional(),
});
export type ProviderConfig = z.infer<typeof providerConfigSchema>;

// Zod Schema for UserPreferences
export const userPreferencesSchema = z.object({
  temperature: z.number(),
  verbosity: z.number(),
  rateLimitSeconds: z.number(),
  consecutiveMistakeLimit: z.number(),
  language: z.enum(["zh", "en"]),
  maxTokens: z.number().optional(),
  timeout: z.number().optional(),
  retryAttempts: z.number().optional(),
});
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

// Zod Schema for Profile
export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  providers: z.record(z.string(), providerConfigSchema),
  preferences: userPreferencesSchema,
  createdAt: z.date().or(z.string().datetime()),
  updatedAt: z.date().or(z.string().datetime()),
  version: z.string(),
});
export type Profile = z.infer<typeof profileSchema>;

// 扩展配置接口
export interface ExtensionConfig {
  features: {
    codeIndexing: boolean;
    commitChat: boolean;
    weeklyReport: boolean;
    autoCommit: boolean;
  };
  workspace: {
    autoSave: boolean;
    backupEnabled: boolean;
    syncEnabled: boolean;
  };
  ui: {
    theme: "light" | "dark" | "auto";
    language: "zh" | "en";
    fontSize: number;
  };
}

// 连接测试结果
export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  latency?: number;
  timestamp: Date;
}

// 配置验证结果
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// 导出/导入格式

// 设置变更事件
export interface SettingsChangeEvent {
  type: "provider" | "profile" | "preferences" | "feature";
  action: "create" | "update" | "delete" | "activate";
  target: string;
  timestamp: Date;
}

// 默认配置
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  temperature: 0.0,
  verbosity: 0,
  rateLimitSeconds: 5,
  consecutiveMistakeLimit: 3,
  language: "zh",
  maxTokens: 4000,
  timeout: 30000,
  retryAttempts: 3,
};

export const DEFAULT_PROVIDER_CONFIG: Omit<
  ProviderConfig,
  "id" | "name" | "type"
> = {
  models: [],
  isActive: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// 工具函数类型
export type ProviderValidator = (
  provider: ProviderConfig
) => ConfigValidationResult;

// 事件回调类型
export type ProviderChangeCallback = (
  providerId: string,
  provider: ProviderConfig
) => void;
export type SettingsChangeCallback = (event: SettingsChangeEvent) => void;
