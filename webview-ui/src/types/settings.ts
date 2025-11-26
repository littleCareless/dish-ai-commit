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
  // Dynamic fields based on provider type
  apiKey?: string;
  baseURL?: string;
  organization?: string;
  region?: string;
  projectId?: string;
  embeddingModel?: string;
  model?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  customHeaders?: Record<string, string>;
  defaultModel?: string;
  createdAt?: Date;
  updatedAt?: Date;

  // 新增字段支持
  cliPath?: string;
  maxOutputTokens?: number;
  useCustomUrl?: boolean;
  apiVersion?: string;
  secretKey?: string;
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
  temperature: number; // Deprecated, kept for backward compatibility if needed, or remove if safe. Let's keep it for now but maybe mark as deprecated in comment.
  commitTemperature: number;
  reviewTemperature: number;
  branchNameTemperature: number;
  weeklyReportTemperature: number;
  verbosity: number;
  rateLimitSeconds: number;
  consecutiveMistakeLimit: number;
  language: string;
  maxTokens?: number;
  timeout?: number;
  retryAttempts?: number;

  // === Diff 跳过配置 ===
  skipDiffFileExtensions: string[]; // 文件扩展名列表
  maxDiffFileSizeKB: number; // 文件大小限制（KB），0 = 不限制
  autoDetectBinaryFiles: boolean; // 自动检测二进制文件
  skipDiffPathPatterns: string[]; // 路径模式列表（Glob 格式）
  respectGitAttributes: boolean; // 读取 .gitattributes 中的 binary 标记
}

export interface Profile {
  id: string;
  name: string;
  description?: string;
  providers: Record<string, ProviderConfig>;
  activeProviderId?: string; // 当前激活的提供商ID
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

// Diff 跳过配置默认值
export const DEFAULT_SKIP_DIFF_EXTENSIONS = [
  // 图片
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".ico",
  ".webp",
  ".svg",
  ".tiff",
  ".tif",
  ".psd",
  ".ai",
  ".eps",
  ".raw",
  ".heic",
  ".avif",
  // 视频
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
  // 音频
  ".mp3",
  ".wav",
  ".ogg",
  ".m4a",
  ".flac",
  ".aac",
  ".wma",
  ".opus",
  // 字体
  ".ttf",
  ".otf",
  ".woff",
  ".woff2",
  ".eot",
  // 压缩包
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".7z",
  ".bz2",
  ".xz",
  // Office & PDF
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  // 二进制
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".wasm",
  ".class",
  ".pyc",
  // 数据库
  ".db",
  ".sqlite",
  ".sqlite3",
];

export const DEFAULT_SKIP_DIFF_PATTERNS = [
  "node_modules/**",
  "dist/**",
  "build/**",
  "**/*.min.js",
  "**/*.min.css",
];

// 默认配置
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  temperature: 0.0,
  commitTemperature: 0.3,
  reviewTemperature: 0.6,
  branchNameTemperature: 0.4,
  weeklyReportTemperature: 0.3,
  verbosity: 0,
  rateLimitSeconds: 5,
  consecutiveMistakeLimit: 3,
  language: "Simplified Chinese",
  maxTokens: 4000,
  timeout: 30000,
  retryAttempts: 3,
  // Diff 跳过配置默认值
  skipDiffFileExtensions: DEFAULT_SKIP_DIFF_EXTENSIONS,
  maxDiffFileSizeKB: 500,
  autoDetectBinaryFiles: true,
  skipDiffPathPatterns: DEFAULT_SKIP_DIFF_PATTERNS,
  respectGitAttributes: true,
};

export const DEFAULT_PROVIDER_CONFIG: Omit<
  ProviderConfig,
  "id" | "name" | "type"
> = {
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
