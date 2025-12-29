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
  source: "api" | "api-proxy" | "manual" | "fallback";
  /** 模型能力 */
  capabilities?: {
    streaming?: boolean;
    functionCalling?: boolean;
    vision?: boolean;
  };
  /** 费用信息 */
  cost?: {
    input: number; // 每1K tokens的价格
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
    cost: { input: 15.0, output: 60.0 },
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
    cost: { input: 3.0, output: 12.0 },
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
    cost: { input: 2.5, output: 10.0 },
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
    cost: { input: 0.15, output: 0.6 },
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
    cost: { input: 10.0, output: 30.0 },
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
    cost: { input: 30.0, output: 60.0 },
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
    cost: { input: 0.5, output: 1.5 },
  },
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
    },
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
    },
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
    },
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
    },
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
    },
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
    },
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
    },
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
    },
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
    },
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
    },
  },
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
    cost: { input: 15.0, output: 75.0 },
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
    cost: { input: 3.0, output: 15.0 },
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
    cost: { input: 0.25, output: 1.25 },
  },
];

/**
 * iFlow 模型规格
 */
export const IFLOW_MODEL_SPECS: ModelSpec[] = [
  {
    id: "kimi-k2-instruct-0905",
    name: "Kimi K2 Instruct",
    provider: { id: "iflow", name: "Alibaba iFlow" },
    maxTokens: { input: 128000, output: 8192 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true, functionCalling: false },
  },
  {
    id: "glm-4.6",
    name: "GLM-4.6",
    provider: { id: "iflow", name: "Alibaba iFlow" },
    maxTokens: { input: 128000, output: 4096 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true, functionCalling: true },
  },
  {
    id: "deepseek-v3.2-exp",
    name: "DeepSeek V3.2 Exp",
    provider: { id: "iflow", name: "Alibaba iFlow" },
    maxTokens: { input: 128000, output: 4096 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true, functionCalling: true },
  },
  {
    id: "qwen3-coder-plus",
    name: "Qwen3 Coder Plus",
    provider: { id: "iflow", name: "Alibaba iFlow" },
    maxTokens: { input: 128000, output: 8192 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true, functionCalling: true },
  },
];

/**
 * Volcano 模型规格
 */
export const VOLCANO_MODEL_SPECS: ModelSpec[] = [
  {
    id: "doubao-pro",
    name: "Doubao Pro",
    provider: { id: "volcano", name: "ByteDance Volcano" },
    maxTokens: { input: 32000, output: 4096 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true, functionCalling: true },
  },
  {
    id: "deepseek-v3.2",
    name: "DeepSeek V3.2",
    provider: { id: "volcano", name: "ByteDance Volcano" },
    maxTokens: { input: 32000, output: 4096 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true, functionCalling: true },
  },
];

/**
 * ModelScope 模型规格
 */
export const MODELSCOPE_MODEL_SPECS: ModelSpec[] = [
  {
    id: "deepseek-ai/DeepSeek-R1-0528",
    name: "DeepSeek R1",
    provider: { id: "modelscope", name: "ModelScope" },
    maxTokens: { input: 32000, output: 4096 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true },
  },
  {
    id: "deepseek-ai/DeepSeek-V3.1",
    name: "DeepSeek V3.1",
    provider: { id: "modelscope", name: "ModelScope" },
    maxTokens: { input: 32000, output: 4096 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true },
  },
];

/**
 * KAT 模型规格
 */
export const KAT_MODEL_SPECS: ModelSpec[] = [
  {
    id: "KAT-Coder-Pro-V1",
    name: "KAT Coder Pro V1",
    provider: { id: "kat", name: "Kuaishou KAT" },
    maxTokens: { input: 16384, output: 4096 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true },
  },
  {
    id: "KAT-Coder-Air-V1",
    name: "KAT Coder Air V1",
    provider: { id: "kat", name: "Kuaishou KAT" },
    maxTokens: { input: 16384, output: 4096 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true },
  },
];

/**
 * LongCat 模型规格
 */
export const LONGCAT_MODEL_SPECS: ModelSpec[] = [
  {
    id: "longcat-generic",
    name: "LongCat Generic",
    provider: { id: "longcat", name: "Meituan LongCat" },
    maxTokens: { input: 8192, output: 2048 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true },
  },
];

/**
 * Qiniu 模型规格
 */
export const QINIU_MODEL_SPECS: ModelSpec[] = [
  {
    id: "openai-compatible",
    name: "Qiniu OpenAI Compatible",
    provider: { id: "qiniu", name: "Qiniu AI" },
    maxTokens: { input: 32000, output: 4096 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true },
  },
];

/**
 * NVIDIA 模型规格
 */
export const NVIDIA_MODEL_SPECS: ModelSpec[] = [
  {
    id: "deepseek-v3.2",
    name: "DeepSeek V3.2",
    provider: { id: "nvidia", name: "NVIDIA NIM" },
    maxTokens: { input: 32000, output: 4096 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true },
  },
  {
    id: "mistral-large",
    name: "Mistral Large",
    provider: { id: "nvidia", name: "NVIDIA NIM" },
    maxTokens: { input: 32000, output: 4096 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true },
  },
];

