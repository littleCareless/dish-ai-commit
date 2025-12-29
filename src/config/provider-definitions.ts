/**
 * 中心化的 AI 提供商定义文件
 * 这是系统中所有提供商标识符的单一来源
 * 自动生成所有需要的格式和映射表
 *
 * 📝 命名约定：
 * - id: 小写，连字符分隔（用于 webview 和规范化目标）
 * - displayName: 大小写混合，空格分隔（用于配置 schema）
 * - enumKey: 大写，下划线分隔（用于枚举生成）
 * - aliases: 其他可接受的格式
 */

export interface ProviderDefinition {
  /** 标准小写标识符 */
  id: string;
  /** 显示名称（用于配置和 UI）*/
  displayName: string;
  /** 枚举键名（大写下划线） */
  enumKey: string;
  /** 别名列表，支持多种格式 */
  aliases?: string[];
  /** 是否为自定义提供商 */
  custom?: boolean;
}

/**
 * 所有支持的 AI 提供商定义
 * 所有提供商标识符都应该从这里派生
 */
export const PROVIDER_DEFINITIONS: Record<string, ProviderDefinition> = {
  // === 第一方提供商 ===
  openai: {
    id: "openai",
    displayName: "OpenAI",
    enumKey: "OPENAI",
    aliases: ["open-ai"],
  },
  anthropic: {
    id: "anthropic",
    displayName: "Anthropic",
    enumKey: "ANTHROPIC",
  },
  github: {
    id: "github",
    displayName: "GitHub",
    enumKey: "GITHUB",
  },
  gemini: {
    id: "gemini",
    displayName: "Gemini",
    enumKey: "GEMINI",
  },
  mistral: {
    id: "mistral",
    displayName: "Mistral",
    enumKey: "MISTRAL",
  },
  "google-ai": {
    id: "google-ai",
    displayName: "GoogleAI",
    enumKey: "GOOGLE_AI",
    aliases: ["google_ai", "googleai"],
  },
  deepseek: {
    id: "deepseek",
    displayName: "Deepseek",
    enumKey: "DEEPSEEK",
  },
  zhipu: {
    id: "zhipu",
    displayName: "Zhipu",
    enumKey: "ZHIPU",
  },
  perplexity: {
    id: "perplexity",
    displayName: "Perplexity",
    enumKey: "PERPLEXITY",
  },
  xai: {
    id: "xai",
    displayName: "XAI",
    enumKey: "XAI",
  },
  xiaomi: {
    id: "xiaomi",
    displayName: "Xiaomi",
    enumKey: "XIAOMI",
    aliases: ["mimo", "xiaomi-mimo"],
  },

  // === 云服务提供商 ===
  iflow: {
    id: "iflow",
    displayName: "Alibaba iFlow",
    enumKey: "IFLOW",
    aliases: ["ali-iflow"],
  },
  volcano: {
    id: "volcano",
    displayName: "ByteDance Volcano",
    enumKey: "VOLCANO",
    aliases: ["volcengine", "ark"],
  },
  modelscope: {
    id: "modelscope",
    displayName: "ModelScope",
    enumKey: "MODELSCOPE",
  },
  kat: {
    id: "kat",
    displayName: "Kuaishou KAT",
    enumKey: "KAT",
    aliases: ["kuaishou-kat"],
  },
  longcat: {
    id: "longcat",
    displayName: "Meituan LongCat",
    enumKey: "LONGCAT",
  },
  qiniu: {
    id: "qiniu",
    displayName: "Qiniu AI",
    enumKey: "QINIU",
  },
  nvidia: {
    id: "nvidia",
    displayName: "NVIDIA NIM",
    enumKey: "NVIDIA",
    aliases: ["nvidia-nim"],
  },
  cerebras: {
    id: "cerebras",
    displayName: "Cerebras",
    enumKey: "CEREBRAS",
  },
  codebuddy: {
    id: "codebuddy",
    displayName: "Tencent CodeBuddy",
    enumKey: "CODEBUDDY",
  },
  codeflicker: {
    id: "codeflicker",
    displayName: "Kuaishou CodeFlicker",
    enumKey: "CODEFLICKER",
  },
  tongyi: {
    id: "tongyi",
    displayName: "Tongyi Lingma",
    enumKey: "TONGYI",
    aliases: ["tongyi-lingma"],
  },
  "azure-openai": {
    id: "azure-openai",
    displayName: "Azure OpenAI",
    enumKey: "AZURE_OPENAI",
    aliases: ["azure_openai", "azureopenai"],
  },
  "baidu-qianfan": {
    id: "baidu-qianfan",
    displayName: "Baidu Qianfan",
    enumKey: "BAIDU_QIANFAN",
    aliases: ["baidu_qianfan", "baiduqianfan"],
  },
  dashscope: {
    id: "dashscope",
    displayName: "DashScope",
    enumKey: "DASHSCOPE",
  },
  doubao: {
    id: "doubao",
    displayName: "Doubao",
    enumKey: "DOUBAO",
  },
  cloudflare: {
    id: "cloudflare",
    displayName: "Cloudflare",
    enumKey: "CLOUDFLARE",
    aliases: [
      "cloudflare-workersai",
      "cloudflare_workersai",
      "cloudflare-workers-ai",
    ],
  },
  vertexai: {
    id: "vertexai",
    displayName: "VertexAI",
    enumKey: "VERTEXAI",
    aliases: ["vertex-ai", "vertex_ai"],
  },

  // === 聚合服务 ===
  openrouter: {
    id: "openrouter",
    displayName: "OpenRouter",
    enumKey: "OPENROUTER",
    aliases: ["open-router", "open_router"],
  },
  groq: {
    id: "groq",
    displayName: "Groq",
    enumKey: "GROQ",
  },
  premai: {
    id: "premai",
    displayName: "PremAI",
    enumKey: "PREMAI",
  },
  together: {
    id: "together",
    displayName: "Together",
    enumKey: "TOGETHER",
  },
  siliconflow: {
    id: "siliconflow",
    displayName: "Siliconflow",
    enumKey: "SILICONFLOW",
    aliases: ["silicon-flow", "silicon_flow"],
  },

  // === 本地/自托管 ===
  ollama: {
    id: "ollama",
    displayName: "Ollama",
    enumKey: "OLLAMA",
  },
  lmstudio: {
    id: "lmstudio",
    displayName: "LMStudio",
    enumKey: "LMSTUDIO",
    aliases: ["lm-studio", "lm_studio"],
  },
  vscode: {
    id: "vscode",
    displayName: "VS Code Provided",
    enumKey: "VS_CODE_PROVIDED",
    aliases: ["vs-code", "vs_code", "vs-code-provided", "vs_code_provided"],
  },

  // === 兼容层 ===
  "openai-compatible": {
    id: "openai-compatible",
    displayName: "OpenAI Compatible",
    enumKey: "OPENAI_COMPATIBLE",
    aliases: ["openai_compatible", "openaicompatible"],
    custom: true,
  },
} as const;

