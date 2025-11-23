/**
 * AI 提供商元数据注册表
 * 包含所有支持的 AI 提供商的完整配置信息
 */

import {
  AuthMode,
  FieldType,
  ProviderRegistry as ProviderRegistryType,
  ProviderType,
  ValidationRuleType,
} from "../types/provider-metadata";

// 提供商元数据注册表
export const providerRegistry: ProviderRegistryType = {
  // === 第一方提供商 ===
  openai: {
    id: "openai",
    name: "OpenAI",
    description: "openai.description",
    website: "https://openai.com",
    type: ProviderType.FIRST_PARTY,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "openai.fields.apiKey.label",
        required: true,
        secure: true,
        placeholder: "openai.fields.apiKey.placeholder",
        helpText: "openai.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "openai.fields.apiKey.validation.required",
          },
          {
            type: ValidationRuleType.PATTERN,
            pattern: /^sk-/,
            message: "openai.fields.apiKey.validation.pattern",
          },
        ],
      },
      // {
      //   key: 'organization',
      //   type: FieldType.TEXT,
      //   label: 'Organization ID',
      //   required: false,
      //   placeholder: 'org-...',
      //   helpText: '可选的 OpenAI 组织 ID',
      // },
      {
        key: "useCustomUrl",
        type: FieldType.CHECKBOX,
        label: "openai.fields.useCustomUrl.label",
        required: false,
        defaultValue: false,
        helpText: "openai.fields.useCustomUrl.helpText",
      },
      {
        key: "baseURL",
        type: FieldType.URL,
        label: "openai.fields.baseURL.label",
        required: false,
        placeholder: "openai.fields.baseURL.placeholder",
        conditional: { field: "useCustomUrl", value: true },
        validation: [
          {
            type: ValidationRuleType.PATTERN,
            pattern: /^https?:\/\/.+/,
            message: "openai.fields.baseURL.validation.pattern",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
      promptCache: false,
      embeddings: true,
      tools: true,
      jsonMode: true,
    },
    models: [
      {
        id: "gpt-4",
        name: "GPT-4",
        contextWindow: 128000,
        maxOutputTokens: 4096,
        capabilities: ["text", "function-calling", "tools"],
      },
      {
        id: "gpt-4-turbo",
        name: "GPT-4 Turbo",
        contextWindow: 128000,
        maxOutputTokens: 4096,
        capabilities: ["text", "function-calling", "tools", "vision"],
      },
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        contextWindow: 16385,
        maxOutputTokens: 4096,
        capabilities: ["text", "function-calling"],
      },
    ],
    documentation: {
      setup: "https://platform.openai.com/docs/quickstart",
      apiReference: "https://platform.openai.com/docs/api-reference",
      examples: "https://platform.openai.com/docs/examples",
    },
  },

  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    description: "deepseek.description",
    website: "https://www.deepseek.com",
    type: ProviderType.FIRST_PARTY,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "deepseek.fields.apiKey.label",
        required: true,
        secure: true,
        placeholder: "deepseek.fields.apiKey.placeholder",
        helpText: "deepseek.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "deepseek.fields.apiKey.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
      promptCache: true,
      embeddings: true,
      tools: true,
      jsonMode: true,
    },
    models: [
      {
        id: "deepseek-chat",
        name: "DeepSeek Chat (V2)",
        contextWindow: 32000,
        maxOutputTokens: 4096,
        capabilities: ["text", "function-calling"],
      },
      {
        id: "deepseek-coder",
        name: "DeepSeek Coder (V2)",
        contextWindow: 32000,
        maxOutputTokens: 4096,
        capabilities: ["text", "code"],
      },
    ],
    documentation: {
      setup: "https://platform.deepseek.com",
      apiReference: "https://platform.deepseek.com/api-docs",
      examples: "https://platform.deepseek.com/api-docs",
    },
  },

  togetherai: {
    id: "togetherai",
    name: "Together AI",
    description: "togetherai.description",
    website: "https://www.together.ai",
    type: ProviderType.FIRST_PARTY,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "togetherai.fields.apiKey.label",
        required: true,
        secure: true,
        placeholder: "togetherai.fields.apiKey.placeholder",
        helpText: "togetherai.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "togetherai.fields.apiKey.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
      promptCache: false,
      embeddings: true,
      tools: true,
      jsonMode: true,
    },
    models: [
      {
        id: "meta-llama/Llama-3-70b-chat-hf",
        name: "Llama 3 70B",
        contextWindow: 8192,
        maxOutputTokens: 4096,
        capabilities: ["text"],
      },
      {
        id: "meta-llama/Llama-3-8b-chat-hf",
        name: "Llama 3 8B",
        contextWindow: 8192,
        maxOutputTokens: 4096,
        capabilities: ["text"],
      },
      {
        id: "mistralai/Mixtral-8x7B-Instruct-v0.1",
        name: "Mixtral 8x7B",
        contextWindow: 32000,
        maxOutputTokens: 4096,
        capabilities: ["text"],
      },
    ],
    documentation: {
      setup: "https://docs.together.ai/docs/quickstart",
      apiReference: "https://docs.together.ai/docs/inference-rest",
      examples: "https://docs.together.ai/docs/examples",
    },
  },

  xai: {
    id: "xai",
    name: "xAI (Grok)",
    description: "xai.description",
    website: "https://x.ai",
    type: ProviderType.FIRST_PARTY,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "xai.fields.apiKey.label",
        required: true,
        secure: true,
        placeholder: "xai.fields.apiKey.placeholder",
        helpText: "xai.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "xai.fields.apiKey.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: false,
      vision: false,
      promptCache: false,
      embeddings: false,
      tools: false,
      jsonMode: false,
    },
    models: [
      {
        id: "grok-beta",
        name: "Grok Beta",
        contextWindow: 128000,
        maxOutputTokens: 4096,
        capabilities: ["text"],
      },
    ],
    documentation: {
      setup: "https://x.ai/api",
      apiReference: "https://docs.x.ai/api",
      examples: "https://docs.x.ai/docs",
    },
  },

  "google-vertex": {
    id: "google-vertex",
    name: "Google Vertex AI",
    description: "google-vertex.description",
    website: "https://cloud.google.com/vertex-ai",
    type: ProviderType.FIRST_PARTY,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "google-vertex.fields.apiKey.label",
        required: true,
        secure: false,
        placeholder: "google-vertex.fields.apiKey.placeholder",
        helpText: "google-vertex.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "google-vertex.fields.apiKey.validation.required",
          },
          {
            type: ValidationRuleType.PATTERN,
            pattern: /^.+:.+$/,
            message: "google-vertex.fields.apiKey.validation.pattern",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      promptCache: false,
      embeddings: true,
      tools: true,
      jsonMode: true,
    },
    models: [
      {
        id: "gemini-1.5-pro",
        name: "Gemini 1.5 Pro",
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        capabilities: ["text", "vision", "function-calling"],
      },
      {
        id: "gemini-1.5-flash",
        name: "Gemini 1.5 Flash",
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        capabilities: ["text", "vision", "function-calling"],
      },
    ],
    documentation: {
      setup:
        "https://cloud.google.com/vertex-ai/docs/start/quickstarts/generative-ai",
      apiReference: "https://cloud.google.com/vertex-ai/docs/reference/rest",
      examples: "https://cloud.google.com/vertex-ai/docs/samples",
    },
  },

  azure: {
    id: "azure",
    name: "Azure OpenAI",
    description: "azure.description",
    website:
      "https://azure.microsoft.com/en-us/products/ai-services/openai-service",
    type: ProviderType.FIRST_PARTY,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "azure.fields.apiKey.label",
        required: true,
        secure: true,
        placeholder: "azure.fields.apiKey.placeholder",
        helpText: "azure.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "azure.fields.apiKey.validation.required",
          },
        ],
      },
      {
        key: "baseURL",
        type: FieldType.TEXT,
        label: "azure.fields.baseURL.label",
        required: true,
        placeholder: "azure.fields.baseURL.placeholder",
        helpText: "azure.fields.baseURL.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "azure.fields.baseURL.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      promptCache: false,
      embeddings: true,
      tools: true,
      jsonMode: true,
    },
    models: [
      {
        id: "gpt-4",
        name: "GPT-4 (Deployment: gpt-4)",
        contextWindow: 8192,
        maxOutputTokens: 4096,
        capabilities: ["text", "function-calling"],
      },
      {
        id: "gpt-35-turbo",
        name: "GPT-3.5 Turbo (Deployment: gpt-35-turbo)",
        contextWindow: 4096,
        maxOutputTokens: 4096,
        capabilities: ["text", "function-calling"],
      },
    ],
    documentation: {
      setup:
        "https://learn.microsoft.com/en-us/azure/ai-services/openai/quickstart",
      apiReference:
        "https://learn.microsoft.com/en-us/azure/ai-services/openai/reference",
      examples:
        "https://learn.microsoft.com/en-us/azure/ai-services/openai/examples",
    },
  },

  mistral: {
    id: "mistral",
    name: "Mistral AI",
    description: "mistral.description",
    website: "https://mistral.ai",
    type: ProviderType.FIRST_PARTY,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "mistral.fields.apiKey.label",
        required: true,
        secure: true,
        placeholder: "mistral.fields.apiKey.placeholder",
        helpText: "mistral.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "mistral.fields.apiKey.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
      promptCache: false,
      embeddings: true,
      tools: true,
      jsonMode: true,
    },
    models: [
      {
        id: "mistral-large-latest",
        name: "Mistral Large",
        contextWindow: 32000,
        maxOutputTokens: 4096,
        capabilities: ["text", "function-calling"],
      },
      {
        id: "mistral-medium-latest",
        name: "Mistral Medium",
        contextWindow: 32000,
        maxOutputTokens: 4096,
        capabilities: ["text"],
      },
      {
        id: "mistral-small-latest",
        name: "Mistral Small",
        contextWindow: 32000,
        maxOutputTokens: 4096,
        capabilities: ["text"],
      },
      {
        id: "open-mixtral-8x7b",
        name: "Mixtral 8x7B",
        contextWindow: 32000,
        maxOutputTokens: 4096,
        capabilities: ["text"],
      },
    ],
    documentation: {
      setup: "https://docs.mistral.ai",
      apiReference: "https://docs.mistral.ai/api",
      examples: "https://docs.mistral.ai/guides",
    },
  },

  groq: {
    id: "groq",
    name: "Groq",
    description: "groq.description",
    website: "https://groq.com",
    type: ProviderType.FIRST_PARTY,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "groq.fields.apiKey.label",
        required: true,
        secure: true,
        placeholder: "groq.fields.apiKey.placeholder",
        helpText: "groq.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "groq.fields.apiKey.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
      promptCache: false,
      embeddings: false,
      tools: true,
      jsonMode: true,
    },
    models: [
      {
        id: "llama3-8b-8192",
        name: "Llama 3 8B",
        contextWindow: 8192,
        maxOutputTokens: 8192,
        capabilities: ["text", "function-calling"],
      },
      {
        id: "llama3-70b-8192",
        name: "Llama 3 70B",
        contextWindow: 8192,
        maxOutputTokens: 8192,
        capabilities: ["text", "function-calling"],
      },
      {
        id: "mixtral-8x7b-32768",
        name: "Mixtral 8x7B",
        contextWindow: 32768,
        maxOutputTokens: 32768,
        capabilities: ["text", "function-calling"],
      },
      {
        id: "gemma-7b-it",
        name: "Gemma 7B",
        contextWindow: 8192,
        maxOutputTokens: 8192,
        capabilities: ["text"],
      },
    ],
    documentation: {
      setup: "https://console.groq.com/docs/quickstart",
      apiReference: "https://console.groq.com/docs/api-reference",
      examples: "https://console.groq.com/docs/examples",
    },
  },

  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    description: "anthropic.description",
    website: "https://www.anthropic.com",
    type: ProviderType.FIRST_PARTY,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "anthropic.fields.apiKey.label",
        required: true,
        secure: true,
        placeholder: "anthropic.fields.apiKey.placeholder",
        helpText: "anthropic.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "anthropic.fields.apiKey.validation.required",
          },
          {
            type: ValidationRuleType.PATTERN,
            pattern: /^sk-ant-/,
            message: "anthropic.fields.apiKey.validation.pattern",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      promptCache: true,
      embeddings: false,
      tools: true,
      jsonMode: false,
    },
    models: [
      {
        id: "claude-3-5-sonnet-20241022",
        name: "Claude 3.5 Sonnet",
        contextWindow: 200000,
        maxOutputTokens: 8192,
        capabilities: ["text", "vision", "function-calling"],
      },
      {
        id: "claude-3-5-haiku-20241022",
        name: "Claude 3.5 Haiku",
        contextWindow: 200000,
        maxOutputTokens: 8192,
        capabilities: ["text", "vision", "function-calling"],
      },
    ],
    pricing: {
      input: 3.0,
      output: 15.0,
      currency: "USD",
    },
  },

  gemini: {
    id: "gemini",
    name: "Google Gemini",
    description: "gemini.description",
    website: "https://ai.google.dev",
    type: ProviderType.FIRST_PARTY,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "gemini.fields.apiKey.label",
        required: true,
        secure: true,
        placeholder: "gemini.fields.apiKey.placeholder",
        helpText: "gemini.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "gemini.fields.apiKey.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      promptCache: false,
      embeddings: true,
      tools: true,
      jsonMode: false,
    },
    models: [
      {
        id: "gemini-1.5-pro",
        name: "Gemini 1.5 Pro",
        contextWindow: 2000000,
        maxOutputTokens: 8192,
        capabilities: ["text", "vision", "function-calling"],
      },
      {
        id: "gemini-1.5-flash",
        name: "Gemini 1.5 Flash",
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        capabilities: ["text", "vision", "function-calling"],
      },
    ],
  },

  // === 云服务提供商 ===
  "azure-openai": {
    id: "azure-openai",
    name: "Azure OpenAI",
    description: "azure-openai.description",
    website:
      "https://azure.microsoft.com/en-us/products/ai-services/openai-service",
    type: ProviderType.CLOUD,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "azure-openai.fields.apiKey.label",
        required: true,
        secure: true,
        helpText: "azure-openai.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "azure-openai.fields.apiKey.validation.required",
          },
        ],
      },
      {
        key: "baseURL",
        type: FieldType.URL,
        label: "azure-openai.fields.baseURL.label",
        required: true,
        placeholder: "azure-openai.fields.baseURL.placeholder",
        helpText: "azure-openai.fields.baseURL.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "azure-openai.fields.baseURL.validation.required",
          },
          {
            type: ValidationRuleType.PATTERN,
            pattern: /^https:\/\/.+\..+\.openai\.azure\.com\/?$/,
            message: "azure-openai.fields.baseURL.validation.pattern",
          },
        ],
      },
      {
        key: "apiVersion",
        type: FieldType.SELECT,
        label: "azure-openai.fields.apiVersion.label",
        required: true,
        defaultValue: "2024-02-15-preview",
        options: [
          { value: "2024-02-15-preview", label: "2024-02-15-preview" },
          { value: "2024-01-01", label: "2024-01-01" },
          { value: "2023-12-01-preview", label: "2023-12-01-preview" },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      promptCache: false,
      embeddings: true,
      tools: true,
      jsonMode: true,
    },
    models: [
      {
        id: "gpt-4",
        name: "GPT-4",
        contextWindow: 128000,
        maxOutputTokens: 4096,
        capabilities: ["text", "function-calling", "tools"],
      },
    ],
  },

  vertexai: {
    id: "vertexai",
    name: "Google Vertex AI",
    description: "vertexai.description",
    website: "https://cloud.google.com/vertex-ai",
    type: ProviderType.CLOUD,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "vertexai.fields.apiKey.label",
        required: true,
        secure: true,
        helpText: "vertexai.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "vertexai.fields.apiKey.validation.required",
          },
        ],
      },
      {
        key: "projectId",
        type: FieldType.TEXT,
        label: "vertexai.fields.projectId.label",
        required: true,
        placeholder: "vertexai.fields.projectId.placeholder",
        helpText: "vertexai.fields.projectId.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "vertexai.fields.projectId.validation.required",
          },
        ],
      },
      {
        key: "region",
        type: FieldType.SELECT,
        label: "vertexai.fields.region.label",
        required: true,
        defaultValue: "us-central1",
        options: [
          { value: "us-central1", label: "us-central1" },
          { value: "us-east1", label: "us-east1" },
          { value: "europe-west1", label: "europe-west1" },
          { value: "asia-southeast1", label: "asia-southeast1" },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      promptCache: false,
      embeddings: true,
      tools: true,
      jsonMode: false,
    },
    models: [
      {
        id: "gemini-1.5-pro",
        name: "Gemini 1.5 Pro",
        contextWindow: 2000000,
        maxOutputTokens: 8192,
        capabilities: ["text", "vision", "function-calling"],
      },
    ],
  },

  "baidu-qianfan": {
    id: "baidu-qianfan",
    name: "百度千帆",
    description: "baidu-qianfan.description",
    website: "https://cloud.baidu.com/product/wenxinworkshop",
    type: ProviderType.CLOUD,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "baidu-qianfan.fields.apiKey.label",
        required: true,
        secure: true,
        helpText: "baidu-qianfan.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "baidu-qianfan.fields.apiKey.validation.required",
          },
        ],
      },
      {
        key: "secretKey",
        type: FieldType.PASSWORD,
        label: "baidu-qianfan.fields.secretKey.label",
        required: true,
        secure: true,
        helpText: "baidu-qianfan.fields.secretKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "baidu-qianfan.fields.secretKey.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: false,
      vision: false,
      promptCache: false,
      embeddings: false,
      tools: false,
      jsonMode: false,
    },
    models: [
      {
        id: "ernie-bot-turbo",
        name: "文心一言 Turbo",
        contextWindow: 128000,
        maxOutputTokens: 2048,
        capabilities: ["text"],
      },
    ],
  },

  "cloudflare-workersai": {
    id: "cloudflare-workersai",
    name: "Cloudflare Workers AI",
    description: "cloudflare-workersai.description",
    website: "https://developers.cloudflare.com/workers-ai/",
    type: ProviderType.CLOUD,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "cloudflare-workersai.fields.apiKey.label",
        required: true,
        secure: true,
        helpText: "cloudflare-workersai.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "cloudflare-workersai.fields.apiKey.validation.required",
          },
        ],
      },
      {
        key: "accountId",
        type: FieldType.TEXT,
        label: "cloudflare-workersai.fields.accountId.label",
        required: true,
        placeholder: "cloudflare-workersai.fields.accountId.placeholder",
        helpText: "cloudflare-workersai.fields.accountId.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message:
              "cloudflare-workersai.fields.accountId.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: false,
      functionCalling: false,
      vision: false,
      promptCache: false,
      embeddings: true,
      tools: false,
      jsonMode: false,
    },
    models: [
      {
        id: "@cf/meta/llama-2-7b-chat-int8",
        name: "Llama 2 7B Chat",
        contextWindow: 4096,
        maxOutputTokens: 1024,
        capabilities: ["text"],
      },
    ],
  },

  // === 聚合服务 ===
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    description: "openrouter.description",
    website: "https://openrouter.ai",
    type: ProviderType.AGGREGATOR,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "openrouter.fields.apiKey.label",
        required: true,
        secure: true,
        helpText: "openrouter.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "openrouter.fields.apiKey.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      promptCache: false,
      embeddings: true,
      tools: true,
      jsonMode: true,
    },
    models: [
      {
        id: "openai/gpt-4",
        name: "GPT-4 (via OpenRouter)",
        contextWindow: 128000,
        maxOutputTokens: 4096,
        capabilities: ["text", "function-calling"],
      },
    ],
  },

  perplexity: {
    id: "perplexity",
    name: "Perplexity",
    description: "perplexity.description",
    website: "https://perplexity.ai",
    type: ProviderType.AGGREGATOR,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "perplexity.fields.apiKey.label",
        required: true,
        secure: true,
        helpText: "perplexity.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "perplexity.fields.apiKey.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: false,
      vision: false,
      promptCache: false,
      embeddings: false,
      tools: false,
      jsonMode: false,
    },
    models: [
      {
        id: "llama-3.1-sonar-small-128k-online",
        name: "Sonar Small 128K",
        contextWindow: 131072,
        maxOutputTokens: 4096,
        capabilities: ["text", "search"],
      },
    ],
  },

  // === 中国厂商 ===
  dashscope: {
    id: "dashscope",
    name: "阿里云通义千问",
    description: "dashscope.description",
    website: "https://dashscope.aliyun.com",
    type: ProviderType.CLOUD,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "dashscope.fields.apiKey.label",
        required: true,
        secure: true,
        helpText: "dashscope.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "dashscope.fields.apiKey.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      promptCache: false,
      embeddings: true,
      tools: false,
      jsonMode: false,
    },
    models: [
      {
        id: "qwen-turbo",
        name: "通义千问 Turbo",
        contextWindow: 8192,
        maxOutputTokens: 2048,
        capabilities: ["text", "vision"],
      },
    ],
  },

  doubao: {
    id: "doubao",
    name: "字节豆包",
    description: "doubao.description",
    website: "https://www.volcengine.com/product/doubao",
    type: ProviderType.CLOUD,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "doubao.fields.apiKey.label",
        required: true,
        secure: true,
        helpText: "doubao.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "doubao.fields.apiKey.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: false,
      vision: true,
      promptCache: false,
      embeddings: false,
      tools: false,
      jsonMode: false,
    },
    models: [
      {
        id: "doubao-pro-32k",
        name: "豆包 Pro 32K",
        contextWindow: 32768,
        maxOutputTokens: 4096,
        capabilities: ["text", "vision"],
      },
    ],
  },

  zhipu: {
    id: "zhipu",
    name: "智谱 AI",
    description: "zhipu.description",
    website: "https://www.zhipuai.cn",
    type: ProviderType.FIRST_PARTY,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "zhipu.fields.apiKey.label",
        required: true,
        secure: true,
        helpText: "zhipu.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "zhipu.fields.apiKey.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      promptCache: false,
      embeddings: true,
      tools: false,
      jsonMode: false,
    },
    models: [
      {
        id: "glm-4",
        name: "GLM-4",
        contextWindow: 128000,
        maxOutputTokens: 4096,
        capabilities: ["text", "vision", "function-calling"],
      },
    ],
  },

  // === 其他聚合服务 ===
  siliconflow: {
    id: "siliconflow",
    name: "SiliconFlow",
    description: "siliconflow.description",
    website: "https://siliconflow.cn",
    type: ProviderType.AGGREGATOR,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "siliconflow.fields.apiKey.label",
        required: true,
        secure: true,
        helpText: "siliconflow.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "siliconflow.fields.apiKey.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: false,
      vision: false,
      promptCache: false,
      embeddings: false,
      tools: false,
      jsonMode: false,
    },
    models: [
      {
        id: "Qwen/Qwen2.5-72B-Instruct",
        name: "Qwen2.5 72B",
        contextWindow: 131072,
        maxOutputTokens: 4096,
        capabilities: ["text"],
      },
    ],
  },

  together: {
    id: "together",
    name: "Together AI",
    description: "together.description",
    website: "https://together.ai",
    type: ProviderType.AGGREGATOR,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "together.fields.apiKey.label",
        required: true,
        secure: true,
        helpText: "together.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "together.fields.apiKey.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: false,
      vision: false,
      promptCache: false,
      embeddings: true,
      tools: false,
      jsonMode: false,
    },
    models: [
      {
        id: "meta-llama/Llama-2-70b-chat-hf",
        name: "Llama 2 70B Chat",
        contextWindow: 4096,
        maxOutputTokens: 2048,
        capabilities: ["text"],
      },
    ],
  },

  premai: {
    id: "premai",
    name: "PremAI",
    description: "premai.description",
    website: "https://premai.io",
    type: ProviderType.AGGREGATOR,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "premai.fields.apiKey.label",
        required: true,
        secure: true,
        helpText: "premai.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "premai.fields.apiKey.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: false,
      vision: false,
      promptCache: false,
      embeddings: false,
      tools: false,
      jsonMode: false,
    },
    models: [
      {
        id: "meta-llama/llama-3.1-8b-instruct",
        name: "Llama 3.1 8B Instruct",
        contextWindow: 131072,
        maxOutputTokens: 2048,
        capabilities: ["text"],
      },
    ],
  },

  // === 新增提供商 ===
  bedrock: {
    id: "bedrock",
    name: "Amazon Bedrock",
    description: "bedrock.description",
    website: "https://aws.amazon.com/bedrock/",
    type: ProviderType.CLOUD,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "bedrock.fields.apiKey.label",
        required: true,
        secure: true,
        placeholder: "bedrock.fields.apiKey.placeholder",
        helpText: "bedrock.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "bedrock.fields.apiKey.validation.required",
          },
          {
            type: ValidationRuleType.PATTERN,
            pattern: /^[^:]+:[^:]+$/,
            message: "bedrock.fields.apiKey.validation.pattern",
          },
        ],
      },
      {
        key: "baseURL",
        type: FieldType.TEXT,
        label: "bedrock.fields.baseURL.label",
        required: true,
        defaultValue: "us-east-1",
        placeholder: "bedrock.fields.baseURL.placeholder",
        helpText: "bedrock.fields.baseURL.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "bedrock.fields.baseURL.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      promptCache: false,
      embeddings: true,
      tools: true,
      jsonMode: false,
    },
    models: [
      {
        id: "anthropic.claude-3-sonnet-20240229-v1:0",
        name: "Claude 3 Sonnet",
        contextWindow: 200000,
        maxOutputTokens: 4096,
        capabilities: ["text", "vision", "function-calling"],
      },
      {
        id: "anthropic.claude-3-haiku-20240307-v1:0",
        name: "Claude 3 Haiku",
        contextWindow: 200000,
        maxOutputTokens: 4096,
        capabilities: ["text", "vision", "function-calling"],
      },
    ],
  },

  cohere: {
    id: "cohere",
    name: "Cohere",
    description: "cohere.description",
    website: "https://cohere.com",
    type: ProviderType.FIRST_PARTY,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "cohere.fields.apiKey.label",
        required: true,
        secure: true,
        helpText: "cohere.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "cohere.fields.apiKey.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
      promptCache: false,
      embeddings: true,
      tools: true,
      jsonMode: false,
    },
    models: [
      {
        id: "command-r",
        name: "Command R",
        contextWindow: 128000,
        maxOutputTokens: 4096,
        capabilities: ["text", "function-calling"],
      },
      {
        id: "command-r-plus",
        name: "Command R+",
        contextWindow: 128000,
        maxOutputTokens: 4096,
        capabilities: ["text", "function-calling"],
      },
    ],
  },

  fireworks: {
    id: "fireworks",
    name: "Fireworks AI",
    description: "fireworks.description",
    website: "https://fireworks.ai",
    type: ProviderType.AGGREGATOR,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "fireworks.fields.apiKey.label",
        required: true,
        secure: true,
        helpText: "fireworks.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "fireworks.fields.apiKey.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      promptCache: false,
      embeddings: true,
      tools: true,
      jsonMode: true,
    },
    models: [
      {
        id: "accounts/fireworks/models/llama-v3-8b-instruct",
        name: "Llama 3 8B Instruct",
        contextWindow: 8192,
        maxOutputTokens: 4096,
        capabilities: ["text"],
      },
      {
        id: "accounts/fireworks/models/mixtral-8x7b-instruct",
        name: "Mixtral 8x7B Instruct",
        contextWindow: 32768,
        maxOutputTokens: 4096,
        capabilities: ["text"],
      },
    ],
  },

  deepinfra: {
    id: "deepinfra",
    name: "DeepInfra",
    description: "deepinfra.description",
    website: "https://deepinfra.com",
    type: ProviderType.AGGREGATOR,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "deepinfra.fields.apiKey.label",
        required: true,
        secure: true,
        helpText: "deepinfra.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "deepinfra.fields.apiKey.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      promptCache: false,
      embeddings: true,
      tools: true,
      jsonMode: true,
    },
    models: [
      {
        id: "meta-llama/Meta-Llama-3-8B-Instruct",
        name: "Llama 3 8B Instruct",
        contextWindow: 8192,
        maxOutputTokens: 4096,
        capabilities: ["text"],
      },
      {
        id: "mistralai/Mixtral-8x7B-Instruct-v0.1",
        name: "Mixtral 8x7B Instruct",
        contextWindow: 32768,
        maxOutputTokens: 4096,
        capabilities: ["text"],
      },
    ],
  },

  cerebras: {
    id: "cerebras",
    name: "Cerebras",
    description: "cerebras.description",
    website: "https://cerebras.ai",
    type: ProviderType.FIRST_PARTY,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "cerebras.fields.apiKey.label",
        required: true,
        secure: true,
        helpText: "cerebras.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "cerebras.fields.apiKey.validation.required",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: false,
      vision: false,
      promptCache: false,
      embeddings: false,
      tools: false,
      jsonMode: false,
    },
    models: [
      {
        id: "llama3.1-8b",
        name: "Llama 3.1 8B",
        contextWindow: 8192,
        maxOutputTokens: 4096,
        capabilities: ["text"],
      },
      {
        id: "llama3.1-70b",
        name: "Llama 3.1 70B",
        contextWindow: 8192,
        maxOutputTokens: 4096,
        capabilities: ["text"],
      },
    ],
  },

  // === 本地/自托管 ===
  ollama: {
    id: "ollama",
    name: "Ollama",
    description: "ollama.description",
    website: "https://ollama.ai",
    type: ProviderType.LOCAL,
    authMode: AuthMode.NONE,
    fields: [
      {
        key: "baseURL",
        type: FieldType.URL,
        label: "ollama.fields.baseURL.label",
        required: true,
        defaultValue: "http://localhost:11434",
        placeholder: "ollama.fields.baseURL.placeholder",
        helpText: "ollama.fields.baseURL.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "ollama.fields.baseURL.validation.required",
          },
          {
            type: ValidationRuleType.PATTERN,
            pattern: /^https?:\/\/.+/,
            message: "ollama.fields.baseURL.validation.pattern",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: false,
      vision: true,
      promptCache: false,
      embeddings: true,
      tools: false,
      jsonMode: false,
      customModels: true,
    },
    models: [
      {
        id: "llama3.2",
        name: "Llama 3.2",
        contextWindow: 131072,
        maxOutputTokens: 4096,
        capabilities: ["text", "vision"],
      },
    ],
  },

  lmstudio: {
    id: "lmstudio",
    name: "LM Studio",
    description: "lmstudio.description",
    website: "https://lmstudio.ai",
    type: ProviderType.LOCAL,
    authMode: AuthMode.NONE,
    fields: [
      {
        key: "baseURL",
        type: FieldType.URL,
        label: "lmstudio.fields.baseURL.label",
        required: true,
        defaultValue: "http://localhost:1234",
        placeholder: "lmstudio.fields.baseURL.placeholder",
        helpText: "lmstudio.fields.baseURL.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "lmstudio.fields.baseURL.validation.required",
          },
          {
            type: ValidationRuleType.PATTERN,
            pattern: /^https?:\/\/.+/,
            message: "lmstudio.fields.baseURL.validation.pattern",
          },
        ],
      },
    ],
    features: {
      streaming: true,
      functionCalling: false,
      vision: false,
      promptCache: false,
      embeddings: false,
      tools: false,
      jsonMode: false,
      customModels: true,
    },
    models: [
      {
        id: "local-model",
        name: "本地模型",
        contextWindow: 4096,
        maxOutputTokens: 2048,
        capabilities: ["text"],
      },
    ],
  },

  vscode: {
    id: "vscode",
    name: "VSCode 内置 AI",
    description: "vscode.description",
    website: "https://code.visualstudio.com",
    type: ProviderType.LOCAL,
    authMode: AuthMode.NONE,
    fields: [],
    features: {
      streaming: true,
      functionCalling: false,
      vision: false,
      promptCache: false,
      embeddings: false,
      tools: false,
      jsonMode: false,
    },
    models: [
      {
        id: "vscode-copilot",
        name: "VSCode Copilot",
        contextWindow: 8192,
        maxOutputTokens: 2048,
        capabilities: ["text"],
      },
    ],
  },

  // === 兼容层 ===
  "openai-compatible": {
    id: "openai-compatible",
    name: "OpenAI 兼容 API",
    description: "openai-compatible.description",
    website: "",
    type: ProviderType.OPENAI_COMPATIBLE,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "openai-compatible.fields.apiKey.label",
        required: true,
        secure: true,
        helpText: "openai-compatible.fields.apiKey.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "openai-compatible.fields.apiKey.validation.required",
          },
        ],
      },
      {
        key: "baseURL",
        type: FieldType.URL,
        label: "openai-compatible.fields.baseURL.label",
        required: true,
        placeholder: "openai-compatible.fields.baseURL.placeholder",
        helpText: "openai-compatible.fields.baseURL.helpText",
        validation: [
          {
            type: ValidationRuleType.REQUIRED,
            message: "openai-compatible.fields.baseURL.validation.required",
          },
          {
            type: ValidationRuleType.PATTERN,
            pattern: /^https?:\/\/.+/,
            message: "openai-compatible.fields.baseURL.validation.pattern",
          },
        ],
      },
      {
        key: "organization",
        type: FieldType.TEXT,
        label: "openai-compatible.fields.organization.label",
        required: false,
        placeholder: "openai-compatible.fields.organization.placeholder",
        helpText: "openai-compatible.fields.organization.helpText",
      },
      {
        key: "useAzure",
        type: FieldType.CHECKBOX,
        label: "openai-compatible.fields.useAzure.label",
        required: false,
        defaultValue: false,
        helpText: "openai-compatible.fields.useAzure.helpText",
      },
      {
        key: "azureApiVersion",
        type: FieldType.SELECT,
        label: "openai-compatible.fields.azureApiVersion.label",
        required: false,
        conditional: { field: "useAzure", value: true },
        options: [
          { value: "2024-02-15-preview", label: "2024-02-15-preview" },
          { value: "2024-01-01", label: "2024-01-01" },
          { value: "2023-12-01-preview", label: "2023-12-01-preview" },
        ],
        defaultValue: "2024-02-15-preview",
      },
      {
        key: "useCustomHeaders",
        type: FieldType.CHECKBOX,
        label: "openai-compatible.fields.useCustomHeaders.label",
        required: false,
        defaultValue: false,
        helpText: "openai-compatible.fields.useCustomHeaders.helpText",
      },
      {
        key: "customHeaders",
        type: FieldType.TEXTAREA,
        label: "openai-compatible.fields.customHeaders.label",
        required: false,
        conditional: { field: "useCustomHeaders", value: true },
        placeholder: "openai-compatible.fields.customHeaders.placeholder",
        helpText: "openai-compatible.fields.customHeaders.helpText",
        rows: 3,
        validation: [
          {
            type: ValidationRuleType.CUSTOM,
            message: "openai-compatible.fields.customHeaders.validation.custom",
            validator: (value: string) => {
              if (!value) return true;
              try {
                JSON.parse(value);
                return true;
              } catch {
                return false;
              }
            },
          },
        ],
      },
      {
        key: "enableR1Models",
        type: FieldType.CHECKBOX,
        label: "openai-compatible.fields.enableR1Models.label",
        required: false,
        defaultValue: false,
        helpText: "openai-compatible.fields.enableR1Models.helpText",
      },
      {
        key: "useLegacyFormat",
        type: FieldType.CHECKBOX,
        label: "openai-compatible.fields.useLegacyFormat.label",
        required: false,
        defaultValue: false,
        helpText: "openai-compatible.fields.useLegacyFormat.helpText",
      },
      {
        key: "includeMaxTokens",
        type: FieldType.CHECKBOX,
        label: "openai-compatible.fields.includeMaxTokens.label",
        required: false,
        defaultValue: true,
        helpText: "openai-compatible.fields.includeMaxTokens.helpText",
      },
    ],
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
      promptCache: false,
      embeddings: true,
      tools: true,
      jsonMode: true,
    },
    models: [
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        contextWindow: 16385,
        maxOutputTokens: 4096,
        capabilities: ["text", "function-calling"],
      },
    ],
  },
};

