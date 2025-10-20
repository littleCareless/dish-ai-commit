import { vscode } from '@/lib/vscode';

export interface CommitChatConfig {
  style: 'conventional' | 'descriptive' | 'emoji' | 'minimal';
  language: 'zh' | 'en';
  maxLength: number;
  includeScope: boolean;
  includeBody: boolean;
  enableSuggestions: boolean;
  enableCommands: boolean;
  enablePreview: boolean;
  autoSave: boolean;
  customTemplates: Array<{
    name: string;
    pattern: string;
    description: string;
  }>;
}

export interface GlobalConfig {
  [key: string]: any;
}

const defaultCommitChatConfig: CommitChatConfig = {
  style: 'conventional',
  language: 'zh',
  maxLength: 50,
  includeScope: false,
  includeBody: false,
  enableSuggestions: true,
  enableCommands: true,
  enablePreview: true,
  autoSave: true,
  customTemplates: [],
};

export class ConfigSyncService {
  private static instance: ConfigSyncService;
  private config: CommitChatConfig;
  private globalConfig: GlobalConfig;
  private listeners: Array<(config: CommitChatConfig) => void> = [];
  private conflictResolvers: Array<(conflict: ConfigConflict) => Promise<CommitChatConfig>> = [];

  private constructor() {
    this.config = { ...defaultCommitChatConfig };
    this.globalConfig = {};
    this.loadConfig();
  }

  public static getInstance(): ConfigSyncService {
    if (!ConfigSyncService.instance) {
      ConfigSyncService.instance = new ConfigSyncService();
    }
    return ConfigSyncService.instance;
  }

