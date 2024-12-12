import * as vscode from "vscode";
import {
  ConfigKeys,
  ConfigKey,
  ExtensionConfiguration,
  type ConfigurationValueType,
  PROVIDER_REQUIRED_FIELDS,
} from "./types";
import { EXTENSION_NAME } from "../constants";
import { generateCommitMessageSystemPrompt } from "../prompt/prompt";
import { AIProviderFactory } from "../ai/AIProviderFactory";
import { LocalizationManager } from "../utils/LocalizationManager";
import { SCMFactory } from "../scm/SCMProvider";
import {
  CONFIG_SCHEMA,
  ConfigValue,
  ConfigObject,
  generateConfiguration,
  isConfigValue,
} from "./ConfigSchema";
import { getSystemPrompt } from "../ai/utils/generateHelper";

export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private configuration: vscode.WorkspaceConfiguration;
  private configCache: Map<string, any> = new Map();
  private readonly disposables: vscode.Disposable[] = [];
  private context?: vscode.ExtensionContext;
  private configurationInProgress: boolean = false;

  private getUpdatedValue<T>(key: string): T | undefined {
    // 直接从workspace configuration获取最新值
    return this.configuration.get<T>(key);
  }

  /**
   * 更新配置缓存
   */
  private updateConfigCache(changedKeys: string[]): void {
    changedKeys.forEach((key) => {
      const value = this.getUpdatedValue(key);
      if (value !== undefined) {
        console.log(`更新配置缓存: ${key} = `, value);
        this.configCache.set(key, value);
      }
    });
  }

  private constructor() {
    this.configuration = vscode.workspace.getConfiguration(EXTENSION_NAME);

    // 修改配置监听方式
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        console.log("Configuration changed event triggered");

        // 获取所有配置路径
        const changedKeys = this.getChangedConfigurationKeys(event);

        if (changedKeys.length > 0) {
          // 更新配置缓存
          this.updateConfigCache(changedKeys);
          // 刷新配置实例
          this.configuration =
            vscode.workspace.getConfiguration(EXTENSION_NAME);
          // 处理配置变更
          this.handleConfigurationChange(changedKeys);
        }
      })
    );
  }

  /**
   * 获取所有发生变化的配置项的键
   */
  private getChangedConfigurationKeys(
    event: vscode.ConfigurationChangeEvent
  ): string[] {
    const changedKeys: string[] = [];

    function traverse(obj: ConfigObject, path: string = "") {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = path ? `${path}.${key}` : key;
        if (isConfigValue(value)) {
          // 是配置项
          const fullKey = `${EXTENSION_NAME}.${newPath}`;
          if (event.affectsConfiguration(fullKey)) {
            changedKeys.push(newPath);
          }
        } else {
          // 是分类，继续遍历
          traverse(value as ConfigObject, newPath);
        }
      }
    }

    traverse(CONFIG_SCHEMA as unknown as ConfigObject);
    return changedKeys;
  }

  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  public setContext(context: vscode.ExtensionContext): void {
    this.context = context;
  }

  // 修改 getConfig 方法的类型处理
  public getConfig<K extends ConfigKey>(
    key: K,
    useCache: boolean = true
  ): K extends keyof ConfigurationValueType
    ? ConfigurationValueType[K]
    : string {
    console.log("获取配置项:", key, ConfigKeys);
    const configKey = ConfigKeys[key].replace("dish-ai-commit.", "");

    if (!useCache) {
      const value = this.configuration.get<string>(configKey);
      return value as K extends keyof ConfigurationValueType
        ? ConfigurationValueType[K]
        : string;
    }

    if (!this.configCache.has(configKey)) {
      const value = this.configuration.get<string>(configKey);
      this.configCache.set(configKey, value);
    }
    return this.configCache.get(
      configKey
    ) as K extends keyof ConfigurationValueType
      ? ConfigurationValueType[K]
      : string;
  }

  public getConfiguration(
    skipSystemPrompt: boolean = false
  ): ExtensionConfiguration {
    if (this.configurationInProgress) {
      // 如果已经在获取配置过程中，返回基本配置而不包含 systemPrompt
      const config = generateConfiguration(CONFIG_SCHEMA, (key: string) => {
        return this.configuration.get<any>(`${key}`);
      });
      return config as ExtensionConfiguration;
    }

    try {
      this.configurationInProgress = true;

      // 使用generateConfiguration自动生成配置
      const config = generateConfiguration(CONFIG_SCHEMA, (key: string) => {
        return this.configuration.get<any>(`${key}`);
      });

      // 只在非跳过模式下且明确需要 systemPrompt 时才生成
      if (!skipSystemPrompt && !config.base.systemPrompt) {
        const currentScm = SCMFactory.getCurrentSCMType() || "git";
        const promptConfig = {
          ...config.base,
          ...config.features.commitFormat,
          ...config.features.codeAnalysis,
          scm: currentScm,
          diff: "",
          additionalContext: "",
          model: {},
        };

        config.base.systemPrompt = getSystemPrompt(promptConfig);
      }

      return config as ExtensionConfiguration;
    } finally {
      this.configurationInProgress = false;
    }
  }

  // 修改updateConfig方法签名，使用条件类型处理值的类型
  public async updateConfig<K extends ConfigKey>(
    key: K,
    value: string
  ): Promise<void> {
    await this.configuration.update(
      ConfigKeys[key].replace("dish-ai-commit.", ""),
      value,
      true
    );
  }

  /**
   * Dispose the configuration manager by clearing resources
   */
  public dispose(): void {
    console.log("dispose");
    this.configCache.clear();
    this.disposables.forEach((d) => d.dispose());
    ConfigurationManager.instance =
      undefined as unknown as ConfigurationManager;
  }

  /**
   * 处理配置变更事件
   */
  private handleConfigurationChange(changedKeys: string[]): void {
    console.log("发生变化的配置项:", changedKeys);

    // 处理提供商相关的配置变更
    const providerChanges = new Set(
      changedKeys.map((key) => key.split(".")[0])
    );

    // 检查各提供商的配置变更
    if (providerChanges.has("providers")) {
      // OpenAI 配置变更
      if (changedKeys.some((key) => key.startsWith("providers.openai"))) {
        AIProviderFactory.reinitializeProvider("OpenAI");
        console.log(
          "OpenAI provider has been reinitialized due to config changes"
        );
      }

      // Ollama 配置变更
      if (changedKeys.some((key) => key.startsWith("providers.ollama"))) {
        AIProviderFactory.reinitializeProvider("Ollama");
        console.log(
          "Ollama provider has been reinitialized due to config changes"
        );
      }

      // 其他提供商的配置变更...
      if (changedKeys.some((key) => key.startsWith("providers.zhipuai"))) {
        AIProviderFactory.reinitializeProvider("ZhipuAI");
        console.log(
          "ZhipuAI provider has been reinitialized due to config changes"
        );
      }

      if (changedKeys.some((key) => key.startsWith("providers.dashscope"))) {
        AIProviderFactory.reinitializeProvider("DashScope");
        console.log(
          "DashScope provider has been reinitialized due to config changes"
        );
      }

      if (changedKeys.some((key) => key.startsWith("providers.doubao"))) {
        AIProviderFactory.reinitializeProvider("Doubao");
        console.log(
          "Doubao provider has been reinitialized due to config changes"
        );
      }
    }

    // 处理基础配置变更
    if (changedKeys.some((key) => key.startsWith("base."))) {
      // 可以添加基础配置变更的处理逻辑
      console.log("Base configuration changed");
    }

    // 处理功能配置变更
    if (changedKeys.some((key) => key.startsWith("features."))) {
      // 可以添加功能配置变更的处理逻辑
      console.log("Features configuration changed");
    }
  }

  /**
   * 验证配置是否有效
   */
  public async validateConfiguration(): Promise<boolean> {
    const config = this.getConfiguration();
    const provider = (config.base.provider as string).toLowerCase();

    // VS Code 提供的AI不需要验证
    if (provider === "vs code provided") {
      return true;
    }

    // 检查是否是支持的提供商
    if (provider in PROVIDER_REQUIRED_FIELDS) {
      const requiredField = PROVIDER_REQUIRED_FIELDS[provider];
      return this.validateProviderConfig(
        provider as keyof ExtensionConfiguration["providers"],
        requiredField
      );
    }

    return false;
  }

  /**
   * 通用的提供商配置验证方法
   */
  private async validateProviderConfig(
    provider: keyof ExtensionConfiguration["providers"],
    requiredField: "apiKey" | "baseUrl"
  ): Promise<boolean> {
    const config = this.getConfiguration();
    const locManager = LocalizationManager.getInstance();
    const providerConfig = config.providers[provider];

    // 类型守卫：检查必需字段是否存在于提供商配置中
    if (
      !providerConfig ||
      !(requiredField in providerConfig) ||
      !providerConfig[requiredField as keyof typeof providerConfig]
    ) {
      const settingKey = `PROVIDERS_${provider.toUpperCase()}_${requiredField.toUpperCase()}`;
      const action = await vscode.window.showErrorMessage(
        locManager.getMessage(`${provider}.${requiredField}.missing`),
        locManager.getMessage("button.yes"),
        locManager.getMessage("button.no")
      );

      if (action === locManager.getMessage("button.yes")) {
        await vscode.commands.executeCommand(
          "workbench.action.openSettings",
          `dish-ai-commit.${settingKey}`
        );
      }
      return false;
    }
    return true;
  }

  /**
   * 更新 AI 提供商和模型配置
   */
  public async updateAIConfiguration(
    provider: ExtensionConfiguration["base"]["provider"],
    model: ExtensionConfiguration["base"]["model"]
  ): Promise<void> {
    await Promise.all([
      this.updateConfig("BASE_PROVIDER" as ConfigKey, provider),
      this.updateConfig("BASE_MODEL" as ConfigKey, model),
    ]);
  }
}
