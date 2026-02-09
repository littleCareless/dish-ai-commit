/**
 * Models.dev 定期更新调度器
 * 负责定期从 Models.dev 拉取最新数据
 */

import { ModelsDevFetcher } from "@/ai/model-registry/models-dev-fetcher";
import * as i18n from "@/utils/i18n";
import { notify } from "@/utils/notification/notification-manager";

/**
 * 调度器配置
 */
export interface SchedulerConfig {
  /** 是否启用自动更新 */
  enabled: boolean;
  /** 更新间隔（毫秒），默认 24 小时 */
  interval: number;
  /** 是否在启动时立即更新 */
  updateOnStart: boolean;
  /** 缓存 TTL（毫秒） */
  cacheTTL: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: SchedulerConfig = {
  enabled: true,
  interval: 24 * 60 * 60 * 1000, // 24 小时
  updateOnStart: true,
  cacheTTL: 24 * 60 * 60 * 1000, // 24 小时
};

/**
 * Models.dev 调度器类
 */
export class ModelsDevScheduler {
  private static instance: ModelsDevScheduler;
  private fetcher: ModelsDevFetcher;
  private config: SchedulerConfig;
  private timerId: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor(config?: Partial<SchedulerConfig>) {
    this.fetcher = ModelsDevFetcher.getInstance();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public static getInstance(config?: Partial<SchedulerConfig>): ModelsDevScheduler {
    if (!ModelsDevScheduler.instance) {
      ModelsDevScheduler.instance = new ModelsDevScheduler(config);
    }
    return ModelsDevScheduler.instance;
  }

  /**
   * 启动调度器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("Models.dev 调度器已在运行");
      return;
    }

    if (!this.config.enabled) {
      console.log("Models.dev 调度器已禁用");
      return;
    }

    this.isRunning = true;
    console.log(`启动 Models.dev 调度器，更新间隔: ${this.config.interval / 1000 / 60} 分钟`);

    // 启动时立即更新
    if (this.config.updateOnStart) {
      await this.runUpdate();
    }

    // 设置定时器
    this.timerId = setInterval(() => {
      this.runUpdate();
    }, this.config.interval);
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
    console.log("Models.dev 调度器已停止");
  }

  /**
   * 执行更新
   */
  private async runUpdate(): Promise<void> {
    try {
      console.log("开始定期更新 Models.dev 数据...");
      const result = await this.fetcher.fetchLatestData({
        forceRefresh: false,
        cacheTTL: this.config.cacheTTL,
      });

      if (result.success) {
        console.log(`Models.dev 数据更新成功: ${result.modelCount} 个模型`);
        if (result.newModels.length > 0 || result.updatedModels.length > 0) {
          console.log(`新增: ${result.newModels.length}, 更新: ${result.updatedModels.length}`);
        }
      } else {
        console.error("Models.dev 数据更新失败:", result.errors);
      }
    } catch (error) {
      console.error("Models.dev 定期更新出错:", error);
    }
  }

  /**
   * 手动触发更新
   */
  async triggerUpdate(forceRefresh = false): Promise<void> {
    console.log("手动触发 Models.dev 数据更新...");
    await this.fetcher.fetchLatestData({
      forceRefresh,
      cacheTTL: this.config.cacheTTL,
    });
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<SchedulerConfig>): void {
    const wasRunning = this.isRunning;

    if (wasRunning) {
      this.stop();
    }

    this.config = { ...this.config, ...config };

    if (wasRunning && this.config.enabled) {
      this.start();
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): SchedulerConfig {
    return { ...this.config };
  }

  /**
   * 获取运行状态
   */
  getStatus(): {
    isRunning: boolean;
    config: SchedulerConfig;
    cacheStats: ReturnType<ModelsDevFetcher["getCacheStats"]>;
  } {
    return {
      isRunning: this.isRunning,
      config: this.getConfig(),
      cacheStats: this.fetcher.getCacheStats(),
    };
  }
}

/**
 * 便捷函数：启动调度器
 */
export async function startModelsDevScheduler(config?: Partial<SchedulerConfig>): Promise<void> {
  const scheduler = ModelsDevScheduler.getInstance(config);
  await scheduler.start();
}

/**
 * 便捷函数：停止调度器
 */
export function stopModelsDevScheduler(): void {
  const scheduler = ModelsDevScheduler.getInstance();
  scheduler.stop();
}

/**
 * 便捷函数：手动触发更新
 */
export async function triggerModelsDevUpdate(forceRefresh = false): Promise<void> {
  const scheduler = ModelsDevScheduler.getInstance();
  await scheduler.triggerUpdate(forceRefresh);
}

/**
 * 便捷函数：获取调度器状态
 */
export function getModelsDevSchedulerStatus() {
  const scheduler = ModelsDevScheduler.getInstance();
  return scheduler.getStatus();
}