  // 加载配置
  private async loadConfig(): Promise<void> {
    try {
      // 从本地存储加载
      const savedConfig = localStorage.getItem('commit-chat-config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        this.config = { ...defaultCommitChatConfig, ...parsed };
      }

      // 从全局配置加载
      if (vscode) {
        vscode.postMessage({
          command: 'getGlobalConfig',
          data: { keys: this.getConfigKeys() },
        });
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  }

  // 保存配置
  public async saveConfig(config: Partial<CommitChatConfig>): Promise<void> {
    try {
      const newConfig = { ...this.config, ...config };
      
      // 保存到本地存储
      localStorage.setItem('commit-chat-config', JSON.stringify(newConfig));
      
      // 同步到全局配置
      await this.syncToGlobalConfig(newConfig);
      
      this.config = newConfig;
      this.notifyListeners(newConfig);
    } catch (error) {
      console.error('保存配置失败:', error);
      throw error;
    }
  }

  // 获取配置
  public getConfig(): CommitChatConfig {
    return { ...this.config };
  }

  // 获取特定配置项
  public getConfigValue<K extends keyof CommitChatConfig>(key: K): CommitChatConfig[K] {
    return this.config[key];
  }

  // 设置特定配置项
  public async setConfigValue<K extends keyof CommitChatConfig>(
    key: K,
    value: CommitChatConfig[K]
  ): Promise<void> {
    await this.saveConfig({ [key]: value } as Partial<CommitChatConfig>);
  }

  // 同步到全局配置
  private async syncToGlobalConfig(config: CommitChatConfig): Promise<void> {
    if (!vscode) return;

    const globalConfigKeys = this.getGlobalConfigKeys(config);
    
    try {
      vscode.postMessage({
        command: 'updateGlobalConfig',
        data: globalConfigKeys,
      });
    } catch (error) {
      console.error('同步到全局配置失败:', error);
    }
  }

  // 从全局配置同步
  public async syncFromGlobalConfig(globalConfig: GlobalConfig): Promise<void> {
    try {
      const conflicts = this.detectConflicts(globalConfig);
      
      if (conflicts.length > 0) {
        const resolvedConfig = await this.resolveConflicts(conflicts, globalConfig);
        this.config = resolvedConfig;
      } else {
        this.config = this.mergeWithGlobalConfig(globalConfig);
      }
      
      this.notifyListeners(this.config);
    } catch (error) {
      console.error('从全局配置同步失败:', error);
    }
  }

  // 检测配置冲突
  private detectConflicts(globalConfig: GlobalConfig): ConfigConflict[] {
    const conflicts: ConfigConflict[] = [];
    const localConfig = this.getConfig();
    
    for (const [key, globalValue] of Object.entries(globalConfig)) {
      const localValue = localConfig[key as keyof CommitChatConfig];
      
      if (localValue !== undefined && localValue !== globalValue) {
        conflicts.push({
          key: key as keyof CommitChatConfig,
          localValue,
          globalValue,
          timestamp: Date.now(),
        });
      }
    }
    
    return conflicts;
  }

  // 解决配置冲突
  private async resolveConflicts(
    conflicts: ConfigConflict[],
    globalConfig: GlobalConfig
  ): Promise<CommitChatConfig> {
    let resolvedConfig = { ...this.config };
    
    for (const conflict of conflicts) {
      // 尝试使用注册的冲突解决器
      let resolved = false;
      
      for (const resolver of this.conflictResolvers) {
        try {
          const result = await resolver(conflict);
          if (result) {
            resolvedConfig = { ...resolvedConfig, ...result };
            resolved = true;
            break;
          }
        } catch (error) {
          console.error('冲突解决器执行失败:', error);
        }
      }
      
      // 如果没有解决器或解决失败，使用默认策略
      if (!resolved) {
        (resolvedConfig as any)[conflict.key] = this.getDefaultConflictResolution(conflict);
      }
    }
    
    return resolvedConfig;
  }

  // 默认冲突解决策略
  private getDefaultConflictResolution(conflict: ConfigConflict): CommitChatConfig[keyof CommitChatConfig] {
    // 优先使用本地配置，但可以基于配置类型调整策略
    switch (conflict.key) {
      case 'style':
      case 'language':
        // 对于风格和语言，优先使用本地配置
        return conflict.localValue as CommitChatConfig[keyof CommitChatConfig];
      case 'maxLength':
        // 对于长度限制，使用较大的值
        return Math.max(conflict.localValue as number, conflict.globalValue as number) as CommitChatConfig[keyof CommitChatConfig];
      case 'enableSuggestions':
      case 'enableCommands':
      case 'enablePreview':
      case 'autoSave':
        // 对于功能开关，优先使用启用的状态
        return (conflict.localValue || conflict.globalValue) as CommitChatConfig[keyof CommitChatConfig];
      default:
        return conflict.localValue as CommitChatConfig[keyof CommitChatConfig];
    }
  }

  // 合并全局配置
  private mergeWithGlobalConfig(globalConfig: GlobalConfig): CommitChatConfig {
    const merged = { ...this.config };
    
    for (const [key, value] of Object.entries(globalConfig)) {
      if (key in merged) {
        (merged as any)[key] = value;
      }
    }
    
    return merged;
  }

  // 获取配置键列表
  private getConfigKeys(): string[] {
    return Object.keys(defaultCommitChatConfig);
  }

  // 获取全局配置键映射
  private getGlobalConfigKeys(config: CommitChatConfig): Record<string, any> {
    return {
      'commitChat.style': config.style,
      'commitChat.language': config.language,
      'commitChat.maxLength': config.maxLength,
      'commitChat.includeScope': config.includeScope,
      'commitChat.includeBody': config.includeBody,
      'commitChat.enableSuggestions': config.enableSuggestions,
      'commitChat.enableCommands': config.enableCommands,
      'commitChat.enablePreview': config.enablePreview,
      'commitChat.autoSave': config.autoSave,
      'commitChat.customTemplates': config.customTemplates,
    };
  }

  // 重置配置
  public async resetConfig(): Promise<void> {
    await this.saveConfig(defaultCommitChatConfig);
  }

  // 导出配置
  public exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  // 导入配置
  public async importConfig(configJson: string): Promise<void> {
    try {
      const importedConfig = JSON.parse(configJson);
      await this.saveConfig(importedConfig);
    } catch (error) {
      console.error('导入配置失败:', error);
      throw new Error('无效的配置格式');
    }
  }

  // 添加配置变更监听器
  public addConfigListener(listener: (config: CommitChatConfig) => void): () => void {
    this.listeners.push(listener);
    
    // 返回取消监听的函数
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // 添加冲突解决器
  public addConflictResolver(resolver: (conflict: ConfigConflict) => Promise<CommitChatConfig>): void {
    this.conflictResolvers.push(resolver);
  }

  // 通知监听器
  private notifyListeners(config: CommitChatConfig): void {
    this.listeners.forEach(listener => {
      try {
        listener(config);
      } catch (error) {
        console.error('配置监听器执行失败:', error);
      }
    });
  }

  // 验证配置
  public validateConfig(config: Partial<CommitChatConfig>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.maxLength !== undefined) {
      if (config.maxLength < 10) {
        errors.push('最大长度不能小于 10');
      } else if (config.maxLength > 200) {
        warnings.push('最大长度超过 200 可能影响可读性');
      }
    }

    if (config.style && !['conventional', 'descriptive', 'emoji', 'minimal'].includes(config.style)) {
      errors.push('无效的风格类型');
    }

    if (config.language && !['zh', 'en'].includes(config.language)) {
      errors.push('无效的语言设置');
    }

    if (config.customTemplates) {
      for (const template of config.customTemplates) {
        if (!template.name || !template.pattern) {
          errors.push('自定义模板必须包含名称和模式');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export interface ConfigConflict {
  key: keyof CommitChatConfig;
  localValue: any;
  globalValue: any;
  timestamp: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// 导出单例实例
export const configSyncService = ConfigSyncService.getInstance();
