// 存储模块导出
export { AdvancedStorage, type AdvancedStorageData } from "./advanced-storage";
export {
  ApiConfigStorage,
  type ApiConfigStorageData,
} from "./api-config-storage";
export { FeaturesStorage, type FeaturesStorageData } from "./features-storage";
export {
  PreferencesStorage,
  type PreferencesStorageData,
} from "./preferences-storage";

// 统一管理器
export { StorageManager } from "./storage-manager";

// 迁移服务
export {
  MigrationService,
  type MigrationDetectionResult,
  type MigrationPreview,
  type MigrationResult,
} from "./migration-service";

// 新迁移系统（文档中提到的）
export { NewSettingsMigration } from "./new-settings-migration";