/**
 * 生成小写 ID 到定义的映射
 */
export function getProviderDefinition(
  providerId: string
): ProviderDefinition | undefined {
  return PROVIDER_DEFINITIONS[providerId as keyof typeof PROVIDER_DEFINITIONS];
}

/**
 * 生成规范化映射表（支持所有别名）
 * 例如：'vs-code' -> 'vs_code_provided'
 */
export function generateNormalizationMap(): Record<string, string> {
  const map: Record<string, string> = {};

  for (const [, def] of Object.entries(PROVIDER_DEFINITIONS)) {
    // 主标识符（小写下划线格式作为规范格式）
    const canonical = def.enumKey.toLowerCase();
    map[canonical] = canonical;
    map[def.id] = canonical;

    // 别名
    if (def.aliases) {
      for (const alias of def.aliases) {
        const normalized = alias.toLowerCase().replace(/\s+/g, "_");
        map[normalized] = canonical;
      }
    }

    // 大写下划线格式
    map[def.enumKey] = canonical;
    map[def.enumKey.toLowerCase()] = canonical;
  }

  return map;
}

/**
 * 获取所有提供商 ID 列表（小写格式）
 */
export function getAllProviderIds(): string[] {
  return Object.keys(PROVIDER_DEFINITIONS);
}

/**
 * 获取所有提供商显示名称列表
 */
export function getAllProviderDisplayNames(): string[] {
  return Object.values(PROVIDER_DEFINITIONS).map((def) => def.displayName);
}

/**
 * 从小写 ID 获取显示名称
 */
export function getProviderDisplayName(providerId: string): string | undefined {
  const def = getProviderDefinition(providerId);
  return def?.displayName;
}

/**
 * 从小写 ID 获取枚举键
 */
export function getProviderEnumKey(providerId: string): string | undefined {
  const def = getProviderDefinition(providerId);
  return def?.enumKey;
}

/**
 * 规范化提供商类型标识符
 * 处理多种格式，返回规范格式（大写下划线）
 * 示例：
 *   'vscode' -> 'VS_CODE_PROVIDED'
 *   'vs-code' -> 'VS_CODE_PROVIDED'
 *   'VS Code Provided' -> 'VS_CODE_PROVIDED'
 */
export function normalizeProviderType(type: string): string {
  if (!type) {
    return type;
  }

  const normalized = type.toLowerCase().replace(/\s+/g, "_");
  const normalizationMap = generateNormalizationMap();
  const canonical = normalizationMap[normalized];

  if (!canonical) {
    // 如果找不到映射，返回原始值转换为大写下划线
    return normalized.toUpperCase();
  }

  return canonical.toUpperCase();
}

/**
 * 根据枚举键查找提供商定义
 */
export function getProviderByEnumKey(
  enumKey: string
): ProviderDefinition | undefined {
  for (const def of Object.values(PROVIDER_DEFINITIONS)) {
    if (def.enumKey === enumKey) {
      return def;
    }
  }
  return undefined;
}
