import { DISH_CONFIG_PREFIX } from "@/config/constants";
import { ProviderConfig } from "@/types/settings";
import * as vscode from "vscode";

export interface ApiConfigStorageData {
  providers: Record<string, ProviderConfig>;
  activeProviderId: string;
}

/**
 * API配置存储 - 存储在secrets中
 * 负责管理AI提供商的API密钥、baseUrl等敏感信息
 */
export class ApiConfigStorage {
  private static readonly STORAGE_KEY = `${DISH_CONFIG_PREFIX}_api_config`;
  private static instance: ApiConfigStorage;

  private constructor(private context: vscode.ExtensionContext) {}

  public static getInstance(
    context: vscode.ExtensionContext
  ): ApiConfigStorage {
    if (!ApiConfigStorage.instance) {
      ApiConfigStorage.instance = new ApiConfigStorage(context);
    }
    return ApiConfigStorage.instance;
  }

  /**
   * 加载API配置
   */
  public async load(): Promise<ApiConfigStorageData | null> {
    try {
      const data = await this.context.secrets.get(ApiConfigStorage.STORAGE_KEY);
      if (data) {
        return JSON.parse(data) as ApiConfigStorageData;
      }
    } catch (error) {
      console.error("Failed to load API config:", error);
    }
    return null;
  }

  /**
   * 保存API配置
   */
  public async save(data: ApiConfigStorageData): Promise<void> {
    try {
      await this.context.secrets.store(
        ApiConfigStorage.STORAGE_KEY,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error("Failed to save API config:", error);
      throw error;
    }
  }

  /**
   * 获取所有提供者
   */
  public async getProviders(): Promise<Record<string, ProviderConfig>> {
    const data = await this.load();
    return data?.providers || {};
  }

  /**
   * 获取活跃提供者ID
   */
  public async getActiveProviderId(): Promise<string | null> {
    const data = await this.load();
    return data?.activeProviderId || null;
  }

  /**
   * 设置活跃提供者
   */
  public async setActiveProviderId(providerId: string): Promise<void> {
    const data = await this.load();
    if (data) {
      data.activeProviderId = providerId;
      await this.save(data);
    } else {
      await this.save({ providers: {}, activeProviderId: providerId });
    }
  }

  /**
   * 更新或添加提供者
   */
  public async updateProvider(
    providerId: string,
    config: ProviderConfig
  ): Promise<void> {
    const data = await this.load();
    const providers = data?.providers || {};
    providers[providerId] = config;

    const activeProviderId = data?.activeProviderId || providerId;
    await this.save({ providers, activeProviderId });
  }

  /**
   * 删除提供者
   */
  public async deleteProvider(providerId: string): Promise<void> {
    const data = await this.load();
    if (!data) {
      return;
    }

    delete data.providers[providerId];

    // 如果删除的是活跃提供者，切换到第一个可用提供者
    if (data.activeProviderId === providerId) {
      const remainingIds = Object.keys(data.providers);
      data.activeProviderId = remainingIds[0] || "";
    }

    await this.save(data);
  }

  /**
   * 获取活跃提供者配置
   */
  public async getActiveProvider(): Promise<ProviderConfig | null> {
    const data = await this.load();
    if (!data || !data.activeProviderId) {
      return null;
    }

    return data.providers[data.activeProviderId] || null;
  }

  /**
   * 清空所有数据
   */
  public async clear(): Promise<void> {
    await this.context.secrets.delete(ApiConfigStorage.STORAGE_KEY);
  }
}
