import { ISCMProvider } from "@/scm/scm-provider";
import { Logger } from "@/utils/logger";

export interface SCMContext {
  provider: ISCMProvider;
  repositoryPath: string;
  selectedFiles: string[];
  timestamp: number;
}

export class SCMContextCache {
  private static instance: SCMContextCache;
  private cache = new Map<string, { data: SCMContext; ts: number }>();
  private readonly TTL = 3000;
  private logger = Logger.getInstance("SCMContextCache");

  private constructor() {}

  static getInstance(): SCMContextCache {
    if (!SCMContextCache.instance) {
      SCMContextCache.instance = new SCMContextCache();
    }
    return SCMContextCache.instance;
  }

  get(repoPath: string): SCMContext | null {
    const entry = this.cache.get(repoPath);
    if (!entry) {
      this.logger.debug("[SCMContextCache] MISS - Not found", {
        data: { repoPath },
      });
      return null;
    }

    if (Date.now() - entry.ts > this.TTL) {
      this.cache.delete(repoPath);
      this.logger.info("[SCMContextCache] MISS - Expired", {
        data: { repoPath },
      });
      return null;
    }

    this.logger.info("[SCMContextCache] HIT", { data: { repoPath } });
    return entry.data;
  }

  set(repoPath: string, ctx: SCMContext): void {
    this.cache.set(repoPath, {
      data: ctx,
      ts: Date.now(),
    });
    this.logger.info("[SCMContextCache] SET", { data: { repoPath } });
  }

  invalidate(repoPath: string): void {
    this.cache.delete(repoPath);
    this.logger.info("[SCMContextCache] INVALIDATE", { data: { repoPath } });
  }

  clear(): void {
    this.cache.clear();
    this.logger.info("[SCMContextCache] All caches cleared");
  }
}
