import * as vscode from "vscode";
import { AdvancedStorage, AdvancedStorageData } from "./advanced-storage";
import { ApiConfigStorage, ApiConfigStorageData } from "./api-config-storage";
import { FeaturesStorage, FeaturesStorageData } from "./features-storage";
import {
  PreferencesStorage,
  PreferencesStorageData,
} from "./preferences-storage";

/**
 * 统一存储管理器
 * 提供对所有独立存储模块的统一访问接口
 */
export class StorageManager {
  private static instance: StorageManager;

  public readonly apiConfig: ApiConfigStorage;
  public readonly preferences: PreferencesStorage;
  public readonly features: FeaturesStorage;
  public readonly advanced: AdvancedStorage;

  private constructor(private context: vscode.ExtensionContext) {
    this.apiConfig = ApiConfigStorage.getInstance(context);
    this.preferences = PreferencesStorage.getInstance(context);
    this.features = FeaturesStorage.getInstance(context);
    this.advanced = AdvancedStorage.getInstance(context);
  }

  /**
   * 获取StorageManager实例
   */
  public static getInstance(context: vscode.ExtensionContext): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager(context);
    }
    return StorageManager.instance;
  }

  /**
   * 导出所有配置
   */
  public async exportAll(): Promise<{
    apiConfig: ApiConfigStorageData | null;
    preferences: PreferencesStorageData;
    features: FeaturesStorageData;
    advanced: AdvancedStorageData;
  }> {
    const [apiConfig, preferences, features, advanced] = await Promise.all([
      this.apiConfig.load(),
      this.preferences.load(),
      this.features.load(),
      this.advanced.load(),
    ]);

    return {
      apiConfig,
      preferences,
      features,
      advanced,
    };
  }

  /**
   * 导入所有配置
   */
  public async importAll(data: {
    apiConfig?: ApiConfigStorageData | null;
    preferences?: PreferencesStorageData;
    features?: FeaturesStorageData;
    advanced?: AdvancedStorageData;
  }): Promise<void> {
    const promises: Promise<void>[] = [];

    if (data.apiConfig) {
      promises.push(this.apiConfig.save(data.apiConfig));
    }
    if (data.preferences) {
      promises.push(this.preferences.save(data.preferences));
    }
    if (data.features) {
      promises.push(this.features.save(data.features));
    }
    if (data.advanced) {
      promises.push(this.advanced.save(data.advanced));
    }

    await Promise.all(promises);
  }

  /**
   * 重置所有设置为默认值
   */
  public async resetAll(): Promise<void> {
    await Promise.all([
      this.apiConfig.clear(),
      this.preferences.reset(),
      this.features.reset(),
      this.advanced.reset(),
    ]);
  }

  /**
   * 获取所有设置的汇总信息（用于向后兼容）
   */
  public async getAllSettings(): Promise<{
    apiConfig: ApiConfigStorageData | null;
    preferences: PreferencesStorageData;
    features: FeaturesStorageData;
    advanced: AdvancedStorageData;
  }> {
    return await this.exportAll();
  }

  /**
   * 获取活跃提供者配置（向后兼容接口）
   */
  public async getActiveProviderConfig() {
    return await this.apiConfig.getActiveProvider();
  }

  /**
   * 获取功能设置（向后兼容接口）
   */
  public async getFeatureSettings(): Promise<FeaturesStorageData> {
    return await this.features.load();
  }

  /**
   * 获取偏好设置（向后兼容接口）
   */
  public async getPreferences(): Promise<PreferencesStorageData> {
    return await this.preferences.load();
  }

  /**
   * 获取高级设置（向后兼容接口）
   */
  public async getAdvancedSettings(): Promise<AdvancedStorageData> {
    return await this.advanced.load();
  }

  /**
   * 导出为JSON字符串
   */
  public async exportToJson(): Promise<string> {
    const data = await this.exportAll();
    return JSON.stringify(data, null, 2);
  }

  /**
   * 从JSON字符串导入
   */
  public async importFromJson(jsonString: string): Promise<void> {
    try {
      const data = JSON.parse(jsonString);
      await this.importAll(data);
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error}`);
    }
  }

  /**
   * 导出到文件
   */
  public async exportToFile(): Promise<string> {
    const json = await this.exportToJson();

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`dish-commit-config-${Date.now()}.json`),
      filters: {
        "JSON Files": ["json"],
      },
      title: "导出配置文件",
    });

    if (uri) {
      const data = Buffer.from(json, "utf8");
      await vscode.workspace.fs.writeFile(uri, data);
      return uri.fsPath;
    }

    throw new Error("用户取消了导出操作");
  }

  /**
   * 从文件导入
   */
  public async importFromFile(): Promise<void> {
    const uris = await vscode.window.showOpenDialog({
      filters: {
        "JSON Files": ["json"],
      },
      title: "选择配置文件导入",
      canSelectMany: false,
    });

    if (!uris || uris.length === 0) {
      throw new Error("用户取消了导入操作");
    }

    const uri = uris[0];
    const data = await vscode.workspace.fs.readFile(uri);
    const json = Buffer.from(data).toString("utf8");

    await this.importFromJson(json);
  }
}
