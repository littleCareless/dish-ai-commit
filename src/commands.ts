import * as vscode from 'vscode';
import { ConfigurationManager } from './config/ConfigurationManager';
import { ConfigValidator } from './configValidator';
import { SVNService } from './svnService';
import { AIProviderFactory } from './ai/AIProviderFactory';
import { NotificationHandler } from './utils/NotificationHandler';
import { ProgressHandler } from './utils/ProgressHandler';
import { COMMANDS } from './constants';

export class CommandManager implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];

    constructor(private readonly context: vscode.ExtensionContext) {
        this.registerCommands();
    }

    private async generateCommitMessage(resourceStates?: vscode.SourceControlResourceState[]): Promise<void> {
        try {
            const svnService = await SVNService.create();
            if (!svnService) {
                return;
            }

            // 检查 SVN 是否可用
            if (!await svnService.hasSVN()) {
                return;
            }

            // 使用进度提示生成提交信息
            const response = await ProgressHandler.withProgress('', async (progress) => {
              try {
                console.log('resourceStates',resourceStates);
              // 获取用户在源代码管理中选中的文件
              const selectedFiles = this.getSelectedFiles(resourceStates);
  
              console.log('selectedFiles',selectedFiles);
              progress.report({ increment: 30, message: '正在分析变更内容...' });
              
              // 获取 diff 内容
              const diffContent = await svnService.getDiff(selectedFiles);
              
              if (!diffContent) {
                  await NotificationHandler.info('没有可提交的更改');
                  return;
              }
              console.log('diffContent',diffContent);
              try {
              progress.report({ increment: 30, message: '正在生成提交信息...' });

                const config = ConfigurationManager.getInstance().getConfiguration();
                // 使用配置中的默认provider
                const provider = AIProviderFactory.getProvider(config.defaultProvider);
                
                const result = await provider.generateResponse({
                      prompt: diffContent,
                      systemPrompt: config.systemPrompt,
                      // 根据provider类型选择对应的模型
                      model: config.defaultProvider === 'openai' ? config.openai.model : config.ollama.model,
                      language: config.language
                  });
                  progress.report({ increment: 100, message: '生成完成' });
                  return result;
                }catch(error ) {
                  console.log('生成失败');
                  progress.report({ increment: 100, message: '生成失败' });

                  throw error;
                }

                
              }catch(error) {
                throw error;
              }
            });

            await NotificationHandler.info(`生成的提交信息: ${response?.content}`);

            // TODO! 调用 SVN 插件提交代码 （目前没有办法，因为 SVN 插件没有提供 API）
            // const svnExtension = vscode.extensions.getExtension('johnstoncode.svn-scm')?.exports;;
            // if (!svnExtension) {
            //     await NotificationHandler.error('未找到 SVN 插件');
            //     return;
            // }
            
        } catch (error) {
            if (error instanceof Error) {
                await NotificationHandler.error(`生成提交信息失败: ${error.message}`);
            }
        }
    }

    private async refreshModels(): Promise<void> {
        try {
            await ProgressHandler.withProgress('', async (progress) => {
              progress.report({ increment: 0, message: '正在刷新模型列表...' });

                const configInstance = ConfigurationManager.getInstance();
                const config = configInstance.getConfiguration();
                const provider = AIProviderFactory.getProvider(config.defaultProvider);
                
                progress.report({ increment: 50, message: '获取模型列表中...' });
                await configInstance.getAvailableModels();
                await provider.refreshModels();
                
                progress.report({ increment: 100, message: '刷新完成' });
            });
        } catch (error) {
            if (error instanceof Error) {
                await NotificationHandler.error(`刷新模型列表失败: ${error.message}`);
            }
        }
    }

    private getSelectedFiles(resourceStates?: vscode.SourceControlResourceState | vscode.SourceControlResourceState[]): string[] | undefined {
        if (!resourceStates) {
            return undefined;
        }

        // 处理单个 resourceState 的情况
        if (!Array.isArray(resourceStates)) {
            const uri = (resourceStates as any)._resourceUri || resourceStates.resourceUri;
            return [uri.fsPath];
        }

        // 处理数组情况
        const selectedFiles = resourceStates.map(state => {
            const uri = (state as any)._resourceUri || state.resourceUri;
            return uri.fsPath;
        });

        return [...new Set(selectedFiles)];
    }

    private registerCommands() {
        this.disposables.push(
            vscode.commands.registerCommand(COMMANDS.GENERATE, async (resourceStates?: vscode.SourceControlResourceState[]) => {
                if (!await ConfigValidator.validateConfiguration()) {
                    return;
                }

                try {
                    // 传入资源状态到 generateCommitMessage
                    await this.generateCommitMessage(resourceStates);
                } catch (error) {
                    if (error instanceof Error) {
                        await NotificationHandler.error(`执行命令失败: ${error.message}`);
                    }
                }
            })
        );

        this.disposables.push(
            vscode.commands.registerCommand(COMMANDS.SHOW_MODELS, async () => {
                // 首先验证 OpenAI Key
                if (!await ConfigValidator.validateConfiguration()) {
                    return;
                }

                const config = ConfigurationManager.getInstance().getConfiguration();
                await NotificationHandler.info('正在获取可用模型...');
            })
        );

        this.disposables.push(
            vscode.commands.registerCommand(COMMANDS.REFRESH_MODELS, async () => {
                if (!await ConfigValidator.validateConfiguration()) {
                    return;
                }
                await this.refreshModels();
            })
        );
    }

    dispose() {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}

// 为了保持向后兼容，保留原有的函数
export function registerCommands(context: vscode.ExtensionContext) {
    const commandManager = new CommandManager(context);
    context.subscriptions.push(commandManager);
}