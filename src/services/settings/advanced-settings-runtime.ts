import { RateLimiterService } from "@/services/core/rate-limiter-service";
import { PreferencesSettingsManager } from "@/services/settings/preferences-settings-manager";
import { UserPreferences } from "@/types/settings";
import { Logger, LogLevel } from "@/utils/logger";

export interface AdvancedRuntimeSettings {
  verbosity: number;
  rateLimitSeconds: number;
  timeout: number;
  retryAttempts: number;
  consecutiveMistakeLimit: number;
  maxTokens?: number;
}

/**
 * 运行时高级设置控制器
 * - 应用速率限制
 * - 处理超时与重试
 * - 记录连续失败次数
 * - 动态调整日志详细程度
 */
export class AdvancedSettingsRuntime {
  private static instance: AdvancedSettingsRuntime;

  private readonly rateLimiter = RateLimiterService.getInstance();
  private readonly failureCounters = new Map<string, number>();
  private readonly logger = Logger.getInstance("Dish AI Commit Gen");
  private lastVerbosity: number | undefined;

  public static getInstance(): AdvancedSettingsRuntime {
    if (!AdvancedSettingsRuntime.instance) {
      AdvancedSettingsRuntime.instance = new AdvancedSettingsRuntime();
    }
    return AdvancedSettingsRuntime.instance;
  }

  /**
   * 获取最新的高级设置，并根据需要应用日志级别
   */
  public getSettings(): AdvancedRuntimeSettings {
    const preferences =
      PreferencesSettingsManager.getInstance().getSettings();

    const runtime: AdvancedRuntimeSettings = {
      verbosity: preferences.verbosity ?? 1,
      rateLimitSeconds: preferences.rateLimitSeconds ?? 0,
      timeout: preferences.timeout ?? 30000,
      retryAttempts: preferences.retryAttempts ?? 3,
      consecutiveMistakeLimit: preferences.consecutiveMistakeLimit ?? 3,
      maxTokens: preferences.maxTokens,
    };

    this.applyVerbosity(runtime.verbosity);
    return runtime;
  }

  /**
   * 在执行AI请求之前应用高级控制（速率限制、超时、重试、失败计数）
   */
  public async executeWithControls<T>(
    providerId: string,
    operation: () => Promise<T>,
    settings?: AdvancedRuntimeSettings,
  ): Promise<T> {
    const runtime = settings ?? this.getSettings();

    if (runtime.rateLimitSeconds > 0) {
      await this.rateLimiter.acquire(
        `advanced:${providerId}`,
        1,
        runtime.rateLimitSeconds,
      );
    }

    const attempts = Math.max(1, runtime.retryAttempts || 1);
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const result = await this.executeWithTimeout(operation, runtime.timeout);
        this.resetFailures(providerId);
        return result;
      } catch (error) {
        lastError = error;
        const failures = this.incrementFailures(providerId);

        if (
          runtime.consecutiveMistakeLimit > 0 &&
          failures >= runtime.consecutiveMistakeLimit
        ) {
          this.logger.warn(
            `Provider ${providerId} reached consecutive failure limit (${runtime.consecutiveMistakeLimit}).`,
          );
          throw new Error(
            `AI调用连续失败 ${failures} 次，已达到上限（${runtime.consecutiveMistakeLimit}）。请检查网络或提供商设置。`,
          );
        }

        if (attempt < attempts) {
          await this.delay(250 * attempt);
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(String(lastError));
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs?: number,
  ): Promise<T> {
    if (!timeoutMs || timeoutMs <= 0) {
      return operation();
    }

    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) =>
        setTimeout(() => {
          reject(
            new Error(
              `AI请求超时：超过 ${timeoutMs} ms 未完成，请尝试降低上下文大小或提高超时时间。`,
            ),
          );
        }, timeoutMs),
      ),
    ]);
  }

  private incrementFailures(providerId: string): number {
    const current = (this.failureCounters.get(providerId) ?? 0) + 1;
    this.failureCounters.set(providerId, current);
    return current;
  }

  private resetFailures(providerId: string): void {
    this.failureCounters.delete(providerId);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private applyVerbosity(level: number): void {
    if (level === this.lastVerbosity) {
      return;
    }

    if (level <= 0) {
      Logger.setMinimumLevel(LogLevel.WARN);
    } else if (level === 1) {
      Logger.setMinimumLevel(LogLevel.INFO);
    } else {
      Logger.setMinimumLevel(LogLevel.DEBUG);
    }

    this.lastVerbosity = level;
  }
}