// 导出按类型分组的提供商
export const getProvidersByType = () => {
  return {
    [ProviderType.FIRST_PARTY]: Object.values(providerRegistry).filter(
      (p) => p.type === ProviderType.FIRST_PARTY,
    ),
    [ProviderType.CLOUD]: Object.values(providerRegistry).filter(
      (p) => p.type === ProviderType.CLOUD,
    ),
    [ProviderType.AGGREGATOR]: Object.values(providerRegistry).filter(
      (p) => p.type === ProviderType.AGGREGATOR,
    ),
    [ProviderType.LOCAL]: Object.values(providerRegistry).filter(
      (p) => p.type === ProviderType.LOCAL,
    ),
    [ProviderType.OPENAI_COMPATIBLE]: Object.values(providerRegistry).filter(
      (p) => p.type === ProviderType.OPENAI_COMPATIBLE,
    ),
  };
};

// 导出所有提供商 ID
export const getAllProviderIds = () => Object.keys(providerRegistry);

// 导出按认证模式分组的提供商
export const getProvidersByAuthMode = () => {
  return {
    [AuthMode.API_KEY]: Object.values(providerRegistry).filter(
      (p) => p.authMode === AuthMode.API_KEY,
    ),
    [AuthMode.CLI]: Object.values(providerRegistry).filter(
      (p) => p.authMode === AuthMode.CLI,
    ),
    [AuthMode.OAUTH]: Object.values(providerRegistry).filter(
      (p) => p.authMode === AuthMode.OAUTH,
    ),
    [AuthMode.NONE]: Object.values(providerRegistry).filter(
      (p) => p.authMode === AuthMode.NONE,
    ),
  };
};
