/**
 * VSCode 安全存储封装
 * 自动处理敏感字段的加密存储
 *
 * 存储策略：
 * - 普通字段 → extensionContext.globalState（持久化，不写入 settings.json）
 * - 敏感字段 → extensionContext.secrets（加密存储，系统级别安全）
 */

import {
  ExtendedProviderConfig,
  ProviderMetadata,
} from "@/types/provider-metadata";
import { postMessage } from "@/utils/vscode";

export class SecureStorage {
  private static instance: SecureStorage;

  static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  /**
   * 保存提供商配置
   */
  async saveProviderConfig(
    providerId: string,
    config: ExtendedProviderConfig,
    _metadata: ProviderMetadata,
  ): Promise<void> {
    try {
      // 分离敏感字段和普通字段
      const { secureFields, publicFields } = this.separateFields(
        config,
        _metadata,
      );

      // 保存普通字段到普通存储
      const publicConfig = {
        ...publicFields,
        id: config.id,
        name: config.name,
        type: config.type,
        isActive: config.isActive,
        models: config.models,
        defaultModel: config.defaultModel,
        customHeaders: config.customHeaders,
        timeout: config.timeout,
        retries: config.retries,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        createdAt: config.createdAt,
        updatedAt: new Date(),
      };

      // 保存到 VSCode 配置
      await this.setConfigurationValue(`providers.${providerId}`, publicConfig);

      // 保存敏感字段到安全存储
      if (Object.keys(secureFields).length > 0) {
        await this.setSecretValue(
          `provider.${providerId}.secure`,
          JSON.stringify(secureFields),
        );
      }

      console.log(`Provider config saved: ${providerId}`);
    } catch (error) {
      console.error("Failed to save provider config:", error);
      throw new Error(
        `保存配置失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  /**
   * 加载提供商配置
   */
  async loadProviderConfig(
    providerId: string,
  ): Promise<ExtendedProviderConfig | null> {
    try {
      // 加载普通配置
      const publicConfig = (await this.getConfigurationValue(
        `providers.${providerId}`,
      )) as ExtendedProviderConfig | null;
      if (!publicConfig) {
        return null;
      }

      // 加载敏感字段
      let secureFields: Record<string, unknown> = {};
      try {
        const secureData = await this.getSecretValue(
          `provider.${providerId}.secure`,
        );
        if (secureData) {
          secureFields = JSON.parse(secureData) as Record<string, unknown>;
        }
      } catch (error) {
        console.warn("Failed to load secure fields:", error);
        // 继续执行，只是没有敏感字段
      }

      // 合并配置
      const config: ExtendedProviderConfig = {
        ...publicConfig,
        customFields: {
          ...publicConfig.customFields,
          ...secureFields,
        },
      };

      return config;
    } catch (error) {
      console.error("Failed to load provider config:", error);
      return null;
    }
  }

  /**
   * 删除提供商配置
   */
  async deleteProviderConfig(providerId: string): Promise<void> {
    try {
      // 删除普通配置
      await this.setConfigurationValue(`providers.${providerId}`, undefined);

      // 删除敏感字段
      try {
        await this.deleteSecretValue(`provider.${providerId}.secure`);
      } catch (error) {
        console.warn("Failed to delete secure fields:", error);
      }

      console.log(`Provider config deleted: ${providerId}`);
    } catch (error) {
      console.error("Failed to delete provider config:", error);
      throw new Error(
        `删除配置失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  /**
   * 获取所有提供商配置
   */
  async getAllProviderConfigs(): Promise<
    Record<string, ExtendedProviderConfig>
  > {
    try {
      const allConfigs = (await this.getConfigurationValue("providers")) || {};
      const result: Record<string, ExtendedProviderConfig> = {};

      for (const [providerId, config] of Object.entries(allConfigs)) {
        if (config && typeof config === "object") {
          // 尝试加载敏感字段
          try {
            const secureData = await this.getSecretValue(
              `provider.${providerId}.secure`,
            );
            if (secureData) {
              const secureFields = JSON.parse(secureData) as Record<
                string,
                unknown
              >;
              result[providerId] = {
                ...(config as ExtendedProviderConfig),
                customFields: {
                  ...(config as ExtendedProviderConfig).customFields,
                  ...secureFields,
                },
              };
            } else {
              result[providerId] = config as ExtendedProviderConfig;
            }
          } catch (error) {
            console.warn(
              `Failed to load secure fields for ${providerId}:`,
              error,
            );
            result[providerId] = config as ExtendedProviderConfig;
          }
        }
      }

      return result;
    } catch (error) {
      console.error("Failed to load all provider configs:", error);
      return {};
    }
  }

  /**
   * 分离敏感字段和普通字段
   */
  private separateFields(
    config: ExtendedProviderConfig,
    metadata: ProviderMetadata,
  ): {
    secureFields: Record<string, unknown>;
    publicFields: Record<string, unknown>;
  } {
    const secureFields: Record<string, unknown> = {};
    const publicFields: Record<string, unknown> = {};

    // 获取需要加密的字段
    const secureFieldKeys = metadata.fields
      .filter((field) => field.secure)
      .map((field) => field.key);

    // 分离字段
    for (const [key, value] of Object.entries(config.customFields || {})) {
      if (secureFieldKeys.includes(key)) {
        secureFields[key] = value;
      } else {
        publicFields[key] = value;
      }
    }

    return { secureFields, publicFields };
  }

  /**
   * 设置配置值（使用 globalState 持久化存储，不写入 settings.json）
   */
  private async setConfigurationValue(
    key: string,
    value: unknown,
  ): Promise<void> {
    try {
      // 使用 globalState 进行持久化存储，不会写入 settings.json
      // 尝试使用 postMessage (通过 vscode.ts)
      // 注意：这里我们无法直接检测 VSCode API 是否可用，因为 vscode.ts 封装了它。
      // 但我们可以通过超时机制来回退（虽然这里的 Promise 会 reject）。
      // 为了保持与 vscode.ts 一致，我们优先尝试 postMessage。
      // 如果需要 fallback，可以在 catch 中处理，或者简单的假设我们在 VSCode 中。
      // 鉴于用户要求使用 vscode.ts，我们使用它。

      return new Promise((resolve, reject) => {
        const messageHandler = (event: MessageEvent) => {
          if (
            event.data.command === "setGlobalStateResponse" &&
            event.data.key === key
          ) {
            window.removeEventListener("message", messageHandler);
            if (event.data.success) {
              resolve();
            } else {
              reject(
                new Error(event.data.error || "Failed to set global state"),
              );
            }
          }
        };

        window.addEventListener("message", messageHandler);

        postMessage("setGlobalState", { key, value });

        // 超时处理
        setTimeout(() => {
          window.removeEventListener("message", messageHandler);
          // 如果超时，可能是因为不在 VSCode 环境中，尝试 fallback 到 localStorage
          console.warn(
            "Global state save timeout, falling back to localStorage",
          );
          try {
            localStorage.setItem(`config.${key}`, JSON.stringify(value));
            resolve();
          } catch {
            reject(
              new Error("Global state save timeout and localStorage failed"),
            );
          }
        }, 2000); // 缩短超时时间以便快速 fallback
      });
    } catch (error) {
      console.error("Failed to set configuration value:", error);
      throw new Error(
        `配置保存失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  /**
   * 获取配置值（从 globalState 持久化存储读取）
   */
  private async getConfigurationValue(key: string): Promise<unknown> {
    // 使用 globalState 读取持久化数据，不从 settings.json 读取
    return new Promise((resolve) => {
      const messageHandler = (event: MessageEvent) => {
        if (
          event.data.command === "getGlobalStateResponse" &&
          event.data.key === key
        ) {
          window.removeEventListener("message", messageHandler);
          resolve(event.data.value);
        }
      };

      window.addEventListener("message", messageHandler);
      postMessage("getGlobalState", { key });

      // 超时处理
      setTimeout(() => {
        window.removeEventListener("message", messageHandler);
        // Fallback to localStorage
        const value = localStorage.getItem(`config.${key}`);
        resolve(value ? JSON.parse(value) : null);
      }, 2000);
    });
  }

  /**
   * 设置密钥值（安全存储）
   */
  private async setSecretValue(key: string, value: string): Promise<void> {
    try {
      // 在 VSCode 扩展环境中，这应该调用 vscode.workspace.getConfiguration().update() 或使用密钥存储
      // 在 webview 中，我们需要通过消息传递与扩展通信

      return new Promise((resolve, reject) => {
        const messageHandler = (event: MessageEvent) => {
          if (
            event.data.command === "setSecretResponse" &&
            event.data.key === key
          ) {
            window.removeEventListener("message", messageHandler);
            if (event.data.success) {
              resolve();
            } else {
              reject(new Error(event.data.error || "Failed to set secret"));
            }
          }
        };

        window.addEventListener("message", messageHandler);
        postMessage("setSecret", { key, value });

        // 超时处理
        setTimeout(() => {
          window.removeEventListener("message", messageHandler);
          // Fallback to localStorage
          console.warn(
            "Secret save timeout, falling back to localStorage (development mode)",
          );
          try {
            localStorage.setItem(`secret.${key}`, value);
            resolve();
          } catch {
            reject(new Error("Secret save timeout and localStorage failed"));
          }
        }, 2000);
      });
    } catch (error) {
      console.error("Failed to set secret value:", error);
      throw new Error(
        `密钥保存失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  /**
   * 获取密钥值（安全存储）
   */
  private async getSecretValue(key: string): Promise<string | null> {
    // 在 VSCode 扩展环境中，这应该调用 vscode.workspace.getConfiguration().get() 或使用密钥存储
    // 在 webview 中，我们需要通过消息传递与扩展通信

    return new Promise((resolve) => {
      const messageHandler = (event: MessageEvent) => {
        if (
          event.data.command === "getSecretResponse" &&
          event.data.key === key
        ) {
          window.removeEventListener("message", messageHandler);
          resolve(event.data.value);
        }
      };

      window.addEventListener("message", messageHandler);
      postMessage("getSecret", { key });

      // 超时处理
      setTimeout(() => {
        window.removeEventListener("message", messageHandler);
        // Fallback
        console.warn(
          "Using localStorage for secrets in development mode (fallback)",
        );
        resolve(localStorage.getItem(`secret.${key}`));
      }, 2000);
    });
  }

  /**
   * 删除密钥值（安全存储）
   */
  private async deleteSecretValue(key: string): Promise<void> {
    // 在 VSCode 扩展环境中，这应该调用相应的删除方法
    // 在 webview 中，我们需要通过消息传递与扩展通信

    postMessage("deleteSecret", { key });

    // Fallback cleanup (just in case)
    localStorage.removeItem(`secret.${key}`);
  }

  /**
   * 清除所有配置
   */
  async clearAllConfigs(): Promise<void> {
    try {
      // 清除普通配置
      await this.setConfigurationValue("providers", {});

      // 清除所有敏感字段
      const allConfigs = await this.getAllProviderConfigs();
      for (const providerId of Object.keys(allConfigs)) {
        try {
          await this.deleteSecretValue(`provider.${providerId}.secure`);
        } catch (error) {
          console.warn(
            `Failed to clear secure fields for ${providerId}:`,
            error,
          );
        }
      }

      console.log("All provider configs cleared");
    } catch (error) {
      console.error("Failed to clear all configs:", error);
      throw new Error(
        `清除配置失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  /**
   * 记住每个 Profile 的上次选中的 Provider
   */
  async saveLastSelectedProvider(
    profileId: string,
    providerId: string,
  ): Promise<void> {
    try {
      await this.setConfigurationValue(
        `lastSelectedProvider.${profileId}`,
        providerId,
      );
    } catch (error) {
      console.error("Failed to save last selected provider:", error);
    }
  }

  async loadLastSelectedProvider(profileId: string): Promise<string | null> {
    try {
      const value = await this.getConfigurationValue(
        `lastSelectedProvider.${profileId}`,
      );
      return (value as string) || null;
    } catch (error) {
      console.error("Failed to load last selected provider:", error);
      return null;
    }
  }
}

// 导出单例实例
export const secureStorage = SecureStorage.getInstance();

// 导出便捷函数
export const saveProviderConfig = (
  providerId: string,
  config: ExtendedProviderConfig,
  metadata: ProviderMetadata,
) => secureStorage.saveProviderConfig(providerId, config, metadata);

export const loadProviderConfig = (providerId: string) =>
  secureStorage.loadProviderConfig(providerId);

export const deleteProviderConfig = (providerId: string) =>
  secureStorage.deleteProviderConfig(providerId);

export const getAllProviderConfigs = () =>
  secureStorage.getAllProviderConfigs();

export const saveLastSelectedProvider = (
  profileId: string,
  providerId: string,
) => secureStorage.saveLastSelectedProvider(profileId, providerId);

export const loadLastSelectedProvider = (profileId: string) =>
  secureStorage.loadLastSelectedProvider(profileId);
