import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";
import { CodeIndexer, SemanticBlock } from "./code-indexer";
import { VectorStore, QdrantPoint } from "./vector-store";
import { FileScanner, FileNode } from "./file-scanner";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";
import { ConfigurationManager } from "../../config/configuration-manager";
import { ConfigKey } from "../../config/types"; // Assuming ConfigKey is exported from types
import { stateManager } from "../../utils/state/state-manager";
import { WorkspaceConfigPath } from "../../config/workspace-config-schema";

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
    throw new EmbeddingServiceError("OpenAI API key is not configured.", {
      source: "internal",
      type: "unknown",
    });
  }
  const openai = new OpenAI({ apiKey, baseURL: baseUrl });

  try {
    const response = await openai.embeddings.create({
      model: model,
      input: texts,
    });

    if (!response.data || response.data.length === 0) {
      throw new EmbeddingServiceError("OpenAI API returned no embeddings.", {
        source: "openai",
        type: "invalid_response",
        model,
        rawResult: response,
      });
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
        : "An unknown error occurred with OpenAI",
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
    throw new EmbeddingServiceError("Ollama API base URL is not configured.", {
      source: "internal",
      type: "unknown",
    });
  }

  const embeddings: number[][] = [];
  for (const text of texts) {
    try {
      // Assuming 'fetch' is available in the environment (e.g., Node.js 18+ or with a polyfill)
      const response = await fetch(`${baseUrl}/api/embeddings`, {
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
          `Ollama API request failed with status ${response.status}`,
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
          "Invalid embedding format received from Ollama API.",
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
  private fileScanner: FileScanner; // Added FileScanner instance
  private projectName: string;
  private projectRoot: string;
  private openaiApiKey: string;
  private openaiBaseUrl?: string;
  private ollamaBaseUrl?: string;
  private processedBlocks: number = 0;

  constructor(
    vectorStore: VectorStore,
    projectName: string,
    projectRoot: string
  ) {
    this.codeIndexer = new CodeIndexer();
    this.vectorStore = vectorStore;
    this.projectName = projectName;
    this.projectRoot = projectRoot;
    this.fileScanner = new FileScanner(this.projectRoot);

    const configManager = ConfigurationManager.getInstance();
    // Explicitly type cast the config keys
    this.openaiApiKey = configManager.getConfig(
      "PROVIDERS_OPENAI_APIKEY" as ConfigKey
    );
    this.openaiBaseUrl =
      configManager.getConfig("PROVIDERS_OPENAI_BASEURL" as ConfigKey) ||
      undefined;

    this.ollamaBaseUrl =
      configManager.getConfig("PROVIDERS_OLLAMA_BASEURL" as ConfigKey) ||
      undefined;
  }

  public async scanProjectFiles(
    startIndex: number,
    webview: vscode.Webview
  ): Promise<FileNode | null> {
    console.log(
      `[EmbeddingService] Starting file scan for project: ${this.projectName} at root: ${this.projectRoot} from startIndex: ${startIndex}`
    );
    try {
      const fileTree = await this.fileScanner.scanProject();
      if (fileTree) {
        console.log(
          `[EmbeddingService] Successfully scanned project. Root node: ${
            fileTree.name
          }, Children: ${fileTree.children?.length || 0}`
        );
        // Start indexing all files within the scanned project
        console.log(
          `[EmbeddingService] Starting indexing for all files in project: ${this.projectName}`
        );
        // Calculate total semantic blocks before indexing
        const totalSemanticBlocks = await this.calculateTotalSemanticBlocks(
          fileTree
        );
        this.totalSemanticBlocks = totalSemanticBlocks;
        console.log(
          `[EmbeddingService] Total semantic blocks in project: ${this.projectName}: ${totalSemanticBlocks}`
        );

        await this._indexFileNodeRecursive(fileTree, webview);
        console.log(
          `[EmbeddingService] Finished indexing all files in project: ${this.projectName}`
        );
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
            const fileContent = await fs.readFile(absoluteFilePath, "utf-8");
            const semanticBlocks = await this.codeIndexer.parseFile(node.path, {
              content: fileContent,
            });
            count += semanticBlocks.length;
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
    webview: vscode.Webview
  ): Promise<void> {
    if (node.type === "file") {
      // Construct absolute file path to read the file
      const absoluteFilePath = path.join(this.projectRoot, node.path);
      try {
        // Check if file is not empty and is of a type we want to index (e.g., 'code', 'document')
        // This check can be more sophisticated based on FileNode properties like 'language' or 'fileType'
        if (
          node.size &&
          node.size > 0 &&
          (node.fileType === "code" ||
            node.fileType === "document" ||
            node.language)
        ) {
          console.log(
            `[EmbeddingService] Reading file for indexing: ${absoluteFilePath}`
          );
          const fileContent = await fs.readFile(absoluteFilePath, "utf-8");
          await this.indexFile(node.path, fileContent, webview); // node.path is relative
        } else {
          console.log(
            `[EmbeddingService] Skipping file (empty, unsupported type, or no language): ${node.path}`
          );
        }
      } catch (error) {
        console.error(
          `[EmbeddingService] Error reading or indexing file ${absoluteFilePath}:`,
          error
        );
        // Optionally, decide if one error should stop the whole process or just skip the file
        throw error;
      }
    } else if (node.type === "directory" && node.children) {
      for (const child of node.children) {
        await this._indexFileNodeRecursive(child, webview);
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
      const totalBlocks = semanticBlocks.length;
      // 2. Generate embeddings
      const textsToEmbed = semanticBlocks.map((block) => {
        // Construct a meaningful string from the block for embedding
        // Example: combine name, signature, and documentation
        return `${block.name}\n${block.signature || ""}\n${
          block.doc || ""
        }\n${block.code.substring(0, 500)}`; // Truncate code for embedding
      });

      const embeddingProvider = stateManager.getWorkspace<
        "OpenAI" | "Ollama" | "openai-compatible"
      >(
        "experimental.codeIndex.embeddingProvider" as WorkspaceConfigPath,
        "OpenAI"
      );
      const embeddingModelName = stateManager.getWorkspace(
        "experimental.codeIndex.embeddingModel" as WorkspaceConfigPath,
        "text-embedding-3-small"
      );

      let embeddings: number[][];
      if (embeddingProvider === "Ollama") {
        embeddings = await generateOllamaEmbeddings(
          textsToEmbed,
          this.ollamaBaseUrl,
          embeddingModelName
        );
      } else {
        // Handles both "OpenAI" and "openai-compatible"
        if (!this.openaiApiKey) {
          console.error(
            `[EmbeddingService] ${embeddingProvider} API Key is not configured. Skipping embedding generation.`
          );
          throw new Error(`${embeddingProvider} API Key not configured.`);
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
        const chunkId = uuidv4(); // Unique ID for this specific code chunk
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
            file: block.file,
            startLine: block.startLine,
            endLine: block.endLine,
            signature: block.signature,
            doc: block.doc,
            code: block.code, // Consider if full code is too large for payload
            modulePath: block.modulePath,
            chunk_id: chunkId,
            project: this.projectName,
          },
        };
      });

      // 4. Upsert points to VectorStore
      // 4. Upsert points to VectorStore
      try {
        await this.vectorStore.upsertPoints(points);
      } catch (dbError) {
        console.error(
          `[EmbeddingService] Error upserting points to vector store for file ${filePath}:`,
          dbError
        );
        throw new EmbeddingServiceError(
          dbError instanceof Error
            ? dbError.message
            : "Failed to save embeddings to vector store.",
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
          message: `文件 ${filePath} 索引完成!`,
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
            : "An unknown error occurred during indexing.",
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
          : "Failed to delete index from vector store.",
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
    const embeddingProvider = stateManager.getWorkspace<
      "OpenAI" | "Ollama" | "openai-compatible"
    >(
      "experimental.codeIndex.embeddingProvider" as WorkspaceConfigPath,
      "OpenAI"
    );

    if (embeddingProvider === "Ollama") {
      if (!this.ollamaBaseUrl) {
        console.log(
          "[EmbeddingService] Ollama base URL is not configured. Skipping search."
        );
        return [];
      }
    } else {
      // Handles both "OpenAI" and "openai-compatible"
      if (!this.openaiApiKey) {
        console.log(
          `[EmbeddingService] ${embeddingProvider} API key is not configured. Skipping search.`
        );
        return [];
      }
    }

    console.log(
      `[EmbeddingService] Searching for code similar to: "${queryText}"`
    );

    const embeddingModelName = stateManager.getWorkspace(
      "experimental.codeIndex.embeddingModel" as WorkspaceConfigPath,
      "text-embedding-3-small"
    );

    let queryEmbeddings: number[][];
    if (embeddingProvider === "Ollama") {
      queryEmbeddings = await generateOllamaEmbeddings(
        [queryText],
        this.ollamaBaseUrl,
        embeddingModelName
      );
    } else {
      // Handles both "OpenAI" and "openai-compatible"
      queryEmbeddings = await generateOpenAIEmbeddings(
        [queryText],
        this.openaiApiKey,
        this.openaiBaseUrl,
        embeddingModelName
      );
    }

    if (!queryEmbeddings || queryEmbeddings.length === 0) {
      console.error("[EmbeddingService] Failed to generate query embedding.");
      throw new Error("Failed to generate query embedding.");
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
          : "Failed to search in vector store.",
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
        throw new Error(
          "Failed to connect to vector store or invalid response."
        );
      }
      return results; // 如果找到任何向量，则表示已建立索引
    } catch (error) {
      console.error("[EmbeddingService] Error checking index status:", error);
      const isFetchError =
        error instanceof TypeError && error.message === "fetch failed";

      const qdUrl = this.vectorStore.getQdrantUrl();

      console.log("qdUrl", qdUrl);

      throw new EmbeddingServiceError(
        isFetchError
          ? `连接 Qdrant 向量数据库失败。请确认 Qdrant 服务正在运行，并确保可以通过 ${qdUrl} 访问。\n原始错误：${error.message}`
          : error instanceof Error
          ? error.message
          : "无法检查向量索引状态（未知错误）",
        {
          source: "qdrant",
          type: "api_error",
          originalError: error,
        }
      );
    }
  }
}
