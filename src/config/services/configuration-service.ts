/**
 * 配置服务
 *
 * 功能：
 * 1. 提供获取和更新VS Code扩展配置的接口
 * 2. 管理配置的刷新和缓存
 * 3. 根据配置模式自动生成完整配置
 * 4. 提供类型安全的配置访问方法
 * 5. 在需要时生成系统提示（system prompt）
 *
 * 主要职责：
 * - 作为扩展配置的中央访问点
 * - 确保配置值的类型安全
 * - 处理配置的动态生成，特别是系统提示
 * - 防止配置生成的递归调用
 * - 提供统一的配置更新接口
 *
 * 在扩展架构中，负责管理所有配置相关的操作，确保其他组件可以
 * 以一致且类型安全的方式访问配置。同时处理特殊配置（如系统提示）
 * 的生成逻辑，以避免重复计算和生成过程中的循环依赖。
 */
import * as vscode from "vscode";
import {
  ConfigKeys,
  ConfigKey,
  ExtensionConfiguration,
  ConfigurationValueType,
} from "../types";
import { EXTENSION_NAME } from "../../constants";
import { CONFIG_SCHEMA, generateConfiguration } from "../config-schema";
import { WORKSPACE_CONFIG_SCHEMA } from "../workspace-config-schema";
import { getSystemPrompt } from "../../ai/utils/generate-helper";
import { SCMFactory } from "../../scm/scm-provider";
import { stateManager } from "../../utils/state/state-manager";

/**
 * 处理配置的获取和更新
 */
export class ConfigurationService {
  private configuration: vscode.WorkspaceConfiguration;
  private configurationInProgress: boolean = false;

  constructor() {
    this.configuration = stateManager.getWorkspaceConfiguration(EXTENSION_NAME);
  }

  public refreshConfiguration(): void {
    this.configuration = stateManager.getWorkspaceConfiguration(EXTENSION_NAME);
  }

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
      if (!skipSystemPrompt && !config.features.commitMessage.systemPrompt) {
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

        config.features.commitMessage.systemPrompt =
          getSystemPrompt(promptConfig);
      }

      return config as ExtensionConfiguration;
    } finally {
      this.configurationInProgress = false;
    }
  }

  public getWorkspaceConfiguration(): any {
    const workspaceConfig = generateConfiguration(
      WORKSPACE_CONFIG_SCHEMA as any,
      (key: string) =>
        stateManager.getWorkspaceConfiguration(EXTENSION_NAME).get(key)
    );
    return workspaceConfig;
  }

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
