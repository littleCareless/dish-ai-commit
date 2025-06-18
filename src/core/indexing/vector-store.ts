import { QdrantClient } from "@qdrant/js-client-rest";

// Define the structure for the payload (metadata) to be stored alongside vectors
export interface SemanticBlockPayload {
  // Added export
  type: string;
  name: string;
  file: string;
  startLine: number;
  endLine: number;
  signature?: string;
  doc?: string;
  code: string; // The actual code block, might be too large for direct payload in some cases
  // Consider storing a reference or a truncated version if size becomes an issue.
  modulePath: string;
  chunk_id: string; // Unique ID for this specific chunk/block
  project: string; // Project identifier, useful if managing multiple projects
}

// Define the structure for a point to be inserted into Qdrant
export interface QdrantPoint {
  // Added export
  id: string; // Unique ID for the point (can be same as chunk_id or a UUID)
  vector: number[];
  payload: Record<string, any>; // Allow any string keys for Qdrant payload
}

export class VectorStore {
  private client: QdrantClient;
  private collectionName: string;
  private vectorSize: number; // This should match the output dimension of your embedding model
  private initializationPromise: Promise<void> | null = null;

  constructor(
    qdrantUrl: string = "http://localhost:6333",
    collectionName: string = "code_semantic_blocks",
    vectorSize: number = 1536
  ) {
    // Defaulting to 1536 for OpenAI text-embedding-3-small
    this.client = new QdrantClient({ url: qdrantUrl });
    this.collectionName = collectionName;
    this.vectorSize = vectorSize; // Example size, adjust based on embedding model
    this.initializeStore().catch((err) => {
      // The error is already logged in initializeStore.
      // We catch it here to prevent unhandled promise rejection warnings.
      console.error("Failed to initialize VectorStore in background", err);
    });
  }

  public initializeStore(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    this.initializationPromise = this._initializeStoreInternal();
    return this.initializationPromise;
  }

  private async _initializeStoreInternal(): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        (c) => c.name === this.collectionName
      );

      if (!collectionExists) {
        console.log(
          `Collection '${this.collectionName}' Size '${this.vectorSize}' does not exist. Creating...`
        );

        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorSize,
            distance: "Cosine", // Cosine similarity is common for text embeddings
          },
        });
        console.log(
          `Collection '${this.collectionName}' created successfully.`
        );
      }
    } catch (error) {
      this.initializationPromise = null; // Allow retry on failure
      console.error("Error initializing Qdrant store:", error);
      throw error; // Re-throw to allow higher-level error handling
    }
  }

  public async upsertPoints(points: QdrantPoint[]): Promise<void> {
    await this.initializeStore();
    if (points.length === 0) {
      return;
    }
    try {
      // Ensure points conform to the expected structure, especially the payload
      const qdrantPoints = points.map((p) => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload as Record<string, any>, // Explicitly cast payload
      }));
      console.log("collectionName", this.collectionName, qdrantPoints);
      await this.client.upsert(this.collectionName, { points: qdrantPoints });
      console.log(
        `Successfully upserted ${points.length} points to '${this.collectionName}'.`
      );
    } catch (error) {
      console.error("Error upserting points to Qdrant:", error);
      throw error;
    }
  }

  public async deletePointsByFile(
    filePath: string,
    projectName: string
  ): Promise<void> {
    await this.initializeStore();
    try {
      // This requires a more complex filter if we want to delete all points associated with a file.
      // Qdrant's deletePoints operation uses point IDs or filters on payload.
      // We'll need to query for points matching the file and project, then delete by their IDs,
      // or use a filter if the Qdrant client/API supports direct deletion by payload filter.

      // For now, let's assume we can filter by 'file' and 'project' in the payload.
      // The exact filter syntax depends on the client version and Qdrant capabilities.
      // This is a placeholder for a more robust implementation.
      console.warn(
        `deletePointsByFile for ${filePath} in project ${projectName} is not fully implemented with direct payload filtering for deletion. This is a conceptual placeholder.`
      );

      // Example of how one might achieve this if direct payload deletion filter is available:
      // await this.client.deletePoints(this.collectionName, {
      //   filter: {
      //     must: [
      //       { key: 'file', match: { value: filePath } },
      //       { key: 'project', match: { value: projectName } },
      //     ],
      //   },
      // });

      // A more common approach if direct deletion by filter isn't straightforward or efficient:
      // 1. Scroll/query all points matching the file.
      // 2. Collect their IDs.
      // 3. Delete by IDs.
      const pointsToDelete = await this.client.scroll(this.collectionName, {
        filter: {
          must: [
            { key: "file", match: { value: filePath } },
            { key: "project", match: { value: projectName } },
          ],
        },
        limit: 1000, // Adjust limit as needed, or implement pagination
        with_payload: false, // Don't need payload, just IDs
        with_vector: false,
      });

      if (pointsToDelete.points && pointsToDelete.points.length > 0) {
        const idsToDelete = pointsToDelete.points.map((p) => p.id);
        await this.client.delete(this.collectionName, { points: idsToDelete });
        console.log(
          `Deleted ${idsToDelete.length} points for file '${filePath}' in project '${projectName}'.`
        );
      } else {
        console.log(
          `No points found for file '${filePath}' in project '${projectName}' to delete.`
        );
      }
    } catch (error) {
      console.error(
        `Error deleting points for file ${filePath} in project ${projectName}:`,
        error
      );
      throw error;
    }
  }

  // Placeholder for semantic search
  public async search(
    queryVector: number[],
    limit: number = 10,
    filter?: any
  ): Promise<any[]> {
    await this.initializeStore();
    try {
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryVector,
        limit: limit,
        filter: filter, // Optional filter based on metadata
        with_payload: true, // Include payload in results
        with_vector: false, // Usually don't need the vector itself in search results
      });
      console.log(`Search completed. Found ${searchResult.length} results.`);
      return searchResult;
    } catch (error) {
      console.error("Error searching Qdrant:", error);
      throw error;
    }
  }

  public async hasVectors(): Promise<number> {
    await this.initializeStore();
    try {
      const infoPromise = this.client.getCollection(this.collectionName);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("hasVectors request timed out")),
          3000
        )
      );

      const info = await Promise.race([infoPromise, timeoutPromise]);

      const count = info.points_count ?? 0;
      console.log(`当前向量数量: ${count},${info},${this.collectionName}`);
      return count;
    } catch (error) {
      console.error("无法获取向量数量:", error);
      return 0;
    }
  }
}
