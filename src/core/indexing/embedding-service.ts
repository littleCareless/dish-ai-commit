import * as fs from 'fs/promises';
import * as path from 'path';
import { CodeIndexer, SemanticBlock } from './code-indexer';
import { VectorStore, QdrantPoint } from './vector-store';
import { FileScanner, FileNode } from './file-scanner';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { ConfigurationManager } from '../../config/configuration-manager';
import { ConfigKey } from '../../config/types'; // Assuming ConfigKey is exported from types

// Actual embedding generation logic using OpenAI
async function generateOpenAIEmbeddings(
  texts: string[],
  apiKey: string,
  baseUrl?: string,
  model: string = "text-embedding-3-small"
): Promise<number[][]> {
  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }
  const openai = new OpenAI({ apiKey, baseURL: baseUrl });

  try {
    const response = await openai.embeddings.create({
      model: model,
      input: texts,
    });
    return response.data.map(embedding => embedding.embedding);
  } catch (error) {
    console.error("[EmbeddingService] Error generating OpenAI embeddings:", error);
    throw error;
  }
}

export class EmbeddingService {
  private codeIndexer: CodeIndexer;
  private vectorStore: VectorStore;
  private fileScanner: FileScanner; // Added FileScanner instance
  private projectName: string;
  private projectRoot: string;
  private openaiApiKey: string;
  private openaiBaseUrl?: string;
  private embeddingModelName: string;

  constructor(vectorStore: VectorStore, projectName: string, projectRoot: string) {
    this.codeIndexer = new CodeIndexer();
    this.vectorStore = vectorStore;
    this.projectName = projectName;
    this.projectRoot = projectRoot;
    this.fileScanner = new FileScanner(this.projectRoot);

    const configManager = ConfigurationManager.getInstance();
    // Explicitly type cast the config keys
    this.openaiApiKey = configManager.getConfig("PROVIDERS_OPENAI_APIKEY" as ConfigKey);
    this.openaiBaseUrl = configManager.getConfig("PROVIDERS_OPENAI_BASEURL" as ConfigKey) || undefined;
    // TODO: Make embedding model configurable, for now hardcoding to text-embedding-3-small
    this.embeddingModelName = "text-embedding-3-small";
    // Ensure VectorStore is initialized with the correct vector size for the chosen model
    // This might require passing the vector size to VectorStore constructor or an init method
    // For text-embedding-3-small, it's 1536.
  }

  public async scanProjectFiles(): Promise<FileNode | null> {
    console.log(`[EmbeddingService] Starting file scan for project: ${this.projectName} at root: ${this.projectRoot}`);
    try {
      const fileTree = await this.fileScanner.scanProject();
      if (fileTree) {
        console.log(`[EmbeddingService] Successfully scanned project. Root node: ${fileTree.name}, Children: ${fileTree.children?.length || 0}`);
        // Start indexing all files within the scanned project
        console.log(`[EmbeddingService] Starting indexing for all files in project: ${this.projectName}`);
        await this._indexFileNodeRecursive(fileTree);
        console.log(`[EmbeddingService] Finished indexing all files in project: ${this.projectName}`);
      } else {
        console.log('[EmbeddingService] Project scan did not return a file tree.');
      }
      return fileTree;
    } catch (error) {
      console.error(`[EmbeddingService] Error scanning project files:`, error);
      throw error;
    }
  }

  private async _indexFileNodeRecursive(node: FileNode): Promise<void> {
    if (node.type === 'file') {
      // Construct absolute file path to read the file
      const absoluteFilePath = path.join(this.projectRoot, node.path);
      try {
        // Check if file is not empty and is of a type we want to index (e.g., 'code', 'document')
        // This check can be more sophisticated based on FileNode properties like 'language' or 'fileType'
        if (node.size && node.size > 0 && (node.fileType === 'code' || node.fileType === 'document' || node.language)) {
          console.log(`[EmbeddingService] Reading file for indexing: ${absoluteFilePath}`);
          const fileContent = await fs.readFile(absoluteFilePath, 'utf-8');
          await this.indexFile(node.path, fileContent); // node.path is relative
        } else {
          console.log(`[EmbeddingService] Skipping file (empty, unsupported type, or no language): ${node.path}`);
        }
      } catch (error) {
        console.error(`[EmbeddingService] Error reading or indexing file ${absoluteFilePath}:`, error);
        // Optionally, decide if one error should stop the whole process or just skip the file
      }
    } else if (node.type === 'directory' && node.children) {
      for (const child of node.children) {
        await this._indexFileNodeRecursive(child);
      }
    }
  }

