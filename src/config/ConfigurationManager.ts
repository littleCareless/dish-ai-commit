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
import { getMessage } from "../utils/i18n";
import { SCMFactory } from "../scm/SCMProvider";
import {
  CONFIG_SCHEMA,
  ConfigValue,
  ConfigObject,
  generateConfiguration,
  isConfigValue,
  getAllConfigPaths,
  getCategoryConfigPaths,
} from "./ConfigSchema";
import { getSystemPrompt } from "../ai/utils/generateHelper";

/**
 * Manages VSCode extension configuration with support for dynamic updates and change handlers
 * @class ConfigurationManager
 */
export class ConfigurationManager {
  /** Singleton instance of the configuration manager */
  private static instance: ConfigurationManager;

  /** VSCode workspace configuration instance */
  private configuration: vscode.WorkspaceConfiguration;

  /** Collection of disposable resources */
  private readonly disposables: vscode.Disposable[] = [];

  /** Extension context */
  private context?: vscode.ExtensionContext;

  /** Flag to prevent recursive configuration loading */
  private configurationInProgress: boolean = false;

  /** Map of registered configuration change handlers */
  private configChangeHandlers: Map<string, (changedKeys: string[]) => void> =
    new Map();

  /**
   * Gets configuration paths for provider settings
   * @returns {string[]} Array of provider configuration paths
   * @private
   */
  private getProviderConfigPaths(): string[] {
    return getCategoryConfigPaths(CONFIG_SCHEMA, "providers");
  }

  /**
   * Gets configuration paths for base settings
   * @returns {string[]} Array of base configuration paths
   * @private
   */
  private getBaseConfigPaths(): string[] {
    return getCategoryConfigPaths(CONFIG_SCHEMA, "base");
  }

  /**
   * Gets configuration paths for feature settings
   * @returns {string[]} Array of feature configuration paths
   * @private
   */
  private getFeaturesConfigPaths(): string[] {
    return getCategoryConfigPaths(CONFIG_SCHEMA, "features");
  }

