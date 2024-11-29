import * as vscode from 'vscode';
import { ConfigKeys, ConfigKey, ExtensionConfiguration } from './types';
import { DEFAULT_CONFIG } from './default';
import type { AIProvider } from '../config/types';
import { OpenAIProvider } from '../ai/providers/OpenAIProvider';
import { NotificationHandler } from '../utils/NotificationHandler';
import { OllamaProvider } from '../ai/providers/OllamaProvider';
import { EXTENSION_NAME } from '../constants';

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
        changedKeys.forEach(key => {
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
                console.log('Configuration changed event triggered');
                
                // 检查特定配置项的变化
                const configs = [
                    'defaultProvider',
                    'openai.model',
                    'ollama.model',
                    'openai.baseUrl',
                    'openai.apiKey',
                    'ollama.baseUrl'
                ];
                
                const changedKeys: string[] = [];
                configs.forEach(key => {
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
                    this.configuration = vscode.workspace.getConfiguration(EXTENSION_NAME);
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

    public getConfig<T>(key: ConfigKey): T {
        const configKey = ConfigKeys[key].replace('svn-ai-commit.', '');
        console.log('configKey',configKey);
        if (!this.configCache.has(configKey)) {
            this.configCache.set(configKey, this.configuration.get<T>(configKey));
        }
        return this.configCache.get(configKey);
    }

    public getConfiguration(): ExtensionConfiguration {
        return {
            language: this.getConfig<string>('AI_COMMIT_LANGUAGE') || DEFAULT_CONFIG.language,
            systemPrompt: this.getConfig<string>('AI_COMMIT_SYSTEM_PROMPT'),
            defaultProvider: this.getConfig<AIProvider>('DEFAULT_PROVIDER') || DEFAULT_CONFIG.defaultProvider,
            openai: {
                apiKey: this.getConfig<string>('OPENAI_API_KEY'),
                baseUrl: this.getConfig<string>('OPENAI_BASE_URL') || DEFAULT_CONFIG.openai.baseUrl,
                model: this.getConfig<string>('OPENAI_MODEL') || DEFAULT_CONFIG.openai.model
            },
            ollama: {
                baseUrl: this.getConfig<string>('OLLAMA_BASE_URL') || DEFAULT_CONFIG.ollama.baseUrl,
                model: this.getConfig<string>('OLLAMA_MODEL') || DEFAULT_CONFIG.ollama.model
            },
        };
    }

    public async updateConfig<T>(key: ConfigKey, value: T): Promise<void> {
        await this.configuration.update(ConfigKeys[key].replace('svn-ai-commit.', ''), value, true);
    }

    /**
     * Dispose the configuration manager by clearing resources
     */
    public dispose(): void {
      console.log('dispose');
        this.configCache.clear();
        this.disposables.forEach(d => d.dispose());
        ConfigurationManager.instance = undefined as unknown as ConfigurationManager;
    }

    /**
     * 处理配置变更事件
     */
    private handleConfigurationChange(event: vscode.ConfigurationChangeEvent): void {
        const configPrefix = `${EXTENSION_NAME}.`;
        
        // 添加日志输出具体的配置变更
        console.log('处理配置变更:', {
            defaultProvider: event.affectsConfiguration(`${configPrefix}defaultProvider`),
            openaiBaseUrl: event.affectsConfiguration(`${configPrefix}openai.baseUrl`),
            openaiApiKey: event.affectsConfiguration(`${configPrefix}openai.apiKey`),
            ollamaBaseUrl: event.affectsConfiguration(`${configPrefix}ollama.baseUrl`),
            openaiModel: event.affectsConfiguration(`${configPrefix}openai.model`),
            ollamaModel: event.affectsConfiguration(`${configPrefix}ollama.model`)
        });

        // 检查是否改变了AI提供商
        // svn-ai-commit.defaultProvider
        if (event.affectsConfiguration(`${configPrefix}defaultProvider`)) {
            const newProvider = this.getConfig<AIProvider>('DEFAULT_PROVIDER');
            console.log('AI提供商已切换至:', newProvider);
            this.refreshAvailableModels(); // 切换提供商后刷新模型列表
            return;
        }

        // 根据当前AI提供商处理相关配置变更
        // const currentProvider = this.getConfig<AIProvider>('DEFAULT_PROVIDER') || DEFAULT_CONFIG.defaultProvider;
        // console.log('currentProvider',currentProvider);
        // if (currentProvider === 'openai') {
        //     // 处理OpenAI相关配置变更
        //     if (event.affectsConfiguration(`${configPrefix}openai.baseUrl`) || 
        //         event.affectsConfiguration(`${configPrefix}openai.apiKey`)) {
        //         this.refreshAvailableModels();
        //     }
        // } else if (currentProvider === 'ollama') {
        //     // 处理Ollama相关配置变更
        //     if (event.affectsConfiguration(`${configPrefix}ollama.baseUrl`)) {
        //         this.refreshAvailableModels();
        //     }
        // }
    }

    /**
     * 更新模型配置的可选项
     */
    private async updateModelConfigEnum(provider: string, models: string[]): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration();
            const configKey = `${ConfigKeys[`${provider.toUpperCase()}_MODEL` as keyof typeof ConfigKeys]}` as ConfigKey;
            const currentValue = config.get<string>(configKey);
            const selected = await vscode.window.showQuickPick(models, {
              placeHolder: '选择要使用的模型'
          });
          if (selected) {
            // 更新配置值
            console.log('configKey',configKey);
            await config.update(configKey, selected, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`Configuration updated to: ${selected}`);
          }
            // 如果当前选择的模型不在可用列表中，设置为默认值
            const currentModel = this.getConfig<string>(`${provider.toUpperCase()}_MODEL` as ConfigKey);
            if (models.length > 0 && !models.includes(currentModel)) {
                const defaultModel = provider === 'openai' ? DEFAULT_CONFIG.openai.model : DEFAULT_CONFIG.ollama.model;
                await this.updateConfig(`${provider.toUpperCase()}_MODEL` as ConfigKey, defaultModel);
            }
        } catch (error) {
            console.error('Failed to update model configuration:', error);
        }
    }

    /**
     * 刷新可用的模型列表
     */
    private async refreshAvailableModels(): Promise<void> {
        // if (!this.context) {
        //     return;
        // }

        try {
            const provider = this.getConfig<AIProvider>('DEFAULT_PROVIDER') || DEFAULT_CONFIG.defaultProvider;
            let models: string[] = [];

            console.log('provider',provider);
            
            if (provider === 'openai') {
                const openaiProvider = new OpenAIProvider();
                models = await openaiProvider.refreshModels();
                await this.updateModelConfigEnum('openai', models);
            } else if (provider === 'ollama') {
                const ollamaProvider = new OllamaProvider();
                models = await ollamaProvider.refreshModels();
                await this.updateModelConfigEnum('ollama', models);
            }
            
            // await this.context.globalState.update('availableModels', models);
            
        } catch (error) {
            console.error('Failed to refresh models:', error);
            await NotificationHandler.error('刷新模型列表失败');
        }
    }

    /**
     * 获取可用的AI模型列表
     */
    public async getAvailableModels() {
        // if (!this.context) {
        //     return [];
        // }
        // if (!this.context.globalState.get<string[]>('availableModels')) {
        // }
        await this.refreshAvailableModels();
        // return this.context.globalState.get<string[]>('availableModels', []);
    }
}