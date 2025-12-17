import * as crypto from "crypto";

/**
 * 提交信息缓存服务
 * 用于缓存 AI 生成的提交信息，避免重复请求，解决 429 限流问题
 */
export class CommitCacheService {
  private static instance: CommitCacheService;
  private cache: Map<string, string>;
  private readonly MAX_CACHE_SIZE = 50;

  private constructor() {
    this.cache = new Map();
  }

  public static getInstance(): CommitCacheService {
    if (!CommitCacheService.instance) {
      CommitCacheService.instance = new CommitCacheService();
    }
    return CommitCacheService.instance;
  }

  /**
   * 获取缓存的提交信息
   */
  public get(key: string): string | undefined {
    const value = this.cache.get(key);
    if (value) {
      // 刷新缓存命中位置（LRU）
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  /**
   * 设置缓存
   */
  public set(key: string, value: string): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // 删除最旧的条目
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  /**
   * 生成缓存键
   * 基于 diff 内容、模型 ID 和关键配置生成唯一键
   */
  public generateKey(
    diff: string,
    configuration: any,
    modelId: string
  ): string {
    // 提取只影响生成内容的关键配置，避免无关配置变更导致缓存失效
    const relevantConfig = {
      language: configuration.base?.language,
      emoji: configuration.features?.commitFormat?.enableEmoji,
      body: configuration.features?.commitFormat?.enableBody,
      rule: configuration.features?.commitMessage?.rule, // 提示词规则
    };

    const content = JSON.stringify({
      diff, // 这是最核心的，如果 diff 变了，必须重新生成
      modelId, // 模型不同，结果可能不同
      config: relevantConfig,
    });

    return crypto.createHash("md5").update(content).digest("hex");
  }
}

export const commitCacheService = CommitCacheService.getInstance();
