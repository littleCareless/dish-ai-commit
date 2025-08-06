/**
 * 模型信息配置管理
 * 定义模型信息获取和更新的相关配置
 */

export interface ModelRegistryConfig {
  /** 缓存生存时间（毫秒） */
  cacheTTL: number;
  /** API请求超时时间（毫秒） */
  apiTimeout: number;
  /** 是否启用自动更新 */
  autoUpdate: boolean;
  /** 自动更新间隔（毫秒） */
  autoUpdateInterval: number;
  /** 是否在启动时检查更新 */
  checkOnStartup: boolean;
  /** 失败重试次数 */
  maxRetries: number;
  /** 重试间隔（毫秒） */
  retryDelay: number;
}

/**
 * 默认配置
 */
export const DEFAULT_MODEL_REGISTRY_CONFIG: ModelRegistryConfig = {
  cacheTTL: 24 * 60 * 60 * 1000, // 24小时
  apiTimeout: 10000, // 10秒
  autoUpdate: false, // 默认不自动更新
  autoUpdateInterval: 7 * 24 * 60 * 60 * 1000, // 7天
  checkOnStartup: true, // 启动时检查
  maxRetries: 3,
  retryDelay: 1000 // 1秒
};

/**
 * 模型信息配置管理器
 */
export class ModelRegistryConfigManager {
  private static instance: ModelRegistryConfigManager;
  private config: ModelRegistryConfig;

  private constructor() {
    this.config = { ...DEFAULT_MODEL_REGISTRY_CONFIG };
  }

  public static getInstance(): ModelRegistryConfigManager {
    if (!ModelRegistryConfigManager.instance) {
      ModelRegistryConfigManager.instance = new ModelRegistryConfigManager();
    }
    return ModelRegistryConfigManager.instance;
  }

  /**
   * 获取配置
   */
  getConfig(): ModelRegistryConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<ModelRegistryConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * 重置为默认配置
   */
  resetToDefault(): void {
    this.config = { ...DEFAULT_MODEL_REGISTRY_CONFIG };
  }

  /**
   * 获取特定配置项
   */
  get<K extends keyof ModelRegistryConfig>(key: K): ModelRegistryConfig[K] {
    return this.config[key];
  }

  /**
   * 设置特定配置项
   */
  set<K extends keyof ModelRegistryConfig>(key: K, value: ModelRegistryConfig[K]): void {
    this.config[key] = value;
  }
}