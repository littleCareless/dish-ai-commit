/**
 * 配置监控器
 *
 * 功能：
 * 1. 监听VS Code的配置变更事件
 * 2. 在配置变更时，刷新配置服务的状态
 * 3. 分发配置变更通知给已注册的处理器
 * 4. 针对特定配置类别（providers, base, features）实现专门的处理逻辑
 *
 * 主要职责：
 * - 作为配置变更的监听入口点
 * - 协调配置变更后的系统响应
 * - 管理AI提供商在配置变更后的重新初始化
 * - 根据变更的配置类别执行相应的处理操作
 *
 * 在扩展架构中，负责监控配置变更并确保系统各部分能够及时响应新的配置设置，
 * 特别是在AI提供商配置变更时进行适当的重新初始化，以确保系统使用更新后的设置。
 */
import * as vscode from "vscode";
import { ConfigurationChangeHandler } from "./configuration-change-handler";
import { ConfigurationService } from "./configuration-service";
import { AIProviderFactory } from "../../ai/ai-provider-factory";

/**
 * 监控配置变更并触发相应操作
 */
export class ConfigurationMonitor {
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private configService: ConfigurationService,
    private changeHandler: ConfigurationChangeHandler
  ) {
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((event) => {

        const changedKeys =
          this.changeHandler.getChangedConfigurationKeys(event);

        if (changedKeys.length > 0) {
          // 刷新配置实例
          this.configService.refreshConfiguration();
          // 处理配置变更
          this.handleConfigurationChange(changedKeys);
        }
      })
    );
  }

  public handleConfigurationChange(changedKeys: string[]): void {
    console.log("发生变化的配置项:", changedKeys);

    // 通知所有注册的处理器
    this.changeHandler.notifyHandlers(changedKeys);

    // 处理内置的配置变更逻辑
    if (changedKeys.some((key) => key.startsWith("providers."))) {
      this.handleProviderConfigChanges(changedKeys);
    }

    // 处理基础配置变更
    if (changedKeys.some((key) => key.startsWith("base."))) {
      console.log("Base configuration changed");
    }

    // 处理功能配置变更
    if (changedKeys.some((key) => key.startsWith("features."))) {
      console.log("Features configuration changed");
    }
  }

  public handleProviderConfigChanges(changedKeys: string[]): void {
    // OpenAI 配置变更
    if (changedKeys.some((key) => key.startsWith("providers.openai"))) {
      AIProviderFactory.reinitializeProvider("OpenAI");
    }
    // 其他提供商配置变更
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

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}