  /**
   * Private constructor to enforce singleton pattern
   * Initializes configuration and sets up change handlers
   * @private
   */
  private constructor() {
    this.configuration = vscode.workspace.getConfiguration(EXTENSION_NAME);

    // 自动注册所有提供商配置变更处理
    this.registerConfigurationChangeHandler(
      "providers-config",
      this.getProviderConfigPaths(),
      (changedKeys) => this.handleProviderConfigChanges(changedKeys)
    );

    // 自动注册基础配置变更处理
    this.registerConfigurationChangeHandler(
      "base-config",
      this.getBaseConfigPaths(),
      (changedKeys) => {
        console.log("Base configuration changed:", changedKeys);
        // 处理基础配置变更逻辑
      }
    );

    // 自动注册功能配置变更处理
    this.registerConfigurationChangeHandler(
      "features-config",
      this.getFeaturesConfigPaths(),
      (changedKeys) => {
        console.log("Features configuration changed:", changedKeys);
        // 处理功能配置变更逻辑
      }
    );

    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        console.log("Configuration changed event triggered");

        const changedKeys = this.getChangedConfigurationKeys(event);

        if (changedKeys.length > 0) {
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
   * Gets changed configuration keys from a configuration change event
   * @param {vscode.ConfigurationChangeEvent} event - The configuration change event
   * @returns {string[]} Array of changed configuration keys
   * @private
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

  /**
   * Gets the singleton instance of the configuration manager
   * @returns {ConfigurationManager} The configuration manager instance
   * @static
   */
  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Sets the extension context
   * @param {vscode.ExtensionContext} context - The extension context
   */
  public setContext(context: vscode.ExtensionContext): void {
    this.context = context;
  }

  /**
   * Gets a specific configuration value
   * @template K - Configuration key type
   * @param {K} key - Configuration key
   * @returns {ConfigurationValueType[K] | string} Configuration value
   */
  public getConfig<K extends ConfigKey>(
    key: K
  ): K extends keyof ConfigurationValueType
    ? ConfigurationValueType[K]
    : string {
    const configKey = ConfigKeys[key].replace("dish-ai-commit.", "");
    const value = this.configuration.get<string>(configKey);
    return value as K extends keyof ConfigurationValueType
      ? ConfigurationValueType[K]
      : string;
  }

  /**
   * Gets complete extension configuration
   * @param {boolean} [skipSystemPrompt=false] - Whether to skip generating system prompt
   * @returns {ExtensionConfiguration} Complete extension configuration
   */
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

  /**
   * Updates a configuration value
   * @template K - Configuration key type
   * @param {K} key - Configuration key to update
   * @param {string} value - New value
   * @returns {Promise<void>}
   */
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
   * Disposes of the configuration manager and its resources
   */
  public dispose(): void {
    console.log("dispose");
    this.disposables.forEach((d) => d.dispose());
    ConfigurationManager.instance =
      undefined as unknown as ConfigurationManager;
  }

  /**
   * Handles configuration change events
   * @param {string[]} changedKeys - Array of changed configuration keys
   * @private
   */
  private handleConfigurationChange(changedKeys: string[]): void {
    console.log("发生变化的配置项:", changedKeys);

    // 通知所有注册的处理器
    this.configChangeHandlers.forEach((handler) => {
      handler(changedKeys);
    });

    // 处理内置的配置变更逻辑
    if (changedKeys.some((key) => key.startsWith("providers."))) {
      this.handleProviderConfigChanges(changedKeys);
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
   * Handles provider-specific configuration changes
   * @param {string[]} changedKeys - Array of changed configuration keys
   * @private
   */
  private handleProviderConfigChanges(changedKeys: string[]): void {
    // OpenAI 配置变更
    if (changedKeys.some((key) => key.startsWith("providers.openai"))) {
      AIProviderFactory.reinitializeProvider("OpenAI");
    }
    // 其他提供商配置变更...
    if (changedKeys.some((key) => key.startsWith("providers.ollama"))) {
      AIProviderFactory.reinitializeProvider("Ollama");
      console.log(
        "Ollama provider has been reinitialized due to config changes"
      );
    }

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

  /**
   * Validates the current configuration
   * @returns {Promise<boolean>} Whether the configuration is valid
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
   * Validates provider-specific configuration
   * @param {keyof ExtensionConfiguration["providers"]} provider - Provider identifier
   * @param {"apiKey" | "baseUrl"} requiredField - Required configuration field
   * @returns {Promise<boolean>} Whether the provider configuration is valid
   * @private
   */
  private async validateProviderConfig(
    provider: keyof ExtensionConfiguration["providers"],
    requiredField: "apiKey" | "baseUrl"
  ): Promise<boolean> {
    const config = this.getConfiguration();
    const providerConfig = config.providers[provider];

    if (
      !providerConfig ||
      !(requiredField in providerConfig) ||
      !providerConfig[requiredField as keyof typeof providerConfig]
    ) {
      const settingKey = `providers.${provider.toLowerCase()}.${requiredField.toLowerCase()}`;
      const action = await vscode.window.showErrorMessage(
        getMessage(`${provider}.${requiredField}.missing`),
        getMessage("button.yes"),
        getMessage("button.no")
      );

      if (action === getMessage("button.yes")) {
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
   * Updates AI provider and model configuration
   * @param {ExtensionConfiguration["base"]["provider"]} provider - AI provider
   * @param {ExtensionConfiguration["base"]["model"]} model - AI model
   * @returns {Promise<void>}
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

  /**
   * Registers a configuration change handler
   * @param {string} handlerId - Unique identifier for the handler
   * @param {string[]} affectedKeys - Configuration keys to watch
   * @param {(changedKeys: string[]) => void} callback - Handler callback
   */
  public registerConfigurationChangeHandler(
    handlerId: string,
    affectedKeys: string[],
    callback: (changedKeys: string[]) => void
  ): void {
    const configPaths = new Set<string>();

    // 收集相关的配置路径
    function collectPaths(obj: ConfigObject, currentPath: string = ""): void {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        if (isConfigValue(value)) {
          if (affectedKeys.includes(newPath)) {
            configPaths.add(`${EXTENSION_NAME}.${newPath}`);
          }
        } else {
          collectPaths(value as ConfigObject, newPath);
        }
      }
    }

    collectPaths(CONFIG_SCHEMA as unknown as ConfigObject);

    // 存储处理器信息
    this.configChangeHandlers.set(handlerId, (changedKeys: string[]) => {
      const relevantChanges = changedKeys.filter((key) =>
        affectedKeys.includes(key)
      );
      if (relevantChanges.length > 0) {
        callback(relevantChanges);
      }
    });
  }

  /**
   * Unregisters a configuration change handler
   * @param {string} handlerId - Handler identifier to remove
   */
  public unregisterConfigurationChangeHandler(handlerId: string): void {
    this.configChangeHandlers.delete(handlerId);
  }
}
