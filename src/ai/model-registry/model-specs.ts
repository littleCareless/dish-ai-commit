/**
 * 模型规格数据库
 * 维护各个AI提供商的最新模型规格信息
 */

export interface ModelSpec {
  /** 模型ID */
  id: string;
  /** 模型名称 */
  name: string;
  /** 提供商信息 */
  provider: {
    id: string;
    name: string;
  };
  /** Token限制 */
  maxTokens: {
    input: number;
    output: number;
  };
  /** 最后更新时间 */
  lastUpdated: string;
  /** 数据来源 */
  source: 'api' | 'api-proxy' | 'manual' | 'fallback';
  /** 模型能力 */
  capabilities?: {
    streaming?: boolean;
    functionCalling?: boolean;
    vision?: boolean;
  };
  /** 费用信息 */
  cost?: {
    input: number;  // 每1K tokens的价格
    output: number;
  };
}

/**
 * OpenAI 模型规格 - 2024年最新数据
 */
export const OPENAI_MODEL_SPECS: ModelSpec[] = [
  {
    id: "o1-preview",
    name: "o1 preview",
    provider: { id: "openai", name: "OpenAI" },
    maxTokens: { input: 128000, output: 32768 },
    lastUpdated: "2024-12-01",
    source: "manual",
    capabilities: {
      streaming: false,
      functionCalling: false,
    },
    cost: { input: 15.0, output: 60.0 }
  },
  {
    id: "o1-mini",
    name: "o1 mini",
    provider: { id: "openai", name: "OpenAI" },
    maxTokens: { input: 128000, output: 65536 },
    lastUpdated: "2024-12-01",
    source: "manual",
    capabilities: {
      streaming: false,
      functionCalling: false,
    },
    cost: { input: 3.0, output: 12.0 }
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: { id: "openai", name: "OpenAI" },
    maxTokens: { input: 128000, output: 16384 },
    lastUpdated: "2024-12-01",
    source: "manual",
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    cost: { input: 2.5, output: 10.0 }
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o mini",
    provider: { id: "openai", name: "OpenAI" },
    maxTokens: { input: 128000, output: 16384 },
    lastUpdated: "2024-12-01",
    source: "manual",
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    cost: { input: 0.15, output: 0.6 }
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: { id: "openai", name: "OpenAI" },
    maxTokens: { input: 128000, output: 4096 },
    lastUpdated: "2024-12-01",
    source: "manual",
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    cost: { input: 10.0, output: 30.0 }
  },
  {
    id: "gpt-4",
    name: "GPT-4",
    provider: { id: "openai", name: "OpenAI" },
    maxTokens: { input: 8192, output: 4096 },
    lastUpdated: "2024-12-01",
    source: "manual",
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
    cost: { input: 30.0, output: 60.0 }
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: { id: "openai", name: "OpenAI" },
    maxTokens: { input: 16385, output: 4096 },
    lastUpdated: "2024-12-01",
    source: "manual",
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
    cost: { input: 0.5, output: 1.5 }
  }
];

/**
 * Gemini 模型规格 - 2025年最新数据
 */
