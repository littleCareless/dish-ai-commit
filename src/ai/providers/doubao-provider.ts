import { BaseOpenAIProvider } from "./base-openai-provider";
import { ConfigurationManager } from "../../config/configuration-manager";
import { AIModel } from "../types";

/**
 * 豆包AI支持的模型配置列表
 * 包含Lite和Pro系列的不同规格模型
 */
const doubaoModels: AIModel[] = [
  {
    id: "doubao-lite-4k",
    name: "豆包 Lite 4K - 入门级: 适用于日常对话和简单创作任务",
    maxTokens: { input: 4096, output: 4096 },
    provider: { id: "doubao", name: "豆包 AI" },
    cost: {
      input: 0.0003,
      output: 0.0006,
    },
  },
  {
    id: "doubao-lite-character",
    name: "豆包 Lite Character - 角色扮演: 为角色对话和剧本创作优化",
    maxTokens: { input: 4096, output: 4096 },
    provider: { id: "doubao", name: "豆包 AI" },
    cost: {
      input: 0.0003,
      output: 0.0006,
    },
  },
  {
    id: "doubao-lite-32k",
    name: "豆包 Lite 32K - 长文本基础版: 支持较长文本处理",
    maxTokens: { input: 32768, output: 4096 },
    provider: { id: "doubao", name: "豆包 AI" },
    cost: {
      input: 0.0003,
      output: 0.0006,
    },
  },
  {
    id: "doubao-lite-128k",
    name: "豆包 Lite 128K - 超长文本基础版: 支持超长文本理解和生成",
    maxTokens: { input: 131072, output: 4096 },
    provider: { id: "doubao", name: "豆包 AI" },
    cost: {
      input: 0.0008,
      output: 0.001,
    },
  },
  {
    id: "doubao-pro-4k",
    name: "豆包 Pro 4K - 专业版: 更强的理解能力和生成质量",
    maxTokens: { input: 4096, output: 4096 },
    provider: { id: "doubao", name: "豆包 AI" },
    default: true,
    cost: {
      input: 0.0008,
      output: 0.002,
    },
  },
  {
    id: "doubao-pro-character",
    name: "豆包 Pro Character - 专业角色版: 高质量的角色扮演和对话生成",
    maxTokens: { input: 4096, output: 4096 },
    provider: { id: "doubao", name: "豆包 AI" },
    cost: {
      input: 0.0008,
      output: 0.002,
    },
  },
  {
    id: "doubao-pro-functioncall",
    name: "豆包 Pro Function Call - 函数调用版: 支持复杂的函数调用和工具使用",
    maxTokens: { input: 4096, output: 4096 },
    provider: { id: "doubao", name: "豆包 AI" },
    capabilities: {
      functionCalling: true,
    },
    cost: {
      input: 0.0008,
      output: 0.002,
    },
  },
  {
    id: "doubao-pro-32k",
    name: "豆包 Pro 32K - 长文本专业版: 高质量的长文本处理能力",
    maxTokens: { input: 32768, output: 4096 },
    provider: { id: "doubao", name: "豆包 AI" },
    cost: {
      input: 0.0008,
      output: 0.002,
    },
  },
  {
    id: "doubao-pro-128k",
    name: "豆包 Pro 128K - 超长文本专业版: 处理大规模文档和知识库",
    maxTokens: { input: 131072, output: 4096 },
    provider: { id: "doubao", name: "豆包 AI" },
    cost: {
      input: 0.005,
      output: 0.009,
    },
  },
  {
    id: "doubao-pro-256k",
    name: "豆包 Pro 256K - 特大文本专业版: 支持超大规模文本分析和生成",
    maxTokens: { input: 262144, output: 4096 },
    provider: { id: "doubao", name: "豆包 AI" },
    cost: {
      input: 0.005,
      output: 0.009,
    },
  },
  {
    id: "doubao-vision-pro-32k",
    name: "豆包 Vision Pro 32K - 多模态版: 支持图像理解和文本生成",
    maxTokens: { input: 32768, output: 4096 },
    provider: { id: "doubao", name: "豆包 AI" },
    cost: {
      input: 0.02,
      output: 0.02,
    },
  },
];

/**
 * 豆包AI服务提供者实现类
 * 继承自BaseOpenAIProvider，提供对豆包AI API的访问能力
 */
export class DoubaoProvider extends BaseOpenAIProvider {
  /**
   * 创建豆包AI提供者实例
   * 从配置管理器获取API密钥，初始化基类配置
   */
  constructor() {
    const configManager = ConfigurationManager.getInstance();
    super({
      apiKey: configManager.getConfig("PROVIDERS_DOUBAO_APIKEY"),
      baseURL: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
      providerId: "doubao",
      providerName: "豆包 AI",
      models: doubaoModels,
      defaultModel: "doubao-pro-4k",
    });
  }

  /**
   * 检查豆包AI服务是否可用
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
   * @returns 返回预定义的模型ID列表
   */
  async refreshModels(): Promise<string[]> {
    return Promise.resolve(doubaoModels.map((m) => m.id));
  }
}
