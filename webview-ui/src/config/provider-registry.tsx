/**
 * AI 提供商元数据注册表
 * 包含所有支持的 AI 提供商的完整配置信息
 */

import { OllamaModelDiscovery } from "../components/settings/OllamaModelDiscovery";
import {
  AuthMode,
  FieldType,
  ProviderRegistry as ProviderRegistryType,
  ProviderType,
  ValidationRuleType,
} from "../types/provider-metadata";

// 通用验证规则
const commonValidations = {
  required: (message: string) => ({
    type: ValidationRuleType.REQUIRED,
    message,
  }),
  pattern: (pattern: RegExp, message: string) => ({
    type: ValidationRuleType.PATTERN,
    pattern,
    message,
  }),
  min: (min: number, message: string) => ({
    type: ValidationRuleType.MIN,
    min,
    message,
  }),
  max: (max: number, message: string) => ({
    type: ValidationRuleType.MAX,
    max,
    message,
  }),
};

// 提供商元数据注册表
export const ProviderRegistry: ProviderRegistryType = {
  // === 第一方提供商 ===
  openai: {
    id: "openai",
    name: "OpenAI",
    description: "GPT 模型，由 OpenAI 开发",
    website: "https://openai.com",
    type: ProviderType.FIRST_PARTY,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "API Key",
        required: true,
        secure: true,
        placeholder: "sk-...",
        helpText: "从 OpenAI 平台获取的 API 密钥",
        validation: [
          commonValidations.required("API Key 是必需的"),
          commonValidations.pattern(/^sk-/, "OpenAI API Key 应以 sk- 开头"),
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
        label: "使用自定义基础 URL",
        required: false,
        defaultValue: false,
        helpText: "用于代理或私有部署",
      },
      {
        key: "baseURL",
        type: FieldType.URL,
        label: "自定义基础 URL",
        required: false,
        placeholder: "https://api.openai.com/v1",
        conditional: { field: "useCustomUrl", value: true },
        validation: [
          commonValidations.pattern(/^https?:\/\/.+/, "请输入有效的 URL"),
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

  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude 模型，由 Anthropic 开发",
    website: "https://www.anthropic.com",
    type: ProviderType.FIRST_PARTY,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "API Key",
        required: true,
        secure: true,
        placeholder: "sk-ant-...",
        helpText: "从 Anthropic 控制台获取的 API 密钥",
        validation: [
          commonValidations.required("API Key 是必需的"),
          commonValidations.pattern(
            /^sk-ant-/,
            "Anthropic API Key 应以 sk-ant- 开头",
          ),
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
    description: "Gemini 模型，由 Google 开发",
    website: "https://ai.google.dev",
    type: ProviderType.FIRST_PARTY,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "API Key",
        required: true,
        secure: true,
        placeholder: "AI...",
        helpText: "从 Google AI Studio 获取的 API 密钥",
        validation: [commonValidations.required("API Key 是必需的")],
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

  mistral: {
    id: "mistral",
    name: "Mistral AI",
    description: "Mistral 模型，由 Mistral AI 开发",
    website: "https://mistral.ai",
    type: ProviderType.FIRST_PARTY,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "API Key",
        required: true,
        secure: true,
        placeholder: "...",
        helpText: "从 Mistral AI 平台获取的 API 密钥",
        validation: [commonValidations.required("API Key 是必需的")],
      },
    ],
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
      promptCache: false,
      embeddings: true,
      tools: false,
      jsonMode: true,
    },
    models: [
      {
        id: "mistral-large-latest",
        name: "Mistral Large",
        contextWindow: 128000,
        maxOutputTokens: 8192,
        capabilities: ["text", "function-calling"],
      },
    ],
  },

  // === 云服务提供商 ===
  "azure-openai": {
    id: "azure-openai",
    name: "Azure OpenAI",
    description: "Azure 上的 OpenAI 服务",
    website:
      "https://azure.microsoft.com/en-us/products/ai-services/openai-service",
    type: ProviderType.CLOUD,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "API Key",
        required: true,
        secure: true,
        helpText: "Azure OpenAI 服务的 API 密钥",
        validation: [commonValidations.required("API Key 是必需的")],
      },
      {
        key: "baseURL",
        type: FieldType.URL,
        label: "Endpoint URL",
        required: true,
        placeholder: "https://your-resource.openai.azure.com/",
        helpText: "Azure OpenAI 服务的端点 URL",
        validation: [
          commonValidations.required("Endpoint URL 是必需的"),
          commonValidations.pattern(
            /^https:\/\/.+\..+\.openai\.azure\.com\/?$/,
            "请输入有效的 Azure OpenAI 端点",
          ),
        ],
      },
      {
        key: "apiVersion",
        type: FieldType.SELECT,
        label: "API 版本",
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
    description: "Google Cloud 上的 AI 服务",
    website: "https://cloud.google.com/vertex-ai",
    type: ProviderType.CLOUD,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "API Key",
        required: true,
        secure: true,
        helpText: "Google Cloud 服务账号密钥",
        validation: [commonValidations.required("API Key 是必需的")],
      },
      {
        key: "projectId",
        type: FieldType.TEXT,
        label: "Project ID",
        required: true,
        placeholder: "your-project-id",
        helpText: "Google Cloud 项目 ID",
        validation: [commonValidations.required("Project ID 是必需的")],
      },
      {
        key: "region",
        type: FieldType.SELECT,
        label: "区域",
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
    description: "百度智能云千帆大模型平台",
    website: "https://cloud.baidu.com/product/wenxinworkshop",
    type: ProviderType.CLOUD,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "API Key",
        required: true,
        secure: true,
        helpText: "千帆平台的 API Key",
        validation: [commonValidations.required("API Key 是必需的")],
      },
      {
        key: "secretKey",
        type: FieldType.PASSWORD,
        label: "Secret Key",
        required: true,
        secure: true,
        helpText: "千帆平台的 Secret Key",
        validation: [commonValidations.required("Secret Key 是必需的")],
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
    description: "Cloudflare 的边缘 AI 服务",
    website: "https://developers.cloudflare.com/workers-ai/",
    type: ProviderType.CLOUD,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "API Token",
        required: true,
        secure: true,
        helpText: "Cloudflare API Token",
        validation: [commonValidations.required("API Token 是必需的")],
      },
      {
        key: "accountId",
        type: FieldType.TEXT,
        label: "Account ID",
        required: true,
        placeholder: "your-account-id",
        helpText: "Cloudflare 账户 ID",
        validation: [commonValidations.required("Account ID 是必需的")],
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
    description: "访问多个 AI 模型的聚合服务",
    website: "https://openrouter.ai",
    type: ProviderType.AGGREGATOR,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "API Key",
        required: true,
        secure: true,
        helpText: "OpenRouter API 密钥",
        validation: [commonValidations.required("API Key 是必需的")],
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

  groq: {
    id: "groq",
    name: "Groq",
    description: "高速 AI 推理服务",
    website: "https://groq.com",
    type: ProviderType.AGGREGATOR,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "API Key",
        required: true,
        secure: true,
        helpText: "Groq API 密钥",
        validation: [commonValidations.required("API Key 是必需的")],
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
        id: "llama-3.1-70b-versatile",
        name: "Llama 3.1 70B",
        contextWindow: 131072,
        maxOutputTokens: 2048,
        capabilities: ["text"],
      },
    ],
  },

  perplexity: {
    id: "perplexity",
    name: "Perplexity",
    description: "实时搜索增强的 AI 模型",
    website: "https://perplexity.ai",
    type: ProviderType.AGGREGATOR,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "API Key",
        required: true,
        secure: true,
        helpText: "Perplexity API 密钥",
        validation: [commonValidations.required("API Key 是必需的")],
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
    description: "阿里云通义千问大模型",
    website: "https://dashscope.aliyun.com",
    type: ProviderType.CLOUD,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "API Key",
        required: true,
        secure: true,
        helpText: "通义千问 API Key",
        validation: [commonValidations.required("API Key 是必需的")],
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

  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    description: "DeepSeek 大模型",
    website: "https://www.deepseek.com",
    type: ProviderType.FIRST_PARTY,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "API Key",
        required: true,
        secure: true,
        helpText: "DeepSeek API 密钥",
        validation: [commonValidations.required("API Key 是必需的")],
      },
    ],
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
      promptCache: false,
      embeddings: false,
      tools: false,
      jsonMode: true,
    },
    models: [
      {
        id: "deepseek-chat",
        name: "DeepSeek Chat",
        contextWindow: 32768,
        maxOutputTokens: 4096,
        capabilities: ["text", "function-calling"],
      },
    ],
  },

  doubao: {
    id: "doubao",
    name: "字节豆包",
    description: "字节跳动豆包大模型",
    website: "https://www.volcengine.com/product/doubao",
    type: ProviderType.CLOUD,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "API Key",
        required: true,
        secure: true,
        helpText: "豆包 API 密钥",
        validation: [commonValidations.required("API Key 是必需的")],
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
    description: "智谱清言大模型",
    website: "https://www.zhipuai.cn",
    type: ProviderType.FIRST_PARTY,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "API Key",
        required: true,
        secure: true,
        helpText: "智谱 AI API 密钥",
        validation: [commonValidations.required("API Key 是必需的")],
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
    description: "硅流 AI 模型服务",
    website: "https://siliconflow.cn",
    type: ProviderType.AGGREGATOR,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "API Key",
        required: true,
        secure: true,
        helpText: "SiliconFlow API 密钥",
        validation: [commonValidations.required("API Key 是必需的")],
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
    description: "Together AI 模型服务",
    website: "https://together.ai",
    type: ProviderType.AGGREGATOR,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "API Key",
        required: true,
        secure: true,
        helpText: "Together AI API 密钥",
        validation: [commonValidations.required("API Key 是必需的")],
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

  xai: {
    id: "xai",
    name: "xAI",
    description: "xAI 的 Grok 模型",
    website: "https://x.ai",
    type: ProviderType.FIRST_PARTY,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "API Key",
        required: true,
        secure: true,
        helpText: "xAI API 密钥",
        validation: [commonValidations.required("API Key 是必需的")],
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
  },

  premai: {
    id: "premai",
    name: "PremAI",
    description: "PremAI 模型服务",
    website: "https://premai.io",
    type: ProviderType.AGGREGATOR,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "API Key",
        required: true,
        secure: true,
        helpText: "PremAI API 密钥",
        validation: [commonValidations.required("API Key 是必需的")],
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

  // === 本地/自托管 ===
  ollama: {
    id: "ollama",
    name: "Ollama",
    description: "本地 AI 模型运行环境",
    website: "https://ollama.ai",
    type: ProviderType.LOCAL,
    authMode: AuthMode.NONE,
    fields: [
      {
        key: "baseURL",
        type: FieldType.URL,
        label: "Ollama 服务器 URL",
        required: true,
        defaultValue: "http://localhost:11434",
        placeholder: "http://localhost:11434",
        helpText: "Ollama 服务器的地址",
        validation: [
          commonValidations.required("服务器 URL 是必需的"),
          commonValidations.pattern(/^https?:\/\/.+/, "请输入有效的 URL"),
        ],
      },
      {
        key: "modelDiscovery",
        type: FieldType.CUSTOM,
        label: "模型发现",
        required: false,
        helpText: "自动发现本地 Ollama 安装中的可用模型",
        customRenderer: (props) => {
          return <OllamaModelDiscovery {...props} />;
        },
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
    description: "本地 AI 模型管理工具",
    website: "https://lmstudio.ai",
    type: ProviderType.LOCAL,
    authMode: AuthMode.NONE,
    fields: [
      {
        key: "baseURL",
        type: FieldType.URL,
        label: "LM Studio 服务器 URL",
        required: true,
        defaultValue: "http://localhost:1234",
        placeholder: "http://localhost:1234",
        helpText: "LM Studio 服务器的地址",
        validation: [
          commonValidations.required("服务器 URL 是必需的"),
          commonValidations.pattern(/^https?:\/\/.+/, "请输入有效的 URL"),
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
    description: "VSCode 内置的 AI 功能",
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
    description: "任何 OpenAI 兼容的 API 端点",
    website: "",
    type: ProviderType.OPENAI_COMPATIBLE,
    authMode: AuthMode.API_KEY,
    fields: [
      {
        key: "apiKey",
        type: FieldType.PASSWORD,
        label: "API Key",
        required: true,
        secure: true,
        helpText: "兼容 API 的密钥",
        validation: [commonValidations.required("API Key 是必需的")],
      },
      {
        key: "baseURL",
        type: FieldType.URL,
        label: "API 端点 URL",
        required: true,
        placeholder: "https://api.example.com/v1",
        helpText: "OpenAI 兼容的 API 端点",
        validation: [
          commonValidations.required("API 端点 URL 是必需的"),
          commonValidations.pattern(/^https?:\/\/.+/, "请输入有效的 URL"),
        ],
      },
      {
        key: "organization",
        type: FieldType.TEXT,
        label: "Organization ID",
        required: false,
        placeholder: "org-...",
        helpText: "可选的 OpenAI 组织 ID",
      },
      {
        key: "useAzure",
        type: FieldType.CHECKBOX,
        label: "使用 Azure 服务",
        required: false,
        defaultValue: false,
        helpText: "启用 Azure OpenAI 服务配置",
      },
      {
        key: "azureApiVersion",
        type: FieldType.SELECT,
        label: "Azure API 版本",
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
        label: "自定义请求头",
        required: false,
        defaultValue: false,
        helpText: "添加自定义 HTTP 请求头",
      },
      {
        key: "customHeaders",
        type: FieldType.TEXTAREA,
        label: "自定义请求头 (JSON)",
        required: false,
        conditional: { field: "useCustomHeaders", value: true },
        placeholder: '{"Authorization": "Bearer token", "X-API-Key": "key"}',
        helpText: "JSON 格式的自定义请求头",
        rows: 3,
        validation: [
          {
            type: ValidationRuleType.CUSTOM,
            message: "请输入有效的 JSON 格式",
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
        label: "启用 R1 模型参数",
        required: false,
        defaultValue: false,
        helpText: "使用 QWQ 等 R1 系列模型时必须启用，避免出现 400 错误",
      },
      {
        key: "useLegacyFormat",
        type: FieldType.CHECKBOX,
        label: "使用传统 OpenAI API 格式",
        required: false,
        defaultValue: false,
        helpText: "启用流式传输",
      },
      {
        key: "includeMaxTokens",
        type: FieldType.CHECKBOX,
        label: "包含最大输出 Token 数",
        required: false,
        defaultValue: true,
        helpText:
          "在 API 请求中发送最大输出 Token 参数。某些提供商可能不支持此功能。",
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
export const providersByType = {
  [ProviderType.FIRST_PARTY]: Object.values(ProviderRegistry).filter(
    (p) => p.type === ProviderType.FIRST_PARTY,
  ),
  [ProviderType.CLOUD]: Object.values(ProviderRegistry).filter(
    (p) => p.type === ProviderType.CLOUD,
  ),
  [ProviderType.AGGREGATOR]: Object.values(ProviderRegistry).filter(
    (p) => p.type === ProviderType.AGGREGATOR,
  ),
  [ProviderType.LOCAL]: Object.values(ProviderRegistry).filter(
    (p) => p.type === ProviderType.LOCAL,
  ),
  [ProviderType.OPENAI_COMPATIBLE]: Object.values(ProviderRegistry).filter(
    (p) => p.type === ProviderType.OPENAI_COMPATIBLE,
  ),
};

// 导出所有提供商 ID
export const allProviderIds = Object.keys(ProviderRegistry);

// 导出按认证模式分组的提供商
export const providersByAuthMode = {
  [AuthMode.API_KEY]: Object.values(ProviderRegistry).filter(
    (p) => p.authMode === AuthMode.API_KEY,
  ),
  [AuthMode.CLI]: Object.values(ProviderRegistry).filter(
    (p) => p.authMode === AuthMode.CLI,
  ),
  [AuthMode.OAUTH]: Object.values(ProviderRegistry).filter(
    (p) => p.authMode === AuthMode.OAUTH,
  ),
  [AuthMode.NONE]: Object.values(ProviderRegistry).filter(
    (p) => p.authMode === AuthMode.NONE,
  ),
};