export const GEMINI_MODEL_SPECS: ModelSpec[] = [
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: { id: "gemini", name: "Google Gemini" },
    maxTokens: { input: 1048576, output: 65536 },
    lastUpdated: "2025-06-01",
    source: "manual",
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    }
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: { id: "gemini", name: "Google Gemini" },
    maxTokens: { input: 1048576, output: 65536 },
    lastUpdated: "2025-06-01",
    source: "manual",
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    }
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash-Lite",
    provider: { id: "gemini", name: "Google Gemini" },
    maxTokens: { input: 1048576, output: 65536 },
    lastUpdated: "2025-07-01",
    source: "manual",
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    }
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: { id: "gemini", name: "Google Gemini" },
    maxTokens: { input: 1048576, output: 8192 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    }
  },
  {
    id: "gemini-2.0-flash-preview-image-generation",
    name: "Gemini 2.0 Flash 预览版图片生成",
    provider: { id: "gemini", name: "Google Gemini" },
    maxTokens: { input: 1048576, output: 8192 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    }
  },
  {
    id: "gemini-2.0-flash-lite",
    name: "Gemini 2.0 Flash-Lite",
    provider: { id: "gemini", name: "Google Gemini" },
    maxTokens: { input: 1048576, output: 8192 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    }
  },
  {
    id: "gemini-2.0-flash-live-001",
    name: "Gemini 2.0 Flash Live",
    provider: { id: "gemini", name: "Google Gemini" },
    maxTokens: { input: 1048576, output: 8192 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    }
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: { id: "gemini", name: "Google Gemini" },
    maxTokens: { input: 1048576, output: 8192 },
    lastUpdated: "2024-09-01",
    source: "manual",
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    }
  },
  {
    id: "gemini-1.5-flash-8b",
    name: "Gemini 1.5 Flash-8B",
    provider: { id: "gemini", name: "Google Gemini" },
    maxTokens: { input: 1048576, output: 8192 },
    lastUpdated: "2024-10-01",
    source: "manual",
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    }
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: { id: "gemini", name: "Google Gemini" },
    maxTokens: { input: 2097152, output: 8192 },
    lastUpdated: "2024-09-01",
    source: "manual",
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    }
  }
];

/**
 * 其他提供商的模型规格
 */
export const ANTHROPIC_MODEL_SPECS: ModelSpec[] = [
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    provider: { id: "anthropic", name: "Anthropic" },
    maxTokens: { input: 200000, output: 4096 },
    lastUpdated: "2024-12-01",
    source: "manual",
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    cost: { input: 15.0, output: 75.0 }
  },
  {
    id: "claude-3-sonnet-20240229",
    name: "Claude 3 Sonnet",
    provider: { id: "anthropic", name: "Anthropic" },
    maxTokens: { input: 200000, output: 4096 },
    lastUpdated: "2024-12-01",
    source: "manual",
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    cost: { input: 3.0, output: 15.0 }
  },
  {
    id: "claude-3-haiku-20240229",
    name: "Claude 3 Haiku",
    provider: { id: "anthropic", name: "Anthropic" },
    maxTokens: { input: 200000, output: 4096 },
    lastUpdated: "2024-12-01",
    source: "manual",
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    cost: { input: 0.25, output: 1.25 }
  }
];

/**
 * 合并所有模型规格
 */
export const ALL_MODEL_SPECS: ModelSpec[] = [
  ...OPENAI_MODEL_SPECS,
  ...ANTHROPIC_MODEL_SPECS,
  ...GEMINI_MODEL_SPECS,
];

/**
 * 根据模型ID查找模型规格
 */
export function findModelSpec(modelId: string): ModelSpec | undefined {
  return ALL_MODEL_SPECS.find(spec => spec.id === modelId);
}

/**
 * 根据提供商ID获取模型规格列表
 */
export function getModelSpecsByProvider(providerId: string): ModelSpec[] {
  return ALL_MODEL_SPECS.filter(spec => spec.provider.id === providerId);
}

/**
 * 获取默认的token限制（当找不到具体模型规格时使用）
 */
export function getDefaultTokenLimits(providerId: string): { input: number; output: number } {
  const defaults: Record<string, { input: number; output: number }> = {
    openai: { input: 16385, output: 4096 },
    anthropic: { input: 200000, output: 4096 },
    github: { input: 128000, output: 16384 },
    zhipu: { input: 128000, output: 4096 },
    dashscope: { input: 32000, output: 2000 },
    doubao: { input: 32000, output: 4096 },
    deepseek: { input: 32000, output: 4096 },
    gemini: { input: 1000000, output: 8192 },
    default: { input: 8192, output: 4096 }
  };

  return defaults[providerId] || defaults.default;
}