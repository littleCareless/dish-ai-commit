import { BaseOpenAIProvider } from "@/ai/providers/base-openai-provider";
import { AIModel } from "@/ai/types";

/**
 * 阿里云DashScope通义千问模型配置列表
 * 定义了不同版本的Qwen模型及其参数设置
 * 参考文档: https://help.aliyun.com/zh/model-studio/getting-started/models
 */
const dashscopeModels: AIModel[] = [
  // === Qwen Max 系列 ===
  {
    id: "qwen3-max",
    name: "Qwen3 Max - 旗舰模型: Qwen3系列最强性能",
    maxTokens: { input: 32768, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    capabilities: {
      streaming: true,
      functionCalling: true,
      jsonMode: true,
    },
    cost: {
      input: 0.02,
      output: 0.06,
    },
  },
  {
    id: "qwen3-max-preview",
    name: "Qwen3 Max Preview - 旗舰预览版: 最新实验性功能",
    maxTokens: { input: 32768, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    capabilities: {
      streaming: true,
      functionCalling: true,
      jsonMode: true,
    },
    cost: {
      input: 0.02,
      output: 0.06,
    },
  },
  {
    id: "qwen-max",
    name: "Qwen Max (稳定版) - 强大的理解和生成能力",
    maxTokens: { input: 30720, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    capabilities: {
      streaming: true,
      functionCalling: true,
      jsonMode: true,
    },
    cost: {
      input: 0.02,
      output: 0.06,
    },
  },
  {
    id: "qwen-max-latest",
    name: "Qwen Max (最新版) - 最新的模型改进和优化",
    maxTokens: { input: 30720, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    capabilities: {
      streaming: true,
      functionCalling: true,
      jsonMode: true,
    },
    cost: {
      input: 0.02,
      output: 0.06,
    },
  },

  // === Qwen Plus 系列 ===
  {
    id: "qwen-plus",
    name: "Qwen Plus (稳定版) - 性能与成本的最佳平衡",
    maxTokens: { input: 129024, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    default: true,
    capabilities: {
      streaming: true,
      functionCalling: true,
      jsonMode: true,
    },
    cost: {
      input: 0.0008,
      output: 0.002,
    },
  },
  {
    id: "qwen-plus-latest",
    name: "Qwen Plus (最新版) - 超长上下文支持(100万token)",
    maxTokens: { input: 1000000, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    capabilities: {
      streaming: true,
      functionCalling: true,
      jsonMode: true,
    },
    cost: {
      input: 0.0008,
      output: 0.002,
    },
  },

  // === Qwen Flash 系列 ===
  {
    id: "qwen-flash",
    name: "Qwen Flash - 极速响应: 高性价比快速模型",
    maxTokens: { input: 32768, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    capabilities: {
      streaming: true,
      functionCalling: true,
      jsonMode: true,
    },
    cost: {
      input: 0.0001,
      output: 0.0002,
    },
  },
  {
    id: "qwen-flash-latest",
    name: "Qwen Flash (最新版) - 极速响应最新版",
    maxTokens: { input: 32768, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    capabilities: {
      streaming: true,
      functionCalling: true,
      jsonMode: true,
    },
    cost: {
      input: 0.0001,
      output: 0.0002,
    },
  },

  // === Qwen Turbo 系列 ===
  {
    id: "qwen-turbo",
    name: "Qwen Turbo (稳定版) - 高性价比的日常对话模型",
    maxTokens: { input: 129024, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    capabilities: {
      streaming: true,
      functionCalling: true,
      jsonMode: true,
    },
    cost: {
      input: 0.0003,
      output: 0.0006,
    },
  },
  {
    id: "qwen-turbo-latest",
    name: "Qwen Turbo (最新版) - 超长上下文支持(100万token)",
    maxTokens: { input: 1000000, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    capabilities: {
      streaming: true,
      functionCalling: true,
      jsonMode: true,
    },
    cost: {
      input: 0.0003,
      output: 0.0006,
    },
  },

  // === Qwen Coder 系列 ===
  {
    id: "qwen3-coder-plus",
    name: "Qwen3 Coder Plus - 代码生成增强版",
    maxTokens: { input: 131072, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    capabilities: {
      streaming: true,
      functionCalling: true,
      jsonMode: true,
    },
    cost: {
      input: 0.002,
      output: 0.006,
    },
  },
  {
    id: "qwen3-coder-flash",
    name: "Qwen3 Coder Flash - 代码生成快速版",
    maxTokens: { input: 131072, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    capabilities: {
      streaming: true,
      functionCalling: true,
      jsonMode: true,
    },
    cost: {
      input: 0.0005,
      output: 0.001,
    },
  },
  {
    id: "qwen-coder-plus",
    name: "Qwen Coder Plus - 代码生成专业模型",
    maxTokens: { input: 131072, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    capabilities: {
      streaming: true,
      functionCalling: true,
      jsonMode: true,
    },
    cost: {
      input: 0.002,
      output: 0.006,
    },
  },
  {
    id: "qwen-coder-turbo",
    name: "Qwen Coder Turbo - 代码生成快速模型",
    maxTokens: { input: 129024, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    capabilities: {
      streaming: true,
      functionCalling: true,
      jsonMode: true,
    },
    cost: {
      input: 0.002,
      output: 0.006,
    },
  },
];

/**
 * 阿里云DashScope服务提供者实现类
 * 继承自BaseOpenAIProvider，使用OpenAI兼容模式提供对通义千问API的访问能力
 */
export class DashScopeProvider extends BaseOpenAIProvider {
  /**
   * 创建DashScope提供者实例
   * 使用OpenAI兼容模式的base URL
   */
  constructor(config?: any) {
    super({
      apiKey: config?.apiKey,
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      providerId: "dashscope",
      providerName: "DashScope",
      models: dashscopeModels,
      defaultModel: "qwen-plus",
    });
  }

  /**
   * 检查DashScope服务是否可用
   * @returns 如果API密钥已配置返回true
   */
  async isAvailable(): Promise<boolean> {
    try {
      return !!this.config.apiKey;
    } catch {
      return false;
    }
  }

  /**
   * 刷新可用的模型列表
   * 调用OpenAI兼容接口验证连接并返回静态模型列表
   * @returns 返回预定义的模型ID列表
   */
  async refreshModels(): Promise<string[]> {
    try {
      // 通过调用 models.list() API 验证连接
      await this.openai.models.list();
      // 验证成功，返回静态模型列表
      return dashscopeModels.map((m) => m.id);
    } catch (error) {
      console.error("[DashScopeProvider] Failed to verify connection:", error);
      throw error;
    }
  }
}

