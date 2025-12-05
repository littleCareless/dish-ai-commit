import { ConfigurationService } from "@/config/services/configuration-service";
import { ConfigKey } from "@/config/types";
import { CodeIndexer } from "@/core/indexing/code-indexer";
import { FileNode, FileScanner } from "@/core/indexing/file-scanner";
import { QdrantPoint, VectorStore } from "@/core/indexing/vector-store";
import {
  IndexingSettings
} from "@/services/settings/indexing-settings-manager";
import { formatMessage } from "@/utils/i18n/localization-manager";
import * as crypto from "crypto";
import OpenAI from "openai";
import * as path from "path";
import util from "util";
import { v5 as uuidv5 } from "uuid";
import * as vscode from "vscode";

const NAMESPACE = "5b4d94f6-fb6b-4a4e-b053-6d9c8f8e8c72"; // Fixed namespace for deterministic IDs

interface EmbeddingServiceErrorContext {
  source: "openai" | "ollama" | "qdrant" | "internal" | "openai-compatible";
  type: "network" | "timeout" | "api_error" | "invalid_response" | "unknown";
  model?: string;
  textPreview?: string;
  status?: number;
  responseBody?: string;
  rawResult?: any;
  originalError?: unknown;
}

export class EmbeddingServiceError extends Error {
  public context: EmbeddingServiceErrorContext;

  constructor(message: string, context: EmbeddingServiceErrorContext) {
    super(message);
    this.name = "EmbeddingServiceError";
    this.context = context;

    // 修复继承内建类的原型链（仅在某些旧环境中必要）
    Object.setPrototypeOf(this, EmbeddingServiceError.prototype);
  }
}

