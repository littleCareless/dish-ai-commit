import * as vscode from "vscode";
import {
  ConfigKey,
  ExtensionConfiguration,
  type ConfigurationValueType,
} from "./types";
import { CONFIG_SCHEMA, getCategoryConfigPaths } from "./config-schema";
import { ConfigurationService } from "./services/configuration-service";
import { ConfigurationChangeHandler } from "./services/configuration-change-handler";
import { ProviderConfigValidator } from "./services/provider-config-validator";
import { ConfigurationMonitor } from "./services/configuration-monitor";

/**
 * 管理VSCode扩展配置，支持动态更新和变更处理
 * @class ConfigurationManager
 */
export class ConfigurationManager {
  /** 配置管理器单例 */
  private static instance: ConfigurationManager;

  /** 扩展上下文 */
  private context?: vscode.ExtensionContext;

  /** 核心配置服务 */
  private configService: ConfigurationService;
  private changeHandler: ConfigurationChangeHandler;
  private validator: ProviderConfigValidator;
  private monitor: ConfigurationMonitor;

  /**
   * 私有构造函数，实施单例模式
   * @private
   */
  private constructor() {
    // 初始化各个服务
    this.configService = new ConfigurationService();
    this.changeHandler = new ConfigurationChangeHandler();
    this.validator = new ProviderConfigValidator();
    this.monitor = new ConfigurationMonitor(
      this.configService,
      this.changeHandler
    );

    // 自动注册提供商配置变更处理
    this.registerConfigurationChangeHandler(
      "providers-config",
      this.getProviderConfigPaths(),
      (changedKeys) => this.monitor.handleProviderConfigChanges(changedKeys)
    );

    // 自动注册基础配置变更处理
    this.registerConfigurationChangeHandler(
      "base-config",
      this.getBaseConfigPaths(),
      (changedKeys) => {
        console.log("Base configuration changed:", changedKeys);
      }
    );

    // 自动注册功能配置变更处理
    this.registerConfigurationChangeHandler(
      "features-config",
      this.getFeaturesConfigPaths(),
      (changedKeys) => {
        console.log("Features configuration changed:", changedKeys);
      }
    );
  }

  /**
   * 获取提供商配置路径
   */
  private getProviderConfigPaths(): string[] {
    return getCategoryConfigPaths(CONFIG_SCHEMA, "providers");
  }

  /**
   * 获取基础配置路径
   */
  private getBaseConfigPaths(): string[] {
    return getCategoryConfigPaths(CONFIG_SCHEMA, "base");
  }

  /**
   * 获取功能配置路径
   */
  private getFeaturesConfigPaths(): string[] {
    return getCategoryConfigPaths(CONFIG_SCHEMA, "features");
  }

  /**
   * 获取配置管理器单例
   */
  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * 设置扩展上下文
   */
  public setContext(context: vscode.ExtensionContext): void {
    this.context = context;
  }

  /**
   * 获取特定配置值
   */
  public getConfig<K extends ConfigKey>(
    key: K
  ): K extends keyof ConfigurationValueType
    ? ConfigurationValueType[K]
    : string {
    return this.configService.getConfig(key);
  }

  /**
   * 获取完整扩展配置
   */
  public getConfiguration(
    skipSystemPrompt: boolean = false
  ): ExtensionConfiguration {
    return this.configService.getConfiguration(skipSystemPrompt);
  }

  /**
   * 更新配置值
   */
  public async updateConfig<K extends ConfigKey>(
    key: K,
    value: string
  ): Promise<void> {
    await this.configService.updateConfig(key, value);
  }

  /**
   * 释放配置管理器及其资源
   */
  public dispose(): void {
    console.log("dispose");
    this.monitor.dispose();
    ConfigurationManager.instance =
      undefined as unknown as ConfigurationManager;
  }

  /**
   * 验证当前配置
   */
  public async validateConfiguration(): Promise<boolean> {
    return this.validator.validateConfiguration(this.getConfiguration());
  }

  /**
   * 更新AI提供商和模型配置
   */
  public async updateAIConfiguration(
    provider: ExtensionConfiguration["base"]["provider"],
    model: ExtensionConfiguration["base"]["model"]
  ): Promise<void> {
    await this.configService.updateAIConfiguration(provider, model);
  }

  /**
   * 注册配置变更处理器
   */
  public registerConfigurationChangeHandler(
    handlerId: string,
    affectedKeys: string[],
    callback: (changedKeys: string[]) => void
  ): void {
    this.changeHandler.registerConfigurationChangeHandler(
      handlerId,
      affectedKeys,
      callback
    );
  }

  /**
   * 注销配置变更处理器
   */
  public unregisterConfigurationChangeHandler(handlerId: string): void {
    this.changeHandler.unregisterConfigurationChangeHandler(handlerId);
  }
}
