import { EMBEDDING_MODEL_PROFILES } from "@/core/indexing/embedding-model-profiles";
import { EmbeddingService } from "@/core/indexing/embedding-service";
import { VectorStore } from "@/core/indexing/vector-store";
import { getWorkspacePath } from "@/core/utils/path";
import {
  IndexingSettings,
  IndexingSettingsManager,
} from "@/services/settings/indexing-settings-manager";
import { exec } from "child_process";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import * as vscode from "vscode";

const execAsync = promisify(exec);
const statAsync = promisify(fs.stat);
const readdirAsync = promisify(fs.readdir);

/**
 * 仓库信息
 */
export interface RepositoryInfo {
  path: string;
  name: string;
  type: "git" | "svn" | "unknown";
}

/**
 * 仓库索引状态
 */
export interface RepositoryIndexingState {
  repository: RepositoryInfo;
  embeddingService: EmbeddingService;
  isIndexed: number;
  lastIndexed?: Date;
}

/**
 * 管理 EmbeddingService 的单例实例
 * 支持单仓库和多仓库索引模式
 */
export class EmbeddingServiceManager {
  private static _instance: EmbeddingServiceManager | null = null;
  private _embeddingService: EmbeddingService | null = null;
  private _indexingSettingsManager: IndexingSettingsManager | null = null;

  /** 多仓库模式下的仓库服务映射 */
  private _repositoryServices: Map<string, RepositoryIndexingState> = new Map();
  /** 检测到的仓库列表 */
  private _detectedRepositories: RepositoryInfo[] = [];

  private constructor() {
    // 私有构造函数，确保单例模式
  }

  /**
   * 设置 IndexingSettingsManager 实例
   */
  public setIndexingSettingsManager(manager: IndexingSettingsManager): void {
    this._indexingSettingsManager = manager;
  }

  /**
   * 获取索引设置
   */
  public getSettings(): IndexingSettings | null {
    return this._indexingSettingsManager?.getSettings() ?? null;
  }

  /**
   * 检查代码索引是否启用
   */
  public isEnabled(): boolean {
    return this._indexingSettingsManager?.getSettings().enabled ?? false;
  }

  /**
   * 检查是否启用多仓库索引
   */
  public isMultiRepoEnabled(): boolean {
    return this._indexingSettingsManager?.getSettings().enableMultiRepoIndexing ?? true;
  }

  /**
   * 获取 EmbeddingServiceManager 的单例实例
   * @returns EmbeddingServiceManager 单例实例
   */
  public static getInstance(): EmbeddingServiceManager {
    if (!EmbeddingServiceManager._instance) {
      EmbeddingServiceManager._instance = new EmbeddingServiceManager();
    }
    return EmbeddingServiceManager._instance;
  }

  /**
   * 获取检测到的仓库列表
   */
  public getDetectedRepositories(): RepositoryInfo[] {
    return [...this._detectedRepositories];
  }

  /**
   * 获取所有仓库的索引状态
   */
  public async getRepositoriesStatus(): Promise<Array<{
    repository: RepositoryInfo;
    isIndexed: number;
    lastIndexed?: Date;
  }>> {
    const statuses: Array<{
      repository: RepositoryInfo;
      isIndexed: number;
      lastIndexed?: Date;
    }> = [];

    for (const [, state] of this._repositoryServices) {
      try {
        const isIndexed = await state.embeddingService.isIndexed();
        statuses.push({
          repository: state.repository,
          isIndexed,
          lastIndexed: state.lastIndexed,
        });
      } catch (error) {
        console.warn(`[EmbeddingServiceManager] Failed to get status for ${state.repository.name}:`, error);
        statuses.push({
          repository: state.repository,
          isIndexed: 0,
        });
      }
    }

    return statuses;
  }

  /**
   * 检测工作区内的仓库
   */
  public async detectRepositories(): Promise<RepositoryInfo[]> {
    const repositories: RepositoryInfo[] = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
      return repositories;
    }

    for (const folder of workspaceFolders) {
      const folderRepos = await this.discoverRepositories(folder.uri.fsPath);
      repositories.push(...folderRepos);
    }

    this._detectedRepositories = repositories;
    console.log(`[EmbeddingServiceManager] Detected ${repositories.length} repositories`);
    repositories.forEach(repo => {
      console.log(`  - ${repo.name} (${repo.type}): ${repo.path}`);
    });