  public async indexFile(filePath: string, fileContent: string): Promise<void> {
    console.log(`[EmbeddingService] Starting indexing for file: ${filePath} in project ${this.projectName}`);
    try {
      // 1. Extract semantic blocks
      const semanticBlocks = await this.codeIndexer.parseFile(filePath, fileContent);
      if (semanticBlocks.length === 0) {
        console.log(`[EmbeddingService] No semantic blocks extracted from ${filePath}. Skipping embedding and storage.`);
        return;
      }
      console.log(`[EmbeddingService] Extracted ${semanticBlocks.length} semantic blocks from ${filePath}.`);

      // 2. Generate embeddings
      const textsToEmbed = semanticBlocks.map(block => {
        // Construct a meaningful string from the block for embedding
        // Example: combine name, signature, and documentation
        return `${block.name}\n${block.signature || ''}\n${block.doc || ''}\n${block.code.substring(0, 500)}`; // Truncate code for embedding
      });

      if (!this.openaiApiKey) {
        console.error("[EmbeddingService] OpenAI API Key is not configured. Skipping embedding generation.");
        throw new Error("OpenAI API Key not configured.");
      }

      const embeddings = await generateOpenAIEmbeddings(
        textsToEmbed,
        this.openaiApiKey,
        this.openaiBaseUrl,
        this.embeddingModelName
      );
      console.log(`[EmbeddingService] Generated ${embeddings.length} embeddings using ${this.embeddingModelName}.`);

      // 3. Prepare points for VectorStore
      const points: QdrantPoint[] = semanticBlocks.map((block, index) => {
        const chunkId = uuidv4(); // Unique ID for this specific code chunk
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
      await this.vectorStore.upsertPoints(points);
      console.log(`[EmbeddingService] Successfully indexed ${points.length} blocks from ${filePath} into vector store.`);

    } catch (error) {
      console.error(`[EmbeddingService] Error indexing file ${filePath}:`, error);
      // Decide on error handling: re-throw, log, or specific recovery
      throw error;
    }
  }

  public async deleteFileIndex(filePath: string): Promise<void> {
    console.log(`[EmbeddingService] Deleting index entries for file: ${filePath} in project ${this.projectName}`);
    try {
      await this.vectorStore.deletePointsByFile(filePath, this.projectName);
      console.log(`[EmbeddingService] Successfully processed deletion for file index: ${filePath}`);
    } catch (error) {
      console.error(`[EmbeddingService] Error deleting file index for ${filePath}:`, error);
      throw error;
    }
  }

  // Placeholder for semantic search functionality
  public async searchSimilarCode(queryText: string, limit: number = 5): Promise<any[]> {
    console.log(`[EmbeddingService] Searching for code similar to: "${queryText}"`);
    
    if (!this.openaiApiKey) {
      console.error("[EmbeddingService] OpenAI API Key is not configured. Cannot generate query embedding.");
      throw new Error("OpenAI API Key not configured for search.");
    }

    // 1. Generate embedding for the query text
    const queryEmbeddings = await generateOpenAIEmbeddings(
      [queryText], // API expects an array of texts
      this.openaiApiKey,
      this.openaiBaseUrl,
      this.embeddingModelName
    );
    
    if (!queryEmbeddings || queryEmbeddings.length === 0) {
      console.error("[EmbeddingService] Failed to generate query embedding.");
      throw new Error("Failed to generate query embedding.");
    }
    const queryEmbedding = queryEmbeddings[0];
    console.log(`[EmbeddingService] Query embedding generated for "${queryText}".`);

    // 2. Search in VectorStore
    try {
      // Optionally, add a filter to search only within the current project
      const filter = {
        must: [
          { key: 'project', match: { value: this.projectName } },
        ],
      };
      const results = await this.vectorStore.search(queryEmbedding, limit, filter);
      console.log(`[EmbeddingService] Found ${results.length} similar code blocks.`);
      // TODO: Process/format results as needed for the AI commit message generator
      return results;
    } catch (error) {
      console.error(`[EmbeddingService] Error during semantic search for "${queryText}":`, error);
      throw error;
    }
  }
}