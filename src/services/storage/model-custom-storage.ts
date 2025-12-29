import * as vscode from "vscode";
import { CustomModelInfo, CustomModelRegistry } from "@shared/types/model-custom";
import { getPresetRegistry } from "./model-presets";

/**
 * 自定义模型存储服务
 * 使用 VSCode globalState 持久化用户自定义的模型信息
 */
export class ModelCustomStorage {
  private static readonly KEY = "dish_commit_model_custom";
  private static instance: ModelCustomStorage;
  private static readonly CURRENT_VERSION = "1.0.0";

  private constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * 获取单例实例
   * @param context - VSCode 扩展上下文（首次实例化需要）
   */
  static getInstance(context?: vscode.ExtensionContext): ModelCustomStorage {
    if (!this.instance) {
      if (!context) {
        throw new Error("ModelCustomStorage requires context for first instantiation");
      }
      this.instance = new ModelCustomStorage(context);
    }
    return this.instance;
  }

  /**
   * 保存或更新模型信息
   * @param info - 自定义模型信息
   */
  async saveModelInfo(info: CustomModelInfo): Promise<void> {
    const registry = await this.getAllModelInfo();
    const key = `${info.providerId}_${info.id}`;
    info.lastUpdated = new Date().toISOString();
    registry.models[key] = info;
    await this.saveRegistry(registry);
  }

  /**
   * 获取指定模型信息
   * @param providerId - 提供商ID
   * @param modelId - 模型ID
   * @returns 模型信息或 null
   */
  async getModelInfo(providerId: string, modelId: string): Promise<CustomModelInfo | null> {
    const registry = await this.getAllModelInfo();
    const key = `${providerId}_${modelId}`;
    return registry.models[key] || null;
  }

  /**
   * 获取所有自定义模型信息
   * @returns 完整的注册表数据
   */
  async getAllModelInfo(): Promise<CustomModelRegistry> {
    const data = this.context.globalState.get<string>(ModelCustomStorage.KEY);
    if (!data) {
      // 首次使用，初始化预设模型
      const presetRegistry = getPresetRegistry();
      await this.saveRegistry(presetRegistry);
      return presetRegistry;
    }
    try {
      const registry = JSON.parse(data);
      // 检查是否需要更新预设（如果版本较旧）
      if (registry.version !== ModelCustomStorage.CURRENT_VERSION) {
        await this.updatePresetsIfNeeded(registry);
      }
      return registry;
    } catch {
      // 如果解析失败，返回预设数据
      const presetRegistry = getPresetRegistry();
      await this.saveRegistry(presetRegistry);
      return presetRegistry;
    }
  }

  /**
   * 检查并更新预设模型（保留用户自定义数据）
   * @param existingRegistry - 现有的注册表数据
   */
  private async updatePresetsIfNeeded(existingRegistry: CustomModelRegistry): Promise<void> {
    const presetRegistry = getPresetRegistry();
    const mergedModels = { ...presetRegistry.models, ...existingRegistry.models };

    // 合并数据，用户自定义覆盖预设
    const updatedRegistry: CustomModelRegistry = {
      models: mergedModels,
      version: ModelCustomStorage.CURRENT_VERSION,
      lastSync: new Date().toISOString(),
    };

    await this.saveRegistry(updatedRegistry);
  }

  /**
   * 删除模型信息
   * @param providerId - 提供商ID
   * @param modelId - 模型ID
   */
  async deleteModelInfo(providerId: string, modelId: string): Promise<void> {
    const registry = await this.getAllModelInfo();
    const key = `${providerId}_${modelId}`;
    delete registry.models[key];
    await this.saveRegistry(registry);
  }

  /**
   * 导出所有数据
   * @returns 完整的注册表数据
   */
  async exportData(): Promise<CustomModelRegistry> {
    return await this.getAllModelInfo();
  }

  /**
   * 导入数据
   * @param data - 要导入的注册表数据
   */
  async importData(data: CustomModelRegistry): Promise<void> {
    if (!data.models || typeof data.models !== "object") {
      throw new Error("Invalid data structure");
    }
    await this.saveRegistry(data);
  }

  /**
   * 保存注册表到全局状态
   * @param registry - 注册表数据
   */
  private async saveRegistry(registry: CustomModelRegistry): Promise<void> {
    registry.version = ModelCustomStorage.CURRENT_VERSION;
    registry.lastSync = new Date().toISOString();
    await this.context.globalState.update(
      ModelCustomStorage.KEY,
      JSON.stringify(registry)
    );
  }
}