// Actual embedding generation logic using OpenAI
async function generateOpenAIEmbeddings(
  texts: string[],
  apiKey: string,
  baseUrl?: string,
  model: string = "text-embedding-3-small"
): Promise<number[][]> {
  if (!apiKey) {
    throw new EmbeddingServiceError(
      formatMessage("apiKey.missing", ["OpenAI"]),
      {
        source: "internal",
        type: "unknown",
      }
    );
  }
  const openai = new OpenAI({ apiKey, baseURL: baseUrl });

  try {
    const response = await openai.embeddings.create({
      model: model,
      input: texts,
    });

    if (!response.data || response.data.length === 0) {
      throw new EmbeddingServiceError(
        formatMessage("embedding.openai.noEmbeddings"),
        {
          source: "openai",
          type: "invalid_response",
          model,
          rawResult: response,
        }
      );
    }

    return response.data.map((embedding) => embedding.embedding);
  } catch (error) {
    console.error(
      "[EmbeddingService] Error generating OpenAI embeddings:",
      error
    );

    if (error instanceof OpenAI.APIError) {
      throw new EmbeddingServiceError(error.message, {
        source: "openai",
        type: "api_error",
        status: error.status,
        responseBody: JSON.stringify(error.error),
        model,
        originalError: error,
      });
    }

    throw new EmbeddingServiceError(
      error instanceof Error
        ? error.message
        : formatMessage("embedding.openai.unknownError"),
      {
        source: "openai",
        type: "unknown",
        model,
        originalError: error,
      }
    );
  }
}
// Actual embedding generation logic using Ollama
async function generateOllamaEmbeddings(
  texts: string[],
  baseUrl: string = "http://localhost:11434", // Default Ollama API URL
  model: string = "nomic-embed-text"
): Promise<number[][]> {
  if (!baseUrl) {
    throw new EmbeddingServiceError(formatMessage("ollama.baseUrl.missing"), {
      source: "internal",
      type: "unknown",
    });
  }

  // Normalize baseUrl: remove trailing slash to avoid double slashes
  const normalizedBaseUrl = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;

  const embeddings: number[][] = [];
  for (const text of texts) {
    try {
      // Assuming 'fetch' is available in the environment (e.g., Node.js 18+ or with a polyfill)
      const response = await fetch(`${normalizedBaseUrl}/api/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          `[EmbeddingService] Ollama API request failed with status ${response.status}: ${errorBody}`
        );
        throw new EmbeddingServiceError(
          formatMessage("embedding.ollama.requestFailed", [response.status]),
          {
            source: "ollama",
            type: "api_error",
            status: response.status,
            responseBody: errorBody,
            model,
            textPreview: text.substring(0, 100),
          }
        );
      }

      const result = await response.json();
      if (result.embedding && Array.isArray(result.embedding)) {
        embeddings.push(result.embedding);
      } else {
        console.error(
          "[EmbeddingService] Invalid embedding format received from Ollama API:",
          result
        );
        throw new EmbeddingServiceError(
          formatMessage("embedding.ollama.invalidFormat"),
          {
            source: "ollama",
            type: "invalid_response",
            model,
            rawResult: result,
            textPreview: text.substring(0, 100),
          }
        );
      }
    } catch (error: unknown) {
      if (error instanceof EmbeddingServiceError) {
        throw error; // Re-throw if it's already our custom error
      }

      const message = error instanceof Error ? error.message : String(error);
      // Basic network error detection
      const type =
        message.includes("fetch failed") || message.includes("ECONNREFUSED")
          ? "network"
          : "unknown";

      console.error(
        `[EmbeddingService] Error generating Ollama embeddings for text chunk: ${message}`
      );
      throw new EmbeddingServiceError(message, {
        source: "ollama",
        type,
        model,
        textPreview: text.substring(0, 100),
        originalError: error,
      });
    }
  }
  return embeddings;
}

export class EmbeddingService {
  private codeIndexer: CodeIndexer;
  private vectorStore: VectorStore;
  private fileScanner: FileScanner;
  public readonly projectName: string;
  private projectRoot: string;
  private openaiApiKey: string;
  private openaiBaseUrl?: string;
  private ollamaBaseUrl?: string;
  private openaiCompatibleBaseUrl?: string;
  private openaiCompatibleApiKey?: string;
  private openaiCompatibleModel?: string;
  private processedBlocks: number = 0;
  private configManager: ConfigurationService;

  constructor(
    vectorStore: VectorStore,
    projectName: string,
    projectRoot: string
  ) {
    // 从 IndexingSettingsManager 获取 OpenAI Compatible 设置
    const indexingSettings = this.getIndexingSettings();

    // 使用配置的 minBlockChars 初始化 CodeIndexer
    const minBlockChars = indexingSettings?.minBlockChars;
    this.codeIndexer = new CodeIndexer({ minBlockChars });

    this.vectorStore = vectorStore;
    this.projectName = projectName;
    this.projectRoot = projectRoot;
    this.fileScanner = new FileScanner(this.projectRoot);
    this.configManager = new ConfigurationService();

    // 从 ConfigurationService 获取 OpenAI API Key
    this.openaiApiKey = this.configManager.getConfig(
      "PROVIDERS_OPENAI_APIKEY" as ConfigKey
    );

    // 从 ConfigurationService 获取 OpenAI Base URL
    this.openaiBaseUrl =
      this.configManager.getConfig("PROVIDERS_OPENAI_BASEURL" as ConfigKey) ||
      undefined;

    // 从 ConfigurationService 获取 Ollama Base URL
    this.ollamaBaseUrl =
      this.configManager.getConfig("PROVIDERS_OLLAMA_BASEURL" as ConfigKey) ||
      undefined;

    const openaiCompatibleSettings =
      indexingSettings?.providers?.["openai-compatible"];
    this.openaiCompatibleBaseUrl = openaiCompatibleSettings?.baseUrl;
    this.openaiCompatibleApiKey = openaiCompatibleSettings?.apiKey;
    this.openaiCompatibleModel = openaiCompatibleSettings?.model;

    // Debug: Log loaded configuration
    console.log("[EmbeddingService] Configuration loaded:");
    console.log(
      "  OpenAI API Key:",
      this.openaiApiKey ? "***SET***" : "NOT SET"
    );
    console.log("  OpenAI Base URL:", this.openaiBaseUrl || "NOT SET");
    console.log("  Ollama Base URL:", this.ollamaBaseUrl || "NOT SET");
    console.log(
      "  OpenAI Compatible Base URL:",
      this.openaiCompatibleBaseUrl || "NOT SET"
    );
    console.log(
      "  OpenAI Compatible API Key:",
      this.openaiCompatibleApiKey ? "***SET***" : "NOT SET"
    );
    console.log(
      "  OpenAI Compatible Model:",
      this.openaiCompatibleModel || "NOT SET"
    );
    console.log(
      "  Min Block Chars:",
      minBlockChars || "DEFAULT (100)"
    );
  }

  /**
   * 获取索引设置
   * 注意：此方法尝试通过 EmbeddingServiceManager 获取设置
   * 如果 EmbeddingServiceManager 尚未设置 IndexingSettingsManager，则返回 null
   */
  private getIndexingSettings(): IndexingSettings | null {
    try {
      // 优先使用 EmbeddingServiceManager 获取设置，避免创建未初始化的 IndexingSettingsManager 实例
      const { EmbeddingServiceManager } = require("@/core/indexing/embedding-service-manager");
      const settings = EmbeddingServiceManager.getInstance().getSettings();
      if (settings) {
        return settings;
      }
      return null;
    } catch {
      return null;
    }
  }

  public async scanProjectFiles(
    startIndex: number,
    webview: vscode.Webview
  ): Promise<FileNode | null> {
    console.log(
      `[EmbeddingService] Starting project file scan for ${this.projectName}`
    );

    // Track indexing statistics
    const stats = {
      total: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      failedFiles: [] as Array<{ path: string; error: string }>,
    };

    // Reset counters for a new scan
    this.processedBlocks = 0;
    this.totalSemanticBlocks = 0;

    try {
      const fileTree = await this.fileScanner.scanProject();
      if (fileTree) {
        // Calculate total semantic blocks before indexing
        const totalSemanticBlocks =
          await this.calculateTotalSemanticBlocks(fileTree);
        this.totalSemanticBlocks = totalSemanticBlocks;
        console.log(
          `[EmbeddingService] Total semantic blocks in project: ${this.projectName}: ${totalSemanticBlocks}`
        );

        // Index files recursively starting from startIndex
        if (fileTree) {
          await this._indexFileNodeRecursive(fileTree, webview, stats);
        }

        console.log(
          `[EmbeddingService] Project file scan completed for ${this.projectName}`
        );

        // Send final summary with failed files
        if (stats.failed > 0) {
          webview.postMessage({
            command: "indexingFinished",
            data: {
              isIndexed: await this.isIndexed(),
              stats,
              warning: `索引完成，但有 ${stats.failed} 个文件失败`,
            },
          });
        } else {
          webview.postMessage({
            command: "indexingFinished",
            data: {
              isIndexed: await this.isIndexed(),
              stats,
            },
          });
        }
      } else {
        console.log(
          "[EmbeddingService] Project scan did not return a file tree."
        );
      }

      return fileTree;
    } catch (error) {
      console.error(`[EmbeddingService] Error scanning project files:`, error);
      throw error;
    }
  }

  private totalSemanticBlocks: number = 0;

  private async calculateTotalSemanticBlocks(node: FileNode): Promise<number> {
    let count = 0;

    async function traverse(
      this: EmbeddingService,
      node: FileNode
    ): Promise<void> {
      if (node.type === "file") {
        const absoluteFilePath = path.join(this.projectRoot, node.path);
        try {
          if (
            node.size &&
            node.size > 0 &&
            (node.fileType === "code" ||
              node.fileType === "document" ||
              node.language)
          ) {
            // Check if file is already indexed
            const fs = await import("fs/promises");
            const fileStats = await fs.stat(absoluteFilePath);
            const lastModified = fileStats.mtime.getTime();
            const isIndexed = await this.vectorStore.checkFileIndexed(
              node.path,
              this.projectName,
              lastModified
            );

            if (!isIndexed) {
              const fileContent = await fs.readFile(absoluteFilePath, "utf-8");
              const semanticBlocks = await this.codeIndexer.parseFile(
                node.path,
                {
                  content: fileContent,
                }
              );
              count += semanticBlocks.length;
            }
          }
        } catch (error) {
          console.error(
            `[EmbeddingService] Error reading or indexing file ${absoluteFilePath}:`,
            error
          );
        }
      } else if (node.type === "directory" && node.children) {
        for (const child of node.children) {
          await traverse.call(this, child); // Maintain correct 'this' context
        }
      }
    }

    await traverse.call(this, node); // Start traversal with correct 'this' context
    return count;
  }

  private async _indexFileNodeRecursive(
    node: FileNode,
    webview: vscode.Webview,
    stats: {
      total: number;
      succeeded: number;
      failed: number;
      skipped: number;
      failedFiles: Array<{ path: string; error: string }>;
    }
  ): Promise<void> {
    if (node.type === "file") {
      // Construct absolute file path to read the file
      const absoluteFilePath = path.join(this.projectRoot, node.path);
      try {
        // Check if file is not empty and is of a type we want to index
        if (
          node.size &&
          node.size > 0 &&
          (node.fileType === "code" ||
            node.fileType === "document" ||
            node.language)
        ) {
          stats.total++;

          // Check if file is already indexed (resumability)
          const fs = await import("fs/promises");
          const fileStats = await fs.stat(absoluteFilePath);
          const lastModified = fileStats.mtime.getTime();

          const isIndexed = await this.vectorStore.checkFileIndexed(
            node.path,
            this.projectName,
            lastModified
          );

          if (isIndexed) {
            stats.skipped++;
            console.log(
              `[EmbeddingService] Skipping already indexed file: ${node.path}`
            );
            webview.postMessage({
              command: "indexingProgress",
              data: {
                message: `Skipping ${node.path} (already indexed)`,
                current: this.processedBlocks,
                total: this.totalSemanticBlocks,
              },
            });
            return;
          }

          console.log(
            `[EmbeddingService] Reading file for indexing: ${absoluteFilePath}`
          );
          const fileContent = await fs.readFile(absoluteFilePath, "utf-8");
          await this.indexFile(node.path, fileContent, webview);
          stats.succeeded++;
        } else {
          stats.skipped++;
          console.log(
            `[EmbeddingService] Skipping file (empty, unsupported type, or no language): ${node.path}`
          );
        }
      } catch (error) {
        stats.failed++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        stats.failedFiles.push({
          path: node.path,
          error: errorMessage,
        });
        console.error(
          `[EmbeddingService] Error indexing file ${absoluteFilePath}:`,
          error
        );
        // Continue with next file instead of throwing
        console.log(`[EmbeddingService] Continuing with next file...`);
      }
    } else if (node.type === "directory" && node.children) {
      for (const child of node.children) {
        await this._indexFileNodeRecursive(child, webview, stats);
      }
    }
  }

  public async indexFile(
    filePath: string,
    fileContent: string,
    webview: vscode.Webview
  ): Promise<void> {
    console.log(
      `[EmbeddingService] Starting indexing for file: ${filePath} in project ${this.projectName}`
    );
    try {
      // 1. Extract semantic blocks
      const semanticBlocks = await this.codeIndexer.parseFile(filePath, {
        content: fileContent,
      });
      if (semanticBlocks.length === 0) {
        console.log(
          `[EmbeddingService] No semantic blocks extracted from ${filePath}. Skipping embedding and storage.`
        );
        return;
      }
      console.log(
        `[EmbeddingService] Extracted ${semanticBlocks.length} semantic blocks from ${filePath}.`
      );

      // Get file stats for lastModified
      const fs = await import("fs/promises");
      const path = await import("path");
      const absolutePath = path.join(this.projectRoot, filePath);
      const fileStats = await fs.stat(absolutePath);
      const lastModified = fileStats.mtime.getTime();
      const totalBlocks = semanticBlocks.length;
      // 2. Generate embeddings
      const textsToEmbed = semanticBlocks.map((block) => {
        // Construct a meaningful string from the block for embedding
        // Example: combine name, signature, and documentation
        return `${block.name}\n${block.signature || ""}\n${block.doc || ""
          }\n${block.code.substring(0, 500)}`; // Truncate code for embedding
      });

      const indexingSettings = this.getIndexingSettings();
      const embeddingProvider = (indexingSettings?.provider || "openai") as
        | "openai"
        | "ollama"
        | "openai-compatible";

      console.log(
        "[EmbeddingService] getEmbeddings - embeddingProvider:",
        embeddingProvider
      );

      let embeddings: number[][];
      let embeddingModelName: string;
      if (embeddingProvider === "ollama") {
        embeddingModelName =
          indexingSettings?.embeddingModel || "nomic-embed-text";
        embeddings = await generateOllamaEmbeddings(
          textsToEmbed,
          this.ollamaBaseUrl,
          embeddingModelName
        );
      } else if (embeddingProvider === "openai-compatible") {
        if (!this.openaiCompatibleApiKey || !this.openaiCompatibleModel) {
          console.error(
            `[EmbeddingService] OpenAI Compatible API Key or Model is not configured. Skipping embedding generation.`
          );
          throw new Error(
            formatMessage("embedding.provider.apiKey.notConfigured", [
              "OpenAI Compatible",
            ])
          );
        }
        embeddingModelName = this.openaiCompatibleModel;
        embeddings = await generateOpenAIEmbeddings(
          textsToEmbed,
          this.openaiCompatibleApiKey,
          this.openaiCompatibleBaseUrl,
          embeddingModelName
        );
      } else {
        // Default to OpenAI
        embeddingModelName =
          indexingSettings?.embeddingModel || "text-embedding-3-small";
        if (!this.openaiApiKey) {
          console.error(
            `[EmbeddingService] OpenAI API Key is not configured. Skipping embedding generation.`
          );
          throw new Error(
            formatMessage("embedding.provider.apiKey.notConfigured", ["OpenAI"])
          );
        }
        embeddings = await generateOpenAIEmbeddings(
          textsToEmbed,
          this.openaiApiKey,
          this.openaiBaseUrl,
          embeddingModelName
        );
      }

      console.log(
        `[EmbeddingService] Generated ${embeddings.length} embeddings using ${embeddingModelName}.`
      );
      // 3. Prepare points for VectorStore
      const points: QdrantPoint[] = semanticBlocks.map((block, index) => {
        // Use a hash of the block's content for a stable, deterministic ID
        const blockHash = crypto
          .createHash("sha256")
          .update(block.code)
          .digest("hex");
        const chunkSeed = `${this.projectName}:${filePath}:${blockHash}`;
        const chunkId = uuidv5(chunkSeed, NAMESPACE);
        this.processedBlocks++;
        webview.postMessage({
          command: "indexingProgress",
          data: {
            message: `${filePath}`,
            current: this.processedBlocks,
            total: this.totalSemanticBlocks,
          },
        });
        return {
          id: chunkId,
          vector: embeddings[index],
          payload: {
            type: block.type,
            name: block.name,
            file: filePath,
            startLine: block.startLine,
            endLine: block.endLine,
            signature: block.signature,
            doc: block.doc,
            code: block.code, // Consider if full code is too large for payload
            modulePath: block.modulePath,
            chunk_id: chunkId,
            project: this.projectName,
            lastModified: lastModified, // Add lastModified for resumability
          },
        };
      });

      // 4. Upsert points to VectorStore
      try {
        await this.vectorStore.upsertPoints(points);
      } catch (dbError) {
        console.error(
          `[EmbeddingService] Error upserting points to vector store for file ${filePath}:`,
          dbError
        );

        console.error(
          `[EmbeddingService] Error upserting points:`,
          util.inspect(dbError, { depth: 10, colors: true })
        );
        throw new EmbeddingServiceError(
          dbError instanceof Error
            ? dbError.message
            : formatMessage("embedding.save.failed"),
          {
            source: "qdrant",
            type: "api_error", // Assuming any error from the store is an API error
            originalError: dbError,
          }
        );
      }
      console.log(
        `[EmbeddingService] Successfully indexed ${points.length} blocks from ${filePath} into vector store.`
      );
      webview.postMessage({
        command: "indexingProgress",
        data: {
          message: formatMessage("embedding.file.indexingComplete", [filePath]),
          current: this.processedBlocks,
          total: this.totalSemanticBlocks,
        },
      });
    } catch (error) {
      console.error(
        `[EmbeddingService] Error indexing file ${filePath}:`,
        error
      );

      if (!(error instanceof EmbeddingServiceError)) {
        throw new EmbeddingServiceError(
          error instanceof Error
            ? error.message
            : formatMessage("embedding.indexing.unknownError"),
          {
            source: "internal",
            type: "unknown",
            originalError: error,
          }
        );
      }
      // Decide on error handling: re-throw, log, or specific recovery
      throw error;
    }
  }

  public async deleteFileIndex(filePath: string): Promise<void> {
    console.log(
      `[EmbeddingService] Deleting index entries for file: ${filePath} in project ${this.projectName}`
    );
    try {
      await this.vectorStore.deletePointsByFile(filePath, this.projectName);
      console.log(
        `[EmbeddingService] Successfully processed deletion for file index: ${filePath}`
      );
    } catch (error) {
      console.error(
        `[EmbeddingService] Error deleting file index for ${filePath}:`,
        error
      );
      throw new EmbeddingServiceError(
        error instanceof Error
          ? error.message
          : formatMessage("embedding.delete.failed"),
        {
          source: "qdrant",
          type: "api_error",
          originalError: error,
        }
      );
    }
  }

  public async clearIndex(): Promise<void> {
    console.log(
      `[EmbeddingService] Clearing all index entries for project ${this.projectName}`
    );
    try {
      await this.vectorStore.deleteAllPoints();
      this.processedBlocks = 0; // Reset counter
      console.log(
        `[EmbeddingService] Successfully cleared all index entries for project ${this.projectName}`
      );
    } catch (error) {
      console.error(
        `[EmbeddingService] Error clearing index for project ${this.projectName}:`,
        error
      );
      throw new EmbeddingServiceError(
        error instanceof Error
          ? error.message
          : formatMessage("embedding.clear.failed"),
        {
          source: "qdrant",
          type: "api_error",
          originalError: error,
        }
      );
    }
  }

  // Placeholder for semantic search functionality
  public async searchSimilarCode(
    queryText: string,
    limit: number = 5
  ): Promise<any[]> {
    const indexingSettings = this.getIndexingSettings();
    const embeddingProvider = (indexingSettings?.provider || "openai") as
      | "openai"
      | "ollama"
      | "openai-compatible";

    console.log(
      `[EmbeddingService] Searching for code similar to: "${queryText}"`
    );

    let queryEmbeddings: number[][];
    if (embeddingProvider === "ollama") {
      if (!this.ollamaBaseUrl) {
        console.log(
          formatMessage("embedding.ollama.baseUrl.missing.forSearch")
        );
        return [];
      }
      const embeddingModelName =
        indexingSettings?.embeddingModel || "nomic-embed-text";
      queryEmbeddings = await generateOllamaEmbeddings(
        [queryText],
        this.ollamaBaseUrl,
        embeddingModelName
      );
    } else if (embeddingProvider === "openai-compatible") {
      if (!this.openaiCompatibleApiKey || !this.openaiCompatibleModel) {
        console.log(formatMessage("apiKey.missing", ["OpenAI Compatible"]));
        return [];
      }
      queryEmbeddings = await generateOpenAIEmbeddings(
        [queryText],
        this.openaiCompatibleApiKey,
        this.openaiCompatibleBaseUrl,
        this.openaiCompatibleModel
      );
    } else {
      // Default to OpenAI
      if (!this.openaiApiKey) {
        console.log(formatMessage("apiKey.missing", ["OpenAI"]));
        return [];
      }
      const embeddingModelName =
        indexingSettings?.embeddingModel || "text-embedding-3-small";
      queryEmbeddings = await generateOpenAIEmbeddings(
        [queryText],
        this.openaiApiKey,
        this.openaiBaseUrl,
        embeddingModelName
      );
    }

    if (!queryEmbeddings || queryEmbeddings.length === 0) {
      console.error("[EmbeddingService] Failed to generate query embedding.");
      throw new Error(formatMessage("embedding.query.failed"));
    }
    const queryEmbedding = queryEmbeddings[0];
    console.log(
      `[EmbeddingService] Query embedding generated for "${queryText}".`
    );

    // 2. Search in VectorStore
    try {
      // Optionally, add a filter to search only within the current project
      const filter = {
        must: [{ key: "project", match: { value: this.projectName } }],
      };
      const results = await this.vectorStore.search(
        queryEmbedding,
        limit,
        filter
      );
      console.log(
        `[EmbeddingService] Found ${results.length} similar code blocks.`
      );
      // TODO: Process/format results as needed for the AI commit message generator
      return results;
    } catch (error) {
      console.error(
        `[EmbeddingService] Error during semantic search for "${queryText}":`,
        error
      );
      throw new EmbeddingServiceError(
        error instanceof Error
          ? error.message
          : formatMessage("embedding.search.failed"),
        {
          source: "qdrant",
          type: "api_error",
          originalError: error,
        }
      );
    }
  }

  public async isIndexed(): Promise<number> {
    try {
      // 尝试从 VectorStore 中获取一些向量
      const results = await this.vectorStore.hasVectors(); // 使用一个虚拟向量进行搜索
      if (typeof results !== "number" || results < 0) {
        console.error(
          "[EmbeddingService] Failed to check index status or invalid response:",
          results
        );
        throw new Error(formatMessage("embedding.vectorStore.connectFailed"));
      }
      return results; // 如果找到任何向量，则表示已建立索引
    } catch (error) {
      console.error("[EmbeddingService] Error checking index status:", error);
      const isFetchError =
        error instanceof TypeError && error.message === "fetch failed";

      const qdUrl = this.vectorStore.getQdrantUrl();

      throw new EmbeddingServiceError(
        isFetchError
          ? formatMessage("embedding.qdrant.connectFailed", [
            qdUrl,
            error.message,
          ])
          : error instanceof Error
            ? error.message
            : formatMessage("embedding.vectorStore.statusCheck.unknownError"),
        {
          source: "qdrant",
          type: "api_error",
          originalError: error,
        }
      );
    }
  }

  public async getIndexingStats(): Promise<{
    totalVectors: number;
    indexedFiles: string[];
  }> {
    try {
      const totalVectors = await this.vectorStore.hasVectors();
      const indexedFiles = await this.vectorStore.getIndexedFiles(
        this.projectName
      );
      return {
        totalVectors,
        indexedFiles,
      };
    } catch (error) {
      console.error(
        "[EmbeddingService] Error getting indexing stats:",
        error
      );
      return {
        totalVectors: 0,
        indexedFiles: [],
      };
    }
  }
}
