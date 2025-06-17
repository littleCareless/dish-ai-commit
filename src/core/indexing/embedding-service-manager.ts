import * as vscode from "vscode";
import * as path from "path";
import { EmbeddingService } from "./embedding-service";
import { stateManager } from "../../utils/state/state-manager";
import { VectorStore } from "./vector-store";
import { QDRANT_URL_KEY, QDRANT_COLLECTION_NAME_KEY } from "./constants";

/**
 * 管理 EmbeddingService 的单例实例
 * 确保在整个扩展中只有一个 EmbeddingService 实例
 */
export class EmbeddingServiceManager {
  private static instance: EmbeddingServiceManager;
  private _embeddingService: EmbeddingService | undefined;

  private constructor() {
    // 私有构造函数，确保单例模式
  }

  /**
   * 获取 EmbeddingServiceManager 的单例实例
   * @returns EmbeddingServiceManager 单例实例
   */
  public static getInstance(): EmbeddingServiceManager {
    if (!EmbeddingServiceManager.instance) {
      EmbeddingServiceManager.instance = new EmbeddingServiceManager();
    }
    return EmbeddingServiceManager.instance;
  }

  /**
   * 初始化 EmbeddingService 实例
   * 应该在扩展激活时调用一次
   */
  public initialize(): void {
    if (this._embeddingService) {
      console.warn("EmbeddingServiceManager is already initialized.");
      return;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const projectRoot = workspaceFolders[0].uri.fsPath;
      const projectName = path.basename(projectRoot);

      // 从配置中获取 Qdrant URL 和集合名称
      const qdrantUrl = stateManager.getWorkspace<string>(QDRANT_URL_KEY, "http://localhost:6333");
      const qdrantCollectionName = stateManager.getWorkspace<string>(
        QDRANT_COLLECTION_NAME_KEY,
        `code_semantic_blocks_${projectName}`
      );

      const vectorStore = new VectorStore(
        qdrantUrl,
        qdrantCollectionName
      );
      
      this._embeddingService = new EmbeddingService(
        vectorStore,
        projectName,
        projectRoot
      );

      console.log(`[EmbeddingServiceManager] Initialized EmbeddingService for project: ${projectName}`);
    } else {
      console.warn(
        "[EmbeddingServiceManager] No workspace folder found. EmbeddingService will not be initialized."
      );
    }
  }

  /**
   * 获取 EmbeddingService 实例
   * @returns EmbeddingService 实例，如果未初始化则抛出错误
   */
  public getEmbeddingService(): EmbeddingService {
    if (!this._embeddingService) {
      throw new Error("EmbeddingService not initialized. Call initialize() first.");
    }
    return this._embeddingService;
  }
}