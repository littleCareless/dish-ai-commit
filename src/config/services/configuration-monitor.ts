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
import { ConfigurationChangeHandler } from "@/config/services/configuration-change-handler";
import { ConfigurationService } from "@/config/services/configuration-service";
import { SettingsSyncService } from "@/config/services/settings-sync-service";
import * as vscode from "vscode";

/**
 * 监控配置变更并触发相应操作
 */
export class ConfigurationMonitor {
  private readonly disposables: vscode.Disposable[] = [];

  /**
   * Callback invoked when features config changes externally (from settings.json),
   * not triggered by our own globalState sync.
   * Receives the list of changed dot-path keys (e.g. ["features.enableEmoji"]).
   */
  public onExternalFeaturesChange?: (changedKeys: string[]) => void;

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
      // Sync base language to preferences
      SettingsSyncService.getInstance()?.syncFromSettingsJson(changedKeys).catch((err) => {
        console.error("[ConfigurationMonitor] Failed to sync base config:", err);
      });
    }

    // 处理功能配置变更
    if (changedKeys.some((key) => key.startsWith("features."))) {
      console.log("Features configuration changed");
      // Notify webview about external config change
      const featureKeys = changedKeys.filter((key) => key.startsWith("features."));
      try {
        this.onExternalFeaturesChange?.(featureKeys);
      } catch (err) {
        console.error("[ConfigurationMonitor] Error in onExternalFeaturesChange callback:", err);
      }
      // Sync features from settings.json → globalState
      SettingsSyncService.getInstance()?.syncFromSettingsJson(changedKeys).catch((err) => {
        console.error(
          "[ConfigurationMonitor] Failed to sync features config:",
          err
        );
      });
    }
  }

  public handleProviderConfigChanges(changedKeys: string[]): void {
    const providerKeys = changedKeys.filter((key) => key.startsWith("providers."));

    // Sync provider config from settings.json → secrets (active profile)
    if (providerKeys.length > 0) {
      console.log("Provider configuration changed, syncing to secrets:", providerKeys);
      SettingsSyncService.getInstance()?.syncProvidersFromSettingsJson(providerKeys).catch((err) => {
        console.error("[ConfigurationMonitor] Failed to sync provider config:", err);
      });
    }
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}
