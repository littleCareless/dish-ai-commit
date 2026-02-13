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
  baseUrl: z.string().optional(),
  region: z.string().optional(),
  projectId: z.string().optional(),
  customHeaders: z.record(z.string(), z.string()).optional(),
  models: z.array(modelConfigSchema).optional(),
  defaultModel: z.string().optional(),
  organization: z.string().optional(),
  createdAt: z.date().or(z.string().datetime()).optional(),
  updatedAt: z.date().or(z.string().datetime()).optional(),

  // OpenAI Compatible Custom Settings
  useAzure: z.boolean().optional(),
  azureApiVersion: z.string().optional(),
  enableR1Models: z.boolean().optional(),
  useLegacyFormat: z.boolean().optional(),
  includeMaxTokens: z.boolean().optional(),
  enableReasoningEffort: z.boolean().optional(),
  reasoningEffortLevel: z.string().optional(),
  customModelSupportsPromptCache: z.boolean().optional(),
  customModelMaxTokens: z.number().optional(),
  customModelContextWindow: z.number().optional(),
  customModelInputPrice: z.number().optional(),
  customModelOutputPrice: z.number().optional(),
  customModelCacheReadsPrice: z.number().optional(),
  customModelCacheWritesPrice: z.number().optional(),
});
export type ProviderConfig = z.infer<typeof providerConfigSchema>;

// Zod Schema for UserPreferences
export const userPreferencesSchema = z.object({
  temperature: z.number(),
  verbosity: z.number(),
  rateLimitSeconds: z.number(),
  consecutiveMistakeLimit: z.number(),
  language: z.enum([
    "Simplified Chinese",
    "Traditional Chinese",
    "Japanese",
    "Korean",
    "Czech",
    "German",
    "French",
    "Italian",
    "Dutch",
    "Portuguese",
    "Vietnamese",
    "English",
    "Spanish",
    "Swedish",
    "Russian",
    "Bahasa",
    "Polish",
    "Turkish",
    "Thai",
  ]),
  maxTokens: z.number().optional(),
  timeout: z.number().optional(),
  retryAttempts: z.number().optional(),
  skipDiffFileExtensions: z.array(z.string()).optional(),
  skipDiffPathPatterns: z.array(z.string()).optional(),
  maxDiffFileSizeKB: z.number().optional(),
  autoDetectBinaryFiles: z.boolean().optional(),
  respectGitAttributes: z.boolean().optional(),
  commitTemperature: z.number().optional(),
  reviewTemperature: z.number().optional(),
  branchNameTemperature: z.number().optional(),
  weeklyReportTemperature: z.number().optional(),
});
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

// Zod Schema for Features
export const featuresSchema = z.object({
  largePromptAction: z.enum(["ask", "useFallback", "continue"]),
  enableEmoji: z.boolean(),
  enableMergeCommit: z.boolean(),
  enableBody: z.boolean(),
  enableLayeredCommit: z.boolean(),
  enableGlobalContext: z.boolean(),
  useRecentCommitsAsReference: z.boolean(),
  simplifyDiff: z.boolean(),
  autoDetectStaged: z.boolean(),
  fallbackToAll: z.boolean(),
  diffTarget: z.enum(["staged", "all", "auto"]),
  suppressNonCriticalWarnings: z.boolean(),
  weeklyReport: z.boolean(),
  codeReview: z.boolean(),
  generateBranchName: z.boolean(),
  generatePRSummary: z.boolean(),
});

// Zod Schema for Profile
export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  providers: z.record(z.string(), providerConfigSchema),
  preferences: userPreferencesSchema,
  features: featuresSchema.optional(), // 新增features字段
  createdAt: z.date().or(z.string().datetime()),
  updatedAt: z.date().or(z.string().datetime()),
  version: z.string(),
  activeProviderId: z.string().optional(),
  isAutoMigrated: z.boolean().optional(),
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
    language:
      | "Simplified Chinese"
      | "Traditional Chinese"
      | "Japanese"
      | "Korean"
      | "Czech"
      | "German"
      | "French"
      | "Italian"
      | "Dutch"
      | "Portuguese"
      | "Vietnamese"
      | "English"
      | "Spanish"
      | "Swedish"
      | "Russian"
      | "Bahasa"
      | "Polish"
      | "Turkish"
      | "Thai";
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
export const DEFAULT_SKIP_DIFF_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".tiff",
  ".ico",
  ".pdf",
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",
  ".bz2",
  ".xz",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".o",
  ".a",
  ".so",
  ".dll",
  ".exe",
  ".jar",
  ".war",
  ".ear",
  ".class",
  ".pyc",
  ".swo",
  ".swp",
  ".DS_Store",
  ".lock",
  ".log",
];
export const DEFAULT_SKIP_DIFF_PATTERNS = [
  "**/package-lock.json",
  "**/pnpm-lock.yaml",
  "**/yarn.lock",
];

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  temperature: 0.0,
  verbosity: 0,
  rateLimitSeconds: 5,
  consecutiveMistakeLimit: 3,
  language: "Simplified Chinese",
  maxTokens: 4000,
  timeout: 30000,
  retryAttempts: 3,
  skipDiffFileExtensions: DEFAULT_SKIP_DIFF_EXTENSIONS,
  skipDiffPathPatterns: DEFAULT_SKIP_DIFF_PATTERNS,
  maxDiffFileSizeKB: 1024,
  autoDetectBinaryFiles: true,
  respectGitAttributes: true,
  commitTemperature: 0.7,
  reviewTemperature: 0.8,
  branchNameTemperature: 0.7,
  weeklyReportTemperature: 0.9,
};

export const DEFAULT_OPENAI_CONFIG: ProviderConfig = {
  id: "openai",
  name: "OpenAI",
  type: "first-party",
  models: [], // Assuming models is a required field for ProviderConfig
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const DEFAULT_PROVIDER_CONFIG: Omit<
  ProviderConfig,
  "id" | "name" | "type"
> = {
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

export interface FeatureSettings {
  largePromptAction: "ask" | "useFallback" | "continue";
  enableEmoji: boolean;
  enableMergeCommit: boolean;
  enableBody: boolean;
  enableLayeredCommit: boolean;
  enableGlobalContext: boolean;
  useRecentCommitsAsReference: boolean;
  simplifyDiff: boolean;
  autoDetectStaged: boolean;
  fallbackToAll: boolean;
  diffTarget: "staged" | "all" | "auto";
  suppressNonCriticalWarnings: boolean;
  weeklyReport: boolean;
  codeReview: boolean;
  generateBranchName: boolean;
  generatePRSummary: boolean;
}
