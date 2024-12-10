import { BaseOpenAIProvider } from "./BaseOpenAIProvider";
import { ConfigurationManager } from "../../config/ConfigurationManager";
import { AIModel } from "../types";

const dashscopeModels: AIModel[] = [
  {
    id: "qwen-max",
    name: "Qwen Max (稳定版) - 旗舰模型: 强大的理解和生成能力",
    maxTokens: { input: 30720, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
    cost: {
      input: 0.02,
      output: 0.06,
    },
  },
  {
    id: "qwen-max-latest",
    name: "Qwen Max (最新版) - 旗舰实验版: 最新的模型改进和优化",
    maxTokens: { input: 30720, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
    cost: {
      input: 0.02,
      output: 0.06,
    },
  },
  {
    id: "qwen-plus",
    name: "Qwen Plus (稳定版) - 增强版: 性能与成本的最佳平衡",
    maxTokens: { input: 129024, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
    cost: {
      input: 0.0008,
      output: 0.002,
    },
  },
  {
    id: "qwen-plus-latest",
    name: "Qwen Plus (最新版) - 增强实验版: 新特性和优化的测试版本",
    maxTokens: { input: 129024, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
    cost: {
      input: 0.0008,
      output: 0.002,
    },
  },
  {
    id: "qwen-turbo",
    name: "Qwen Turbo (稳定版) - 快速版: 高性价比的日常对话模型",
    maxTokens: { input: 129024, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    default: true,
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
    cost: {
      input: 0.0003,
      output: 0.0006,
    },
  },
  {
    id: "qwen-turbo-latest",
    name: "Qwen Turbo (最新版) - 快速实验版: 优化推理速度的最新版本",
    maxTokens: { input: 1000000, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
    cost: {
      input: 0.0003,
      output: 0.0006,
    },
  },
  {
    id: "qwen-coder-turbo",
    name: "Qwen Coder Turbo (稳定版) - 编程专用: 代码生成和分析的专业模型",
    maxTokens: { input: 129024, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
    cost: {
      input: 0.002,
      output: 0.006,
    },
  },
  {
    id: "qwen-coder-turbo-latest",
    name: "Qwen Coder Turbo (最新版) - 编程实验版: 最新的代码辅助功能",
    maxTokens: { input: 129024, output: 8192 },
    provider: { id: "dashscope", name: "DashScope" },
    capabilities: {
      streaming: true,
      functionCalling: true,
    },
    cost: {
      input: 0.002,
      output: 0.006,
    },
  },
];

export class DashScopeProvider extends BaseOpenAIProvider {
  constructor() {
    const configManager = ConfigurationManager.getInstance();
    super({
      apiKey: configManager.getConfig<string>("DASHSCOPE_API_KEY", false),
      baseURL: "https://api.dashscope.com/v1/services/chat/completions",
      providerId: "dashscope",
      providerName: "DashScope",
      models: dashscopeModels,
      defaultModel: "qwen-turbo",
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      return !!this.config.apiKey;
    } catch {
      return false;
    }
  }

  async refreshModels(): Promise<string[]> {
    return Promise.resolve(dashscopeModels.map((m) => m.id));
  }
}