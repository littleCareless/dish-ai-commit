// Provider 类型定义
export type ProviderType =
  | "first-party" // Anthropic, OpenAI, Gemini
  | "aggregator" // OpenRouter, Glama, Unbound
  | "local" // Ollama, LMStudio
  | "cloud" // Bedrock, Vertex
  | "openai-compatible"; // 通用 OpenAI 兼容

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  maxTokens: { input: number; output: number };
  deprecated?: boolean;
  capabilities?: {
    streaming?: boolean;
    functionCalling?: boolean;
  };
  cost?: {
    input: number;
    output: number;
  };
}

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  apiKey?: string;
  baseURL?: string;
  region?: string;
  projectId?: string;
  customHeaders?: Record<string, string>;
  models: ModelConfig[];
  defaultModel?: string;
  organization?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  // 新增字段支持
  cliPath?: string;
  maxOutputTokens?: number;
  useCustomUrl?: boolean;
  apiVersion?: string;
  accountId?: string;

  // 动态字段存储
  customFields?: Record<string, any>;

  // 高级设置
  timeout?: number;
  retries?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface UserPreferences {
  temperature: number;
  verbosity: number;
  rateLimitSeconds: number;
  consecutiveMistakeLimit: number;
  language: string;
  maxTokens?: number;
  timeout?: number;
  retryAttempts?: number;

  // Diff 跳过配置
  skipDiffFileExtensions?: string[];
  maxDiffFileSizeKB?: number;
  autoDetectBinaryFiles?: boolean;
  skipDiffPathPatterns?: string[];
  respectGitAttributes?: boolean;

  // Temperature settings
  commitTemperature?: number;
  reviewTemperature?: number;
  branchNameTemperature?: number;
  weeklyReportTemperature?: number;
}

export interface Profile {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  providers: Record<string, ProviderConfig>;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
  version: string;
}

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
export interface ProfileExport {
  version: string;
  profile: Profile;
  metadata: {
    exportedAt: Date;
    exportedBy: string;
    extensionVersion: string;
  };
}

// 设置变更事件
export interface SettingsChangeEvent {
  type: "provider" | "profile" | "preferences" | "feature";
  action: "create" | "update" | "delete" | "activate";
  target: string;
  timestamp: Date;
}

// 默认常量
export const DEFAULT_SKIP_DIFF_EXTENSIONS = [
  ".lock",
  ".min.js",
  ".map",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".ico",
  ".webp",
  ".tiff",
  ".tif",
  ".psd",
  ".ai",
  ".eps",
  ".raw",
  ".heic",
  ".avif",
  ".mp4",
  ".avi",
  ".mov",
  ".mkv",
  ".webm",
  ".flv",
  ".wmv",
  ".m4v",
  ".mpg",
  ".mpeg",
  ".3gp",
  ".ogv",
  ".mp3",
  ".wav",
  ".ogg",
  ".m4a",
  ".flac",
  ".aac",
  ".wma",
  ".opus",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
];

export const DEFAULT_SKIP_DIFF_PATTERNS = [
  "node_modules/",
  "dist/",
  "build/",
  "coverage/",
  ".git/",
  ".idea/",
  ".vscode/",
];

// 默认配置
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  temperature: 0.0,
  verbosity: 0,
  rateLimitSeconds: 5,
  consecutiveMistakeLimit: 3,
  language: "Simplified Chinese",
  maxTokens: 4000,
  timeout: 30000,
  retryAttempts: 3,

  // Diff defaults
  skipDiffFileExtensions: DEFAULT_SKIP_DIFF_EXTENSIONS,
  maxDiffFileSizeKB: 500,
  autoDetectBinaryFiles: true,
  skipDiffPathPatterns: DEFAULT_SKIP_DIFF_PATTERNS,
  respectGitAttributes: true,

  // Temperature defaults
  commitTemperature: 0.0,
  reviewTemperature: 0.0,
  branchNameTemperature: 0.0,
  weeklyReportTemperature: 0.0,
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
export type ProfileValidator = (profile: Profile) => ConfigValidationResult;
export type ProviderValidator = (
  provider: ProviderConfig,
) => ConfigValidationResult;
export type ConfigMigrator = (oldConfig: any) => Profile;

// 事件回调类型
export type ProfileChangeCallback = (profile: Profile) => void;
export type ProviderChangeCallback = (
  providerId: string,
  provider: ProviderConfig,
) => void;
export type SettingsChangeCallback = (event: SettingsChangeEvent) => void;
