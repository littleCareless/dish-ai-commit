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
    description: "Experimental Features / 实验性功能",
    codeIndex: {
      description: "Codebase Indexing / 代码库索引",
      enabled: {
        type: "boolean",
        default: false,
        description:
          "Enable or disable codebase indexing feature / 启用或禁用代码库索引功能",
        feature: {
          "zh-CN": {
            what: "代码库索引功能通过对您的项目代码进行处理和索引，为 AI 提供更丰富的上下文信息。这使得 AI 能够更深入地理解您的代码库，从而在生成代码、回答问题或执行其他与代码相关的任务时，能够利用整个项目的知识。",
            benefits: [
              "提高 AI 响应的准确性和相关性。",
              "能够就整个代码库提出问题，而不仅限于当前打开的文件。",
              "生成的代码能更好地与现有代码风格、函数和模式保持一致。",
              "在大型复杂项目中，能显著提升 AI 的辅助效率。",
            ],
            drawbacks: [
              "索引过程可能会消耗较多的计算资源（CPU、内存）。",
              "对于大型代码库，初次索引可能需要较长时间。",
              "使用基于 API 的嵌入服务（如 OpenAI）会消耗额度。",
              "需要在本地或远程设置和维护向量数据库（Qdrant）。",
            ],
          },
          "en-US": {
            what: "The codebase indexing feature processes and indexes your project's code to provide richer context to the AI. This allows the AI to understand your codebase more deeply, enabling it to leverage knowledge of the entire project when generating code, answering questions, or performing other code-related tasks.",
            benefits: [
              "Improves the accuracy and relevance of AI responses.",
              "Enables asking questions about the entire codebase, not just the currently open files.",
              "Generated code is more consistent with existing code styles, functions, and patterns.",
              "Significantly enhances AI assistance efficiency in large and complex projects.",
            ],
            drawbacks: [
              "The indexing process can be resource-intensive (CPU, memory).",
              "Initial indexing may take a long time for large codebases.",
              "Using API-based embedding services (like OpenAI) will consume credits.",
              "Requires setting up and maintaining a vector database (Qdrant) locally or remotely.",
            ],
          },
        },
      },
      embeddingProvider: {
        type: "enum",
        default: "OpenAI",
        description:
          "Embedding provider for codebase indexing / 代码库索引的嵌入提供商",
        enum: ["OpenAI", "Ollama", "openai-compatible"],
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
      openaiCompatible: {
        description:
          "Settings for OpenAI Compatible Embedding Provider / OpenAI 兼容嵌入提供商的设置",
        baseUrl: {
          type: "string",
          default: "",
          description: "Base URL for the compatible service / 兼容服务的基础 URL",
        },
        apiKey: {
          type: "string",
          default: "",
          description: "API key for the compatible service / 兼容服务的 API 密钥",
        },
        model: {
          type: "string",
          default: "",
          description: "Model name for the compatible service / 兼容服务的模型名称",
        },
        dimension: {
          type: "number",
          default: 1536,
          description:
            "Dimension of the embedding model / 嵌入模型的维度",
        },
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
    commitWithFunctionCalling: {
      description: "Commit with Function Calling / 使用函数调用生成提交",
      enabled: {
        type: "boolean",
        default: false,
        description:
          "Enable or disable commit generation with function calling mode. (This may not be supported by some models) / 启用或禁用函数调用模式生成提交信息。（某些模型可能不支持）",
        feature: {
          "zh-CN": {
            what: "此功能利用 AI 模型的函数调用（Function Calling）能力来生成结构化且更精确的提交信息。AI 不再仅仅生成自由文本，而是可以调用预定义的“函数”来获取所需信息并按指定格式输出，从而更好地遵循提交规范。",
            benefits: [
              "生成更高质量、格式更一致的提交信息。",
              "AI 能更准确地理解并遵循 Conventional Commits 等提交规范。",
              "减少手动修改 AI 生成的提交信息所需的时间。",
            ],
            drawbacks: [
              "并非所有 AI 模型都支持函数调用功能。",
              "与纯文本生成相比，可能会有轻微的延迟。",
              "如果模型或提示词配置不当，效果可能不佳。",
            ],
          },
          "en-US": {
            what: "This feature leverages the AI model's Function Calling capability to generate structured and more precise commit messages. Instead of just generating free-form text, the AI can call predefined 'functions' to get necessary information and format the output, thus better adhering to commit conventions.",
            benefits: [
              "Generates higher quality and more consistently formatted commit messages.",
              "The AI can more accurately understand and follow commit standards like Conventional Commits.",
              "Reduces the time needed to manually edit AI-generated commit messages.",
            ],
            drawbacks: [
              "Not all AI models support the function calling feature.",
              "There might be a slight delay compared to pure text generation.",
              "The effectiveness can be suboptimal if the model or prompts are not configured correctly.",
            ],
          },
        },
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

/**
 * Recursively builds a nested object of key paths from a schema object.
 * @param obj The schema object.
 * @param path The current path prefix.
 * @returns A nested object where leaf nodes are key path strings.
 */
function buildKeyPaths<T extends object>(obj: T, path: string[] = []): any {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      const newPath = [...path, key];
      // Check if it's a nested object that is not a config value definition
      if (typeof value === "object" && value !== null && !("type" in value)) {
        return [key, buildKeyPaths(value as object, newPath)];
      }
      return [key, newPath.join(".")];
    })
  );
}

export const WORKSPACE_CONFIG_PATHS = buildKeyPaths(WORKSPACE_CONFIG_SCHEMA);
