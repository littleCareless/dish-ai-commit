/**
 * 配置变更处理器
 *
 * 功能：
 * 1. 监听和处理VS Code扩展配置的变更事件
 * 2. 允许其他组件注册对特定配置键的监听
 * 3. 在配置变更时只通知关注相关配置的处理器
 *
 * 主要职责：
 * - 检测哪些配置项发生了变更
 * - 管理配置变更的事件处理器注册
 * - 在配置发生变更时通知相关处理器
 *
 * 在扩展架构中，作为配置变更事件的分发中心，确保配置变更能够被正确地传递给需要响应的组件
 */
import * as vscode from "vscode";
import { EXTENSION_NAME } from "../../constants";
import { ConfigObject, CONFIG_SCHEMA, isConfigValue } from "../config-schema";

/**
 * 处理配置变更事件和回调注册
 */
export class ConfigurationChangeHandler {
  private configChangeHandlers: Map<string, (changedKeys: string[]) => void> =
    new Map();

  public getChangedConfigurationKeys(
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

  public unregisterConfigurationChangeHandler(handlerId: string): void {
    this.configChangeHandlers.delete(handlerId);
  }

  public notifyHandlers(changedKeys: string[]): void {
    this.configChangeHandlers.forEach((handler) => {
      handler(changedKeys);
    });
  }
}