    return repositories;
  }

  /**
   * 在指定目录中发现仓库
   */
  private async discoverRepositories(rootPath: string): Promise<RepositoryInfo[]> {
    const repositories: RepositoryInfo[] = [];

    try {
      // 检查根目录本身是否是仓库
      const rootRepo = await this.checkRepository(rootPath);
      if (rootRepo) {
        repositories.push(rootRepo);
      } else {
        // 搜索子目录
        const subdirs = await this.getSubdirectories(rootPath);
        for (const subdir of subdirs) {
          const subdirPath = path.join(rootPath, subdir);
          const repo = await this.checkRepository(subdirPath);
          if (repo) {
            repositories.push(repo);
          }
        }
      }
    } catch (error) {
      console.warn(`[EmbeddingServiceManager] Error discovering repositories in ${rootPath}:`, error);
    }

    return repositories;
  }

  /**
   * 检查目录是否是仓库
   */
  private async checkRepository(dirPath: string): Promise<RepositoryInfo | undefined> {
    // 检查 Git 仓库
    const gitRepo = await this.checkGitRepository(dirPath);
    if (gitRepo) return gitRepo;

    // 检查 SVN 仓库
    const svnRepo = await this.checkSvnRepository(dirPath);
    if (svnRepo) return svnRepo;

    return undefined;
  }

  private async checkGitRepository(dirPath: string): Promise<RepositoryInfo | undefined> {
    try {
      const { stdout } = await execAsync("git rev-parse --show-toplevel", {
        cwd: dirPath,
        encoding: "utf8",
      });
      const repoPath = stdout?.trim();
      return {
        path: repoPath,
        name: path.basename(repoPath),
        type: "git",
      };
    } catch {
      return undefined;
    }
  }

  private async checkSvnRepository(dirPath: string): Promise<RepositoryInfo | undefined> {
    try {
      const svnDir = path.join(dirPath, ".svn");
      const stat = await statAsync(svnDir);
      if (stat.isDirectory()) {
        return {
          path: dirPath,
          name: path.basename(dirPath),
          type: "svn",
        };
      }
    } catch {
      // Not an SVN repository
    }
    return undefined;
  }

  private async getSubdirectories(dirPath: string): Promise<string[]> {
    try {
      const entries = await readdirAsync(dirPath);
      const subdirs: string[] = [];

      for (const entry of entries) {
        if (entry.startsWith(".")) continue;
        const entryPath = path.join(dirPath, entry);
        try {
          const stat = await statAsync(entryPath);
          if (stat.isDirectory()) {
            subdirs.push(entry);
          }
        } catch {
          // Skip
        }
      }

      return subdirs;
    } catch {
      return [];
    }
  }

  /**
   * 为指定仓库创建 EmbeddingService
   */
  private createServiceForRepository(repository: RepositoryInfo): EmbeddingService {
    const settings = this._indexingSettingsManager?.getSettings();
    const qdrantUrl = settings?.qdrantUrl || "http://localhost:6333";

    // 为每个仓库生成独立的 collection name
    const hash = createHash("sha256").update(repository.path).digest("hex");
    const qdrantCollectionName = `dish-${hash.substring(0, 16)}`;

    const embeddingProvider = (settings?.provider || "openai") as
      | "openai"
      | "ollama"
      | "openai-compatible";

    let vectorSize: number;
    if (embeddingProvider === "openai-compatible") {
      const providerSettings = settings?.providers?.["openai-compatible"];
      vectorSize = providerSettings?.modelDimensions || 1536;
    } else {
      const embeddingModel = settings?.embeddingModel || "text-embedding-3-small";
      const modelProfile =
        EMBEDDING_MODEL_PROFILES[embeddingProvider.toLowerCase()]?.[embeddingModel];
      vectorSize = modelProfile?.dimension || 1536;
    }

    const vectorStore = new VectorStore(
      qdrantUrl,
      qdrantCollectionName,
      vectorSize
    );

    const service = new EmbeddingService(
      vectorStore,
      repository.name,
      repository.path
    );

    console.log(
      `[EmbeddingServiceManager] Created EmbeddingService for repository: ${repository.name} (collection: ${qdrantCollectionName})`
    );

    return service;
  }

  /**
   * 初始化 EmbeddingService 实例
   * 支持多仓库模式
   */
  public async initialize(): Promise<EmbeddingService | undefined> {
    if (this._embeddingService) {
      console.warn("EmbeddingServiceManager is already initialized.");
      return this._embeddingService;
    }

    const settings = this._indexingSettingsManager?.getSettings();
    const enableMultiRepo = settings?.enableMultiRepoIndexing ?? true;

    if (enableMultiRepo) {
      // 多仓库模式：检测并初始化所有仓库
      const repositories = await this.detectRepositories();

      if (repositories.length === 0) {
        console.warn("[EmbeddingServiceManager] No repositories detected.");
        return this.initializeFallback();
      }

      // 为每个仓库创建服务
      for (const repo of repositories) {
        const service = this.createServiceForRepository(repo);
        this._repositoryServices.set(repo.path, {
          repository: repo,
          embeddingService: service,
          isIndexed: 0,
        });
      }

      // 使用第一个仓库的服务作为默认服务（向后兼容）
      const firstRepo = repositories[0];
      this._embeddingService = this._repositoryServices.get(firstRepo.path)?.embeddingService || null;

      console.log(
        `[EmbeddingServiceManager] Initialized ${repositories.length} repository services in multi-repo mode`
      );

      return this._embeddingService ?? undefined;
    } else {
      // 单仓库模式：使用原有逻辑
      return this.initializeFallback();
    }
  }

  /**
   * 回退的单仓库初始化逻辑
   */
  private initializeFallback(): EmbeddingService | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const projectRoot = workspaceFolders[0].uri.fsPath;
      const projectName = path.basename(projectRoot);

      const settings = this._indexingSettingsManager?.getSettings();
      const qdrantUrl = settings?.qdrantUrl || "http://localhost:6333";

      const workspacePath = getWorkspacePath();
      const hash = createHash("sha256").update(workspacePath).digest("hex");
      const qdrantCollectionName = `dish-${hash.substring(0, 16)}`;

      const embeddingProvider = (settings?.provider || "openai") as
        | "openai"
        | "ollama"
        | "openai-compatible";

      let vectorSize: number;
      if (embeddingProvider === "openai-compatible") {
        const providerSettings = settings?.providers?.["openai-compatible"];
        vectorSize = providerSettings?.modelDimensions || 1536;
      } else {
        const embeddingModel = settings?.embeddingModel || "text-embedding-3-small";
        const modelProfile =
          EMBEDDING_MODEL_PROFILES[embeddingProvider.toLowerCase()]?.[embeddingModel];
        vectorSize = modelProfile?.dimension || 1536;
      }

      const vectorStore = new VectorStore(
        qdrantUrl,
        qdrantCollectionName,
        vectorSize
      );

      this._embeddingService = new EmbeddingService(
        vectorStore,
        projectName,
        projectRoot
      );

      console.log(
        `[EmbeddingServiceManager] Initialized EmbeddingService for project: ${projectName}`
      );
      return this._embeddingService;
    } else {
      console.warn(
        "[EmbeddingServiceManager] No workspace folder found. EmbeddingService will not be initialized."
      );
      return undefined;
    }
  }

  /**
   * 获取指定仓库的 EmbeddingService
   */
  public getServiceForRepository(repoPath: string): EmbeddingService | undefined {
    return this._repositoryServices.get(repoPath)?.embeddingService;
  }

  /**
   * 获取所有仓库的 EmbeddingService
   */
  public getAllServices(): Map<string, EmbeddingService> {
    const services = new Map<string, EmbeddingService>();
    for (const [path, state] of this._repositoryServices) {
      services.set(path, state.embeddingService);
    }
    return services;
  }

  /**
   * 重新初始化 EmbeddingService 实例
   * 当相关配置发生变化时调用
   */
  public async reinitialize(): Promise<EmbeddingService | undefined> {
    console.log("[EmbeddingServiceManager] Reinitializing EmbeddingService...");
    this._embeddingService = null;
    this._repositoryServices.clear();
    this._detectedRepositories = [];
    return this.initialize();
  }

  /**
   * 获取 EmbeddingService 实例（默认）
   * @returns EmbeddingService 实例，如果未初始化则抛出错误
   */
  public getEmbeddingService(): EmbeddingService {
    if (!this._embeddingService) {
      throw new Error(
        "EmbeddingService not initialized. Call initialize() first."
      );
    }
    return this._embeddingService;
  }
}
