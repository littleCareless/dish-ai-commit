import * as vscode from "vscode";
import { MigrationService } from "./migration-service";
import { StorageManager } from "./storage-manager";

/**
 * 新迁移系统 - 简化版迁移服务
 * 提供更友好的API用于扩展激活时的自动迁移
 */
export class NewSettingsMigration {
  private migrationService: MigrationService;
  private storageManager: StorageManager;

  constructor(private context: vscode.ExtensionContext) {
    this.migrationService = new MigrationService(context);
    this.storageManager = StorageManager.getInstance(context);
  }

  /**
   * 检测旧配置
   */
  public async detectOldConfiguration() {
    return await this.migrationService.detectOldConfiguration();
  }

  /**
   * 预览迁移
   */
  public async previewMigration() {
    return await this.migrationService.previewMigration();
  }

  /**
   * 执行迁移
   */
  public async performMigration() {
    return await this.migrationService.performMigration();
  }

  /**
   * 清理遗留存储
   */
  public async cleanupLegacyStorage() {
    await this.migrationService.cleanupLegacyStorage();
  }

  /**
   * 自动迁移流程
   */
  public async autoMigrate(): Promise<{
    success: boolean;
    migratedBlocks: number;
    message: string;
  }> {
    const detection = await this.detectOldConfiguration();

    if (!detection.migrationNeeded) {
      return {
        success: true,
        migratedBlocks: 0,
        message: "无需迁移，系统已是最新架构",
      };
    }

    const result = await this.performMigration();

    if (result.success) {
      await this.cleanupLegacyStorage();

      return {
        success: true,
        migratedBlocks: result.migratedBlocks,
        message: `成功迁移 ${result.migratedBlocks} 个配置块`,
      };
    } else {
      return {
        success: false,
        migratedBlocks: 0,
        message: `迁移失败: ${result.errors.join(", ")}`,
      };
    }
  }

  /**
   * 检查是否已完成迁移
   */
  public async isMigrationCompleted(): Promise<boolean> {
    return await this.migrationService.isMigrationCompleted();
  }

  /**
   * 获取迁移状态摘要
   */
  public async getMigrationStatus(): Promise<{
    needed: boolean;
    completed: boolean;
    details: any;
  }> {
    const [detection, completed] = await Promise.all([
      this.detectOldConfiguration(),
      this.isMigrationCompleted(),
    ]);

    return {
      needed: detection.migrationNeeded,
      completed,
      details: detection.details,
    };
  }
}
