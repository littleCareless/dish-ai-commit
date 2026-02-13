import * as vscode from "vscode";
import { MigrationService } from "./migration-service";
import { NewSettingsMigration } from "./new-settings-migration";
import { StorageManager } from "./storage-manager";

/**
 * 存储架构测试工具
 * 用于验证新存储架构的各个组件是否正常工作
 */
export class StorageTest {
  private storageManager: StorageManager;

  constructor(private context: vscode.ExtensionContext) {
    this.storageManager = StorageManager.getInstance(context);
  }

  /**
   * 运行所有测试
   */
  public async runAllTests(): Promise<{
    passed: number;
    failed: number;
    results: Array<{ name: string; success: boolean; error?: string }>;
  }> {
    const results = [];
    let passed = 0;
    let failed = 0;

    const tests = [
      this.testApiConfigStorage,
      this.testPreferencesStorage,
      this.testFeaturesStorage,
      this.testAdvancedStorage,
      this.testStorageManager,
      this.testExportImport,
      this.testMigration,
    ];

    for (const test of tests) {
      try {
        await test.call(this);
        results.push({ name: test.name, success: true });
        passed++;
        console.log(`✅ ${test.name}`);
      } catch (error) {
        results.push({
          name: test.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
        failed++;
        console.error(`❌ ${test.name}:`, error);
      }
    }

    return { passed, failed, results };
  }

  /**
   * 测试API配置存储
   */
  private async testApiConfigStorage(): Promise<void> {
    const apiConfig = this.storageManager.apiConfig;

    // 测试保存
    await apiConfig.save({
      providers: {
        openai: {
          id: "openai",
          name: "OpenAI",
          type: "first-party",
          apiKey: "sk-test-key",
          baseUrl: "https://api.openai.com/v1",
          defaultModel: "gpt-4o-mini",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      activeProviderId: "openai",
    });

    // 测试加载
    const loaded = await apiConfig.load();
    if (!loaded || !loaded.providers.openai) {
      throw new Error("API配置加载失败");
    }

    if (loaded.providers.openai.apiKey !== "sk-test-key") {
      throw new Error("API密钥不匹配");
    }

    // 测试更新提供者
    await apiConfig.updateProvider("anthropic", {
      id: "anthropic",
      name: "Anthropic",
      type: "first-party",
      apiKey: "sk-anthropic-test",
      baseUrl: "https://api.anthropic.com/v1",
      defaultModel: "claude-3-haiku-20240307",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const updated = await apiConfig.load();
    if (!updated?.providers.anthropic) {
      throw new Error("提供者更新失败");
    }

    // 测试活跃提供者切换
    await apiConfig.setActiveProviderId("anthropic");
    const active = await apiConfig.getActiveProvider();
    if (active?.id !== "anthropic") {
      throw new Error("活跃提供者切换失败");
    }

    // 清理
    await apiConfig.clear();
  }

  /**
   * 测试偏好设置存储
   */
  private async testPreferencesStorage(): Promise<void> {
    const preferences = this.storageManager.preferences;

    // 测试保存
    await preferences.save({
      language: "English",
      commitTemperature: 0.8,
      reviewTemperature: 0.9,
      branchNameTemperature: 0.7,
      weeklyReportTemperature: 0.6,
      skipDiffFileExtensions: [".png", ".jpg"],
      skipDiffPathPatterns: ["node_modules/**"],
      maxDiffFileSizeKB: 1000,
      autoDetectBinaryFiles: false,
      respectGitAttributes: false,
      timeout: 60000,
      retryAttempts: 5,
      rateLimitSeconds: 10,
      consecutiveMistakeLimit: 5,
      maxTokens: 8000,
    });

    // 测试加载
    const loaded = await preferences.load();
    if (loaded.language !== "English" || loaded.commitTemperature !== 0.8) {
      throw new Error("偏好设置加载失败");
    }

    // 测试单个设置
    const lang = await preferences.get("language");
    if (lang !== "English") {
      throw new Error("获取单个设置失败");
    }

    // 测试更新
    await preferences.set("language", "Simplified Chinese");
    const updated = await preferences.get("language");
    if (updated !== "Simplified Chinese") {
      throw new Error("设置单个值失败");
    }

    // 测试重置
    await preferences.reset();
    const reset = await preferences.load();
    if (reset.language !== "Simplified Chinese") {
      throw new Error("重置失败");
    }
  }

  /**
   * 测试功能开关存储
   */
  private async testFeaturesStorage(): Promise<void> {
    const features = this.storageManager.features;

    // 测试保存
    await features.save({
      largePromptAction: "ask",
      enableEmoji: false,
      enableMergeCommit: true,
      enableBody: false,
      enableLayeredCommit: true,
      enableGlobalContext: false,
      useRecentCommitsAsReference: true,
      simplifyDiff: true,
      autoDetectStaged: false,
      fallbackToAll: false,
      diffTarget: "staged",
      suppressNonCriticalWarnings: false,
      weeklyReport: false,
      codeReview: false,
      generateBranchName: false,
      generatePRSummary: false,
    });

    // 测试加载
    const loaded = await features.load();
    if (loaded.enableEmoji !== false || loaded.enableMergeCommit !== true) {
      throw new Error("功能设置加载失败");
    }

    // 测试启用/禁用
    await features.enable("enableEmoji");
    const enabled = await features.get("enableEmoji");
    if (!enabled) {
      throw new Error("启用功能失败");
    }

    await features.disable("enableMergeCommit");
    const disabled = await features.get("enableMergeCommit");
    if (disabled) {
      throw new Error("禁用功能失败");
    }

    // 测试切换
    const newStatus = await features.toggle("weeklyReport");
    if (newStatus !== false) {
      throw new Error("切换功能失败");
    }

    // 重置
    await features.reset();
  }

  /**
   * 测试高级设置存储
   */
  private async testAdvancedStorage(): Promise<void> {
    const advanced = this.storageManager.advanced;

    // 测试保存
    await advanced.save({
      verbosity: 2,
      rateLimitSeconds: 5,
      timeout: 45000,
      retryAttempts: 4,
      consecutiveMistakeLimit: 6,
      maxTokens: 10000,
    });

    // 测试加载
    const loaded = await advanced.load();
    if (loaded.verbosity !== 2 || loaded.timeout !== 45000) {
      throw new Error("高级设置加载失败");
    }

    // 测试调试模式
    const isDebug = await advanced.isDebugMode();
    if (!isDebug) {
      throw new Error("调试模式检测失败");
    }

    await advanced.setDebugMode(false);
    const notDebug = await advanced.isDebugMode();
    if (notDebug) {
      throw new Error("关闭调试模式失败");
    }

    // 重置
    await advanced.reset();
  }

  /**
   * 测试统一存储管理器
   */
  private async testStorageManager(): Promise<void> {
    // 测试统一导出
    const all = await this.storageManager.exportAll();
    if (!all.apiConfig || !all.preferences || !all.features || !all.advanced) {
      throw new Error("统一导出失败");
    }

    // 测试向后兼容方法
    const provider = await this.storageManager.getActiveProviderConfig();
    const features = await this.storageManager.getFeatureSettings();
    const prefs = await this.storageManager.getPreferences();
    const adv = await this.storageManager.getAdvancedSettings();

    if (!features || !prefs || !adv) {
      throw new Error("向后兼容方法失败");
    }

    // 测试重置所有
    await this.storageManager.resetAll();
  }

  /**
   * 测试导出导入
   */
  private async testExportImport(): Promise<void> {
    // 准备测试数据
    await this.storageManager.preferences.save({
      language: "Japanese",
      commitTemperature: 0.5,
      reviewTemperature: 0.6,
      branchNameTemperature: 0.4,
      weeklyReportTemperature: 0.3,
      skipDiffFileExtensions: [".test"],
      skipDiffPathPatterns: ["test/**"],
      maxDiffFileSizeKB: 200,
      autoDetectBinaryFiles: true,
      respectGitAttributes: true,
      timeout: 20000,
      retryAttempts: 2,
      rateLimitSeconds: 3,
      consecutiveMistakeLimit: 2,
    });

    // 导出到JSON
    const json = await this.storageManager.exportToJson();
    if (!json || typeof json !== "string") {
      throw new Error("导出JSON失败");
    }

    // 解析验证
    const parsed = JSON.parse(json);
    if (parsed.preferences.language !== "Japanese") {
      throw new Error("导出数据不正确");
    }

    // 修改数据后重新导入
    parsed.preferences.language = "Korean";
    await this.storageManager.importAll(parsed);

    // 验证导入
    const imported = await this.storageManager.preferences.get("language");
    if (imported !== "Korean") {
      throw new Error("导入失败");
    }

    // 清理
    await this.storageManager.preferences.reset();
  }

  /**
   * 测试迁移服务
   */
  private async testMigration(): Promise<void> {
    const migration = new MigrationService(this.context);

    // 测试检测
    const detection = await migration.detectOldConfiguration();
    if (typeof detection.migrationNeeded !== "boolean") {
      throw new Error("迁移检测失败");
    }

    // 测试新迁移系统
    const newMigration = new NewSettingsMigration(this.context);
    const status = await newMigration.getMigrationStatus();
    if (
      typeof status.needed !== "boolean" ||
      typeof status.completed !== "boolean"
    ) {
      throw new Error("新迁移系统失败");
    }

    // 测试预览（如果需要迁移）
    if (detection.migrationNeeded) {
      const preview = await migration.previewMigration();
      if (preview && !preview.newData) {
        throw new Error("迁移预览失败");
      }
    }
  }

  /**
   * 清理测试数据
   */
  public async cleanup(): Promise<void> {
    await this.storageManager.resetAll();
    console.log("✅ 测试数据已清理");
  }
}

/**
 * 运行存储架构测试
 */
export async function runStorageTests(
  context: vscode.ExtensionContext
): Promise<void> {
  console.log("🧪 开始存储架构测试...");

  const test = new StorageTest(context);
  const result = await test.runAllTests();

  console.log(`\n📊 测试结果: ${result.passed} 通过, ${result.failed} 失败`);

  if (result.failed > 0) {
    console.log("❌ 失败的测试:");
    result.results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
  } else {
    console.log("🎉 所有测试通过！");
  }

  // 清理
  await test.cleanup();
}
