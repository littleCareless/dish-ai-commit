import type {
  ConfigObject,
  ConfigValue,
  ConfigValueTypeString,
} from "./config-schema";

/**
 * Workspace-specific configuration schema.
 * These settings are stored in the workspace state and are not part of package.json.
 * @const {Object}
 */
export const WORKSPACE_CONFIG_SCHEMA = {
  experimental: {
    codeIndex: {
      enabled: {
        type: "boolean",
        default: false,
        description:
          "Enable or disable codebase indexing feature / 启用或禁用代码库索引功能",
      },
      embeddingProvider: {
        type: "enum",
        default: "OpenAI",
        description:
          "Embedding provider for codebase indexing / 代码库索引的嵌入提供商",
        enum: ["OpenAI", "Ollama"],
      },
      embeddingModel: {
        type: "enum",
        default: "text-embedding-3-small",
        description:
          "Embedding model for codebase indexing / 代码库索引的嵌入模型",
        enum: [
          // OpenAI 模型
          "text-embedding-3-small",
          "text-embedding-3-large",
          "text-embedding-ada-002",
          // Ollama 模型
          "nomic-embed-text",
          "mbai-embed-large",
          "all-minilm",
        ],
      },
      qdrantUrl: {
        type: "string",
        default: "",
        description: "Qdrant URL for vector database / 向量数据库的 Qdrant URL",
      },
      qdrantApiKey: {
        type: "string",
        default: "",
        description:
          "Qdrant API Key for vector database / 向量数据库的 Qdrant API 密钥",
      },
    },
  },
} as const;

// Generate type
export type WorkspaceConfigPath = string; // e.g., "codeIndexing.embeddingProvider"

// Modify SchemaType definition
export type WorkspaceSchemaType = {
  [K in keyof typeof WORKSPACE_CONFIG_SCHEMA]: {
    [P in keyof (typeof WORKSPACE_CONFIG_SCHEMA)[K]]:
      | ConfigValue
      | ConfigObject;
  };
};
