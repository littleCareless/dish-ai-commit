import * as vscode from "vscode";
import { ConfigKeys, ConfigKey, ExtensionConfiguration } from "./types";
import { DEFAULT_CONFIG } from "./default";
import { AIProvider } from "../config/types";
import { OpenAIProvider } from "../ai/providers/OpenAIProvider";
import { NotificationHandler } from "../utils/NotificationHandler";
import { OllamaProvider } from "../ai/providers/OllamaProvider";
import { EXTENSION_NAME } from "../constants";
import { generateCommitMessageSystemPrompt } from "../prompt/prompt";
import { AIProviderFactory } from "../ai/AIProviderFactory";
import { LocalizationManager } from "../utils/LocalizationManager";
import { SCMFactory } from "../scm/SCMProvider";

export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private configuration: vscode.WorkspaceConfiguration;
  private configCache: Map<string, any> = new Map();
  private readonly disposables: vscode.Disposable[] = [];
  private context?: vscode.ExtensionContext;

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
        // 添加更详细的日志
        console.log("Configuration changed event triggered");

        // 检查特定配置项的变化
        const configs = [
          "provider",
          "openai.model",
          "ollama.model",
          "openai.baseUrl",
          "openai.apiKey",
          "ollama.baseUrl",
        ];

        const changedKeys: string[] = [];
        configs.forEach((key) => {
          const fullKey = `${EXTENSION_NAME}.${key}`;
          if (event.affectsConfiguration(fullKey)) {
            console.log(`配置项 ${key} 发生变化`);
            changedKeys.push(key);
          }
        });

        if (changedKeys.length > 0) {
          // 更新配置缓存
          this.updateConfigCache(changedKeys);
          // 刷新配置实例
          this.configuration =
            vscode.workspace.getConfiguration(EXTENSION_NAME);
          // 处理配置变更
          this.handleConfigurationChange(event);
        }
      })
    );
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

  public getConfig<T>(key: ConfigKey, useCache: boolean = true): T {
    const configKey = ConfigKeys[key].replace("dish-ai-commit.", "");

    if (!useCache) {
      // 直接从 configuration 获取最新值
      return this.configuration.get<T>(configKey) as T;
    }

    if (!this.configCache.has(configKey)) {
      this.configCache.set(configKey, this.configuration.get<T>(configKey));
    }
    return this.configCache.get(configKey);
  }

  public getConfiguration(): ExtensionConfiguration {
    const currentScm = SCMFactory.getCurrentSCMType() || "git";
    return {
      language:
        this.getConfig<string>("COMMIT_LANGUAGE", false) ||
        DEFAULT_CONFIG.language,
      systemPrompt:
        this.getConfig<string>("SYSTEM_PROMPT", false) ||
        generateCommitMessageSystemPrompt(
          this.getConfig<string>("COMMIT_LANGUAGE", false) ||
            DEFAULT_CONFIG.language,
          this.getConfig<boolean>("ALLOW_MERGE_COMMITS", false) ||
            DEFAULT_CONFIG.allowMergeCommits,
          false,
          currentScm
        ),
      provider:
        this.getConfig<string>("PROVIDER", false) || DEFAULT_CONFIG.provider,
      model: this.getConfig<string>("MODEL", false) || DEFAULT_CONFIG.model,
      openai: {
        apiKey: this.getConfig<string>("OPENAI_API_KEY", false),
        baseUrl:
          this.getConfig<string>("OPENAI_BASE_URL", false) ||
          DEFAULT_CONFIG.openai.baseUrl,
      },
      ollama: {
        baseUrl:
          this.getConfig<string>("OLLAMA_BASE_URL", false) ||
          DEFAULT_CONFIG.ollama.baseUrl,
      },
      allowMergeCommits:
        this.getConfig<boolean>("ALLOW_MERGE_COMMITS", false) ||
        DEFAULT_CONFIG.allowMergeCommits,
    };
  }

  public async updateConfig<T>(key: ConfigKey, value: T): Promise<void> {
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
  private handleConfigurationChange(
    event: vscode.ConfigurationChangeEvent
  ): void {
    const configPrefix = `${EXTENSION_NAME}.`;

    // 检查是否是 OpenAI 相关配置变更
    const isOpenAIConfigChanged = ["openai.apiKey", "openai.baseUrl"].some(
      (key) => event.affectsConfiguration(`${configPrefix}${key}`)
    );

    // 如果 OpenAI 配置发生变更，重新初始化 provider
    if (isOpenAIConfigChanged) {
      AIProviderFactory.reinitializeProvider("OpenAI");
      console.log(
        "OpenAI provider has been reinitialized due to config changes"
      );
    }

    // 检查是否是 Ollama 相关配置变更
    const isOllamaConfigChanged = ["ollama.baseUrl"].some((key) =>
      event.affectsConfiguration(`${configPrefix}${key}`)
    );

    // 如果 Ollama 配置发生变更，重新初始化 provider
    if (isOllamaConfigChanged) {
      AIProviderFactory.reinitializeProvider("Ollama");
      console.log(
        "Ollama provider has been reinitialized due to config changes"
      );
    }

    // 添加日志输出具体的配置变更
    console.log("处理配置变更:", {
      provider: event.affectsConfiguration(`${configPrefix}provider`),
      openaiBaseUrl: event.affectsConfiguration(
        `${configPrefix}openai.baseUrl`
      ),
      openaiApiKey: event.affectsConfiguration(`${configPrefix}openai.apiKey`),
      ollamaBaseUrl: event.affectsConfiguration(
        `${configPrefix}ollama.baseUrl`
      ),
      openaiModel: event.affectsConfiguration(`${configPrefix}openai.model`),
      ollamaModel: event.affectsConfiguration(`${configPrefix}ollama.model`),
    });
  }

  /**
   * 验证配置是否有效
   */
  public async validateConfiguration(): Promise<boolean> {
    const config = this.getConfiguration();
    const provider = this.getProviderFromModel(config.model);

    switch (provider) {
      case "openai":
        return this.validateOpenAIConfig();
      case "ollama":
        return this.validateOllamaConfig();
      default:
        return Promise.resolve(true);
    }
  }

  private async validateOpenAIConfig(): Promise<boolean> {
    const config = this.getConfiguration();
    const locManager = LocalizationManager.getInstance();

    if (!config.openai.apiKey) {
      const action = await vscode.window.showErrorMessage(
        locManager.getMessage("openai.apikey.missing"),
        locManager.getMessage("button.yes"),
        locManager.getMessage("button.no")
      );

      if (action === locManager.getMessage("button.yes")) {
        await vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "dish-ai-commit.OPENAI_API_KEY"
        );
      }
      return false;
    }
    return true;
  }

  private async validateOllamaConfig(): Promise<boolean> {
    const config = this.getConfiguration();
    const locManager = LocalizationManager.getInstance();

    if (!config.ollama.baseUrl) {
      const action = await vscode.window.showErrorMessage(
        locManager.getMessage("ollama.baseurl.missing"),
        locManager.getMessage("button.yes"),
        locManager.getMessage("button.no")
      );

      if (action === locManager.getMessage("button.yes")) {
        await vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "dish-ai-commit.OLLAMA_BASE_URL"
        );
      }
      return false;
    }
    return true;
  }

  /**
   * 更新 AI 提供商和模型配置
   * @param provider AI 提供商名称
   * @param model 模型名称
   */
  public async updateAIConfiguration(
    provider: string,
    model: string
  ): Promise<void> {
    const modelConfigKey = `MODEL` as ConfigKey;
    const providerConfigKey = `PROVIDER` as ConfigKey;
    await this.updateConfig(modelConfigKey, model);
    await this.updateConfig(providerConfigKey, provider);
  }

  public getProviderFromModel(model: string): string {
    if (model.startsWith("gpt-")) {
      return "openai";
    } else if (model === "vscode-default") {
      return "vscode";
    } else {
      return "ollama";
    }
  }
}
