// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ConfigurationManager } from './config/ConfigurationManager';
import { registerCommands } from './commands';
import { ConfigValidator } from './configValidator';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  try {
    
    console.log('Extension "dish-ai-commit-gen" is now active!');
    
    // 初始化配置管理器并添加到订阅列表
    context.subscriptions.push(ConfigurationManager.getInstance(    ));
    
    // 在扩展激活时验证 OpenAI Key
    ConfigValidator.validateConfiguration().then(isValid => {
        if (!isValid) {
            console.log('OpenAI API Key is not configured');
        }
    });
    
    // 注册所有命令
    registerCommands(context);
  }catch(e) {
    console.error('Error activating extension:', e);
    throw e;
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