/**
 * Cerebras 模型规格
 */
export const CEREBRAS_MODEL_SPECS: ModelSpec[] = [
  {
    id: "glm-4.6",
    name: "GLM-4.6",
    provider: { id: "cerebras", name: "Cerebras" },
    maxTokens: { input: 32000, output: 4096 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true },
  },
  {
    id: "llama-3.1-70b",
    name: "Llama 3.1 70B",
    provider: { id: "cerebras", name: "Cerebras" },
    maxTokens: { input: 8192, output: 4096 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true },
  },
];

/**
 * CodeBuddy 模型规格
 */
export const CODEBUDDY_MODEL_SPECS: ModelSpec[] = [
  {
    id: "glm-4.6",
    name: "GLM-4.6",
    provider: { id: "codebuddy", name: "Tencent CodeBuddy" },
    maxTokens: { input: 32000, output: 4096 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true },
  },
  {
    id: "deepseek-v3.1-terminus",
    name: "DeepSeek V3.1 Terminus",
    provider: { id: "codebuddy", name: "Tencent CodeBuddy" },
    maxTokens: { input: 32000, output: 4096 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true },
  },
];

/**
 * CodeFlicker 模型规格
 */
export const CODEFLICKER_MODEL_SPECS: ModelSpec[] = [
  {
    id: "kimi-k2-0905",
    name: "Kimi K2 0905",
    provider: { id: "codeflicker", name: "Kuaishou CodeFlicker" },
    maxTokens: { input: 32000, output: 4096 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true },
  },
  {
    id: "kat-coder-pro",
    name: "KAT Coder Pro",
    provider: { id: "codeflicker", name: "Kuaishou CodeFlicker" },
    maxTokens: { input: 32000, output: 4096 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true },
  },
];

/**
 * Tongyi 模型规格
 */
export const TONGYI_MODEL_SPECS: ModelSpec[] = [
  {
    id: "qwen-max",
    name: "Qwen Max",
    provider: { id: "tongyi", name: "Tongyi Lingma" },
    maxTokens: { input: 32000, output: 4096 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true },
  },
  {
    id: "qwen-plus",
    name: "Qwen Plus",
    provider: { id: "tongyi", name: "Tongyi Lingma" },
    maxTokens: { input: 32000, output: 4096 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true },
  },
  {
    id: "qwen-turbo",
    name: "Qwen Turbo",
    provider: { id: "tongyi", name: "Tongyi Lingma" },
    maxTokens: { input: 32000, output: 4096 },
    lastUpdated: "2025-02-01",
    source: "manual",
    capabilities: { streaming: true },
  },
];

/**
 * 合并所有模型规格
 */
export const ALL_MODEL_SPECS: ModelSpec[] = [
  ...OPENAI_MODEL_SPECS,
  ...ANTHROPIC_MODEL_SPECS,
  ...GEMINI_MODEL_SPECS,
  ...IFLOW_MODEL_SPECS,
  ...VOLCANO_MODEL_SPECS,
  ...MODELSCOPE_MODEL_SPECS,
  ...KAT_MODEL_SPECS,
  ...LONGCAT_MODEL_SPECS,
  ...QINIU_MODEL_SPECS,
  ...NVIDIA_MODEL_SPECS,
  ...CEREBRAS_MODEL_SPECS,
  ...CODEBUDDY_MODEL_SPECS,
  ...CODEFLICKER_MODEL_SPECS,
  ...TONGYI_MODEL_SPECS,
];

/**
 * 根据模型ID查找模型规格
 */
export function findModelSpec(modelId: string): ModelSpec | undefined {
  return ALL_MODEL_SPECS.find((spec) => spec.id === modelId);
}

/**
 * 根据提供商ID获取模型规格列表
 */
export function getModelSpecsByProvider(providerId: string): ModelSpec[] {
  return ALL_MODEL_SPECS.filter((spec) => spec.provider.id === providerId);
}

/**
 * 获取默认的token限制（当找不到具体模型规格时使用）
 */
export function getDefaultTokenLimits(providerId: string): {
  input: number;
  output: number;
} {
  const defaults: Record<string, { input: number; output: number }> = {
    openai: { input: 16385, output: 4096 },
    anthropic: { input: 200000, output: 4096 },
    github: { input: 128000, output: 16384 },
    zhipu: { input: 128000, output: 4096 },
    dashscope: { input: 32000, output: 2000 },
    doubao: { input: 32000, output: 4096 },
    deepseek: { input: 32000, output: 4096 },
    gemini: { input: 1000000, output: 8192 },
    iflow: { input: 128000, output: 4096 },
    volcano: { input: 32000, output: 4096 },
    modelscope: { input: 32000, output: 4096 },
    kat: { input: 16384, output: 4096 },
    longcat: { input: 8192, output: 2048 },
    qiniu: { input: 32000, output: 4096 },
    nvidia: { input: 32000, output: 4096 },
    cerebras: { input: 32000, output: 4096 },
    codebuddy: { input: 32000, output: 4096 },
    codeflicker: { input: 32000, output: 4096 },
    tongyi: { input: 32000, output: 4096 },
    default: { input: 8192, output: 4096 },
  };

  return defaults[providerId] || defaults.default;
}
