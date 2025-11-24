import { createHash } from "crypto";
import * as path from "path";
import * as vscode from "vscode";
import {
  WORKSPACE_CONFIG_PATHS,
  WorkspaceConfigPath,
} from "@/config/workspace-config-schema";
import { stateManager } from "@/utils/state/state-manager";
import { getWorkspacePath } from "@/core/utils/path";
import { EMBEDDING_MODEL_PROFILES } from "@/core/indexing/embedding-model-profiles";
import { EmbeddingService } from "@/core/indexing/embedding-service";
import { VectorStore } from "@/core/indexing/vector-store";

/**
 * 管理 EmbeddingService 的单例实例
 * 确保在整个扩展中只有一个 EmbeddingService 实例
 */
export class EmbeddingServiceManager {
  private static _instance: EmbeddingServiceManager | null = null;
  private _embeddingService: EmbeddingService | null = null;

  /**
   * Helper to retrieve a value from the global state config object using a dot-notation path.
   */
  private getGlobalConfig(path: string): any {
    const config: any = stateManager.getGlobal("config") || {};
    const keys = path.split('.');
    let current = config;
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    return current;
  }

  private constructor() {
    // 私有构造函数，确保单例模式
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
   * 初始化 EmbeddingService 实例
   * 应该在扩展激活时调用一次
   */
  public initialize(): EmbeddingService | undefined {
    if (this._embeddingService) {
      console.warn("EmbeddingServiceManager is already initialized.");
      return this._embeddingService;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const projectRoot = workspaceFolders[0].uri.fsPath;
      const projectName = path.basename(projectRoot);

      // 从配置中获取 Qdrant URL 和集合名称
      const qdrantUrl =
        stateManager.getWorkspace<string>(
          WORKSPACE_CONFIG_PATHS.experimental.codeIndex
            .qdrantUrl as WorkspaceConfigPath
        ) || "http://localhost:6333";

      // Generate collection name from workspace path
      const workspacePath = getWorkspacePath();
      const hash = createHash("sha256").update(workspacePath).digest("hex");
      const qdrantCollectionName = `dish-${hash.substring(0, 16)}`;

      const embeddingProvider = this.getGlobalConfig(
        "experimental.codeIndex.embeddingProvider"
      ) as "openai" | "ollama" | "openai-compatible" || "openai"; // Default to openai

      console.log("[EmbeddingServiceManager] Embedding Provider:", embeddingProvider);

      let embeddingModel: string;
      let vectorSize: number;

      if (embeddingProvider === "openai-compatible") {
        embeddingModel = this.getGlobalConfig(
          "experimental.codeIndex.openaiCompatible.model"
        ) || "";
        vectorSize = this.getGlobalConfig(
          "experimental.codeIndex.openaiCompatible.modelDimensions"
        ) || 1536;
      } else {
        embeddingModel = this.getGlobalConfig(
          "experimental.codeIndex.embeddingModel"
        ) || "text-embedding-3-small"; // Default model for others

        console.log("[EmbeddingServiceManager] Embedding Model:", embeddingModel);

        const modelProfile =
          EMBEDDING_MODEL_PROFILES[embeddingProvider.toLowerCase()]?.[
          embeddingModel
          ];
        vectorSize = modelProfile?.dimension || 1536; // Default to 1536 if not found

        console.log("[EmbeddingServiceManager] Model Profile:", modelProfile);
        console.log("[EmbeddingServiceManager] Vector Size:", vectorSize);

        if (!modelProfile) {
          console.warn(
            `[EmbeddingServiceManager] Could not find embedding model profile for provider: ${embeddingProvider}, model: ${embeddingModel}. Falling back to default vector size: 1536.`
          );
        }
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
   * 重新初始化 EmbeddingService 实例
   * 当相关配置（如 Qdrant URL）发生变化时调用
   */
  public reinitialize(): EmbeddingService | undefined {
    console.log("[EmbeddingServiceManager] Reinitializing EmbeddingService...");
    this._embeddingService = null; // 清除旧实例
    return this.initialize();
  }

  /**
   * 获取 EmbeddingService 实例
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
