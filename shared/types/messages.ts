// ============================================================================
// UI Request Messages (Webview → Extension)
// 命名格式: 模块.动作 (module.action)
// ============================================================================
export enum UIRequest {
  // ===== Notification Module =====
  NotificationGetSettings = "notification.getSettings",
  NotificationUpdateSettings = "notification.updateSettings",
  NotificationTest = "notification.test",

  // ===== Prompt Module =====
  PromptGetAll = "prompt.getAll",
  PromptUpdate = "prompt.update",
  PromptReset = "prompt.reset",
  PromptResetAll = "prompt.resetAll",
  PromptCreate = "prompt.create",
  PromptDelete = "prompt.delete",
  PromptRename = "prompt.rename",

  // ===== Indexing Module =====
  IndexingStart = "indexing.start",
  IndexingClear = "indexing.clear",
  IndexingGetSettings = "indexing.getSettings",
  IndexingSaveSettings = "indexing.saveSettings",
  IndexingFetchEmbeddingModels = "indexing.fetchEmbeddingModels",

  // ===== Profile Module =====
  ProfileLoadAll = "profile.loadAll",
  ProfileSave = "profile.save",
  ProfileDelete = "profile.delete",
  ProfileSetActive = "profile.setActive",
  ProfileExport = "profile.export",
  ProfileImport = "profile.import",
  ProfileMigrateSettings = "profile.migrateSettings",
  ProfileResetDefaults = "profile.resetDefaults",
  ProfileGetAllProviders = "profile.getAllProviders",

  // ===== Connection Module =====
  ConnectionTest = "connection.test",
  ConnectionGetModelsForProvider = "connection.getModelsForProvider",
  ConnectionFetchProviderModels = "connection.fetchProviderModels",
  ConnectionGetAllModels = "connection.getAllModels",

  // ===== System Module =====
  SystemShowMessage = "system.showMessage",
  SystemGetPackageInfo = "system.getPackageInfo",
  SystemGetOS = "system.getOS",
  SystemSetGlobalState = "system.setGlobalState",
  SystemGetGlobalState = "system.getGlobalState",
  SystemSetSecret = "system.setSecret",
  SystemGetSecret = "system.getSecret",
  SystemDeleteSecret = "system.deleteSecret",
  SystemGetAllStorage = "system.getAllStorage",
  SystemClearAllStorage = "system.clearAllStorage",

  // ===== Features Module =====
  FeaturesLoadSettings = "features.loadSettings",
  FeaturesSaveSettings = "features.saveSettings",
  FeaturesSetActivePrompt = "features.setActivePrompt",

  // ===== Usage Module =====
  UsageGetStats = "usage.getStats",
  UsageResetStats = "usage.resetStats",
  UsageAddTestData = "usage.addTestData",

  // ===== WeeklyReport Module =====
  WeeklyReportGenerateTeam = "weeklyReport.generateTeam",
  WeeklyReportGetUsers = "weeklyReport.getUsers",
  WeeklyReportNotification = "weeklyReport.notification",

  // ===== Advanced Module =====
  AdvancedLoadSettings = "advanced.loadSettings",
  AdvancedSaveSettings = "advanced.saveSettings",

  // ===== Language Module =====
  LanguageLoadSettings = "language.loadSettings",
  LanguageSaveSettings = "language.saveSettings",

  // ===== Preferences Module =====
  PreferencesLoadSettings = "preferences.loadSettings",
  PreferencesSaveSettings = "preferences.saveSettings",
}

// ============================================================================
// Extension Response Messages (Extension → Webview)
// 命名格式: 模块.状态/结果 (module.state/result)
// ============================================================================
export enum ExtensionResponse {
  // ===== Notification Module =====
  NotificationSettingsLoaded = "notification.settingsLoaded",
  NotificationSettingsUpdated = "notification.settingsUpdated",
  NotificationTestResult = "notification.testResult",

  // ===== Prompt Module =====
  PromptAllLoaded = "prompt.allLoaded",
  PromptUpdated = "prompt.updated",
  PromptResetComplete = "prompt.resetComplete",
  PromptAllResetComplete = "prompt.allResetComplete",
  PromptCreated = "prompt.created",
  PromptDeleted = "prompt.deleted",
  PromptRenamed = "prompt.renamed",

  // ===== Indexing Module =====
  IndexingProgress = "indexing.progress",
  IndexingFinished = "indexing.finished",
  IndexingFailed = "indexing.failed",
  IndexingCleared = "indexing.cleared",
  IndexingSettingsLoaded = "indexing.settingsLoaded",
  IndexingSettingsSaved = "indexing.settingsSaved",
  IndexingSettingsError = "indexing.settingsError",
  IndexingEmbeddingModelsLoaded = "indexing.embeddingModelsLoaded",
  IndexingStatusError = "indexing.statusError",

  // ===== Profile Module =====
  ProfileAllLoaded = "profile.allLoaded",
  ProfileSaved = "profile.saved",
  ProfileDeleted = "profile.deleted",
  ProfileActiveChanged = "profile.activeChanged",
  ProfileExported = "profile.exported",
  ProfileImported = "profile.imported",
  ProfileSettingsMigrated = "profile.settingsMigrated",
  ProfileResetComplete = "profile.resetComplete",
  ProfileAllProvidersLoaded = "profile.allProvidersLoaded",

  // ===== Connection Module =====
  ConnectionTestResult = "connection.testResult",
  ConnectionProviderModelsLoaded = "connection.providerModelsLoaded",
  ConnectionProviderModelsError = "connection.providerModelsError",
  ConnectionAllModelsLoaded = "connection.allModelsLoaded",
  ConnectionAllModelsFetched = "connection.allModelsFetched",

  // ===== System Module =====
  SystemMessageShown = "system.messageShown",
  SystemPackageInfoLoaded = "system.packageInfoLoaded",
  SystemOSInfoLoaded = "system.osInfoLoaded",
  SystemGlobalStateUpdated = "system.globalStateUpdated",
  SystemGlobalStateLoaded = "system.globalStateLoaded",
  SystemSecretUpdated = "system.secretUpdated",
  SystemSecretLoaded = "system.secretLoaded",
  SystemSecretDeleted = "system.secretDeleted",
  SystemAllStorageLoaded = "system.allStorageLoaded",
  SystemStorageCleared = "system.storageCleared",
  SystemError = "system.error",

  // ===== Features Module =====
  FeaturesSettingsLoaded = "features.settingsLoaded",
  FeaturesSettingsUpdated = "features.settingsUpdated",
  FeaturesActivePromptChanged = "features.activePromptChanged",

  // ===== Usage Module =====
  UsageStatsLoaded = "usage.statsLoaded",
  UsageStatsReset = "usage.statsReset",
  UsageTestDataAdded = "usage.testDataAdded",

  // ===== WeeklyReport Module =====
  WeeklyReportUsersListLoaded = "weeklyReport.usersListLoaded",
  WeeklyReportGenerated = "weeklyReport.reportGenerated",

  // ===== Advanced Module =====
  AdvancedSettingsUpdated = "advanced.settingsUpdated",

  // ===== Language Module =====
  LanguageSettingsUpdated = "language.settingsUpdated",
  LanguageSettingsSaveError = "language.settingsSaveError",

  // ===== Preferences Module =====
  PreferencesSettingsUpdated = "preferences.settingsUpdated",
}

// ============================================================================
// Type Utilities
// ============================================================================

/** 所有消息类型的联合 */
export type AllMessageType = UIRequest | ExtensionResponse;

/** 基础消息结构 */
export interface BaseMessage<T = any> {
  command: AllMessageType;
  data?: T;
  requestId?: string; // 用于请求-响应匹配
  payload?: T; // 保持向后兼容
  key?: string; // 某些消息需要的键
  error?: string; // 错误消息
}

/** UI 发送的请求消息 */
export interface UIRequestMessage<T = any> extends BaseMessage<T> {
  command: UIRequest;
}

/** 扩展发送的响应消息 */
export interface ExtensionResponseMessage<T = any> extends BaseMessage<T> {
  command: ExtensionResponse;
}

// ============================================================================
// Chat & Commit Related Types
// ============================================================================

export interface ChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  metadata?: {
    commitMessage?: string;
    suggestions?: string[];
    confidence?: number;
  };
}

export interface CommitChatState {
  messages: ChatMessage[];
  inputValue: string;
  isTyping: boolean;
  selectedImages: string[];
  draftMessage: string;
}

export interface CommitSuggestion {
  text: string;
  type: "template" | "style" | "convention" | "custom";
  confidence: number;
  description?: string;
}

export interface CommitCommand {
  command: string;
  description: string;
  handler: (input: string) => void;
}
