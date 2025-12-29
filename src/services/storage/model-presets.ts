/**
 * 预设模型数据
 * 包含常见但API无法获取准确信息的模型预设
 */

import { CustomModelInfo, CustomModelRegistry } from "@shared/types/model-custom";

/**
 * 预设的自定义模型列表
 * 这些模型在实际使用中经常遇到API无法获取maxTokens等问题
 */
export const PRESET_MODELS: CustomModelInfo[] = [
  // ===== DeepSeek 系列 =====
  {
    id: "deepseek-chat",
    providerId: "deepseek",
    modelName: "DeepSeek V2.5",
    maxTokens: { input: 128000, output: 4096 },
    capabilities: { streaming: true, functionCalling: true, vision: false },
    pricing: { input: 1.0, output: 2.0 }, // 每1M tokens
    notes: "DeepSeek-V2.5 通用对话模型",
  },
  {
    id: "deepseek-coder",
    providerId: "deepseek",
    modelName: "DeepSeek Coder V2",
    maxTokens: { input: 128000, output: 4096 },
    capabilities: { streaming: true, functionCalling: true, vision: false },
    pricing: { input: 1.0, output: 2.0 },
    notes: "DeepSeek 代码专用模型",
  },
  {
    id: "deepseek-reasoner",
    providerId: "deepseek",
    modelName: "DeepSeek R1",
    maxTokens: { input: 64000, output: 8192 },
    capabilities: { streaming: true, functionCalling: false, vision: false },
    pricing: { input: 4.0, output: 16.0 },
    notes: "DeepSeek 推理模型，支持思维链",
  },

  // ===== Moonshot (Kimi) 系列 =====
  {
    id: "moonshot-v1-128k",
    providerId: "moonshot",
    modelName: "Kimi v1 128K",
    maxTokens: { input: 128000, output: 4096 },
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 1.2, output: 2.4 },
    notes: "Moonshot 128K 上下文模型",
  },
  {
    id: "moonshot-v1-8k",
    providerId: "moonshot",
    modelName: "Kimi v1 8K",
    maxTokens: { input: 8192, output: 2048 },
    capabilities: { streaming: true, functionCalling: true, vision: false },
    pricing: { input: 0.6, output: 1.2 },
    notes: "Moonshot 8K 快速响应模型",
  },
  {
    id: "moonshot-v1-32k",
    providerId: "moonshot",
    modelName: "Kimi v1 32K",
    maxTokens: { input: 32768, output: 4096 },
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 0.8, output: 1.6 },
    notes: "Moonshot 32K 平衡模型",
  },

  // ===== 智谱 AI (ZhiPu) 系列 =====
  {
    id: "glm-4",
    providerId: "zhipu",
    modelName: "GLM-4",
    maxTokens: { input: 128000, output: 4096 },
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 1.0, output: 1.0 },
    notes: "智谱清言最新通用模型",
  },
  {
    id: "glm-4-air",
    providerId: "zhipu",
    modelName: "GLM-4 Air",
    maxTokens: { input: 128000, output: 4096 },
    capabilities: { streaming: true, functionCalling: true, vision: false },
    pricing: { input: 0.5, output: 0.5 },
    notes: "智谱轻量级模型",
  },
  {
    id: "glm-4v",
    providerId: "zhipu",
    modelName: "GLM-4V",
    maxTokens: { input: 128000, output: 4096 },
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 1.5, output: 1.5 },
    notes: "智谱多模态视觉模型",
  },

  // ===== 字节豆包 (Doubao) 系列 =====
  {
    id: "doubao-pro-128k",
    providerId: "doubao",
    modelName: "Doubao Pro 128K",
    maxTokens: { input: 128000, output: 4096 },
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 0.8, output: 1.6 },
    notes: "豆包 Pro 大上下文模型",
  },
  {
    id: "doubao-lite-128k",
    providerId: "doubao",
    modelName: "Doubao Lite 128K",
    maxTokens: { input: 128000, output: 4096 },
    capabilities: { streaming: true, functionCalling: false, vision: false },
    pricing: { input: 0.3, output: 0.6 },
    notes: "豆包 Lite 经济型模型",
  },
  {
    id: "doubao-vision",
    providerId: "doubao",
    modelName: "Doubao Vision",
    maxTokens: { input: 32000, output: 4096 },
    capabilities: { streaming: true, functionCalling: false, vision: true },
    pricing: { input: 1.2, output: 2.4 },
    notes: "豆包 视觉理解模型",
  },

  // ===== 阿里通义千问 (Tongyi) 系列 =====
  {
    id: "qwen-max-128k",
    providerId: "tongyi",
    modelName: "Qwen Max 128K",
    maxTokens: { input: 128000, output: 8192 },
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 2.0, output: 6.0 },
    notes: "通义千问旗舰模型",
  },
  {
    id: "qwen-plus-128k",
    providerId: "tongyi",
    modelName: "Qwen Plus 128K",
    maxTokens: { input: 128000, output: 4096 },
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 0.8, output: 2.0 },
    notes: "通义千问平衡模型",
  },
  {
    id: "qwen-turbo-128k",
    providerId: "tongyi",
    modelName: "Qwen Turbo 128K",
    maxTokens: { input: 128000, output: 4096 },
    capabilities: { streaming: true, functionCalling: false, vision: false },
    pricing: { input: 0.3, output: 0.6 },
    notes: "通义千问快速模型",
  },
  {
    id: "qwen-vl-plus",
    providerId: "tongyi",
    modelName: "Qwen VL Plus",
    maxTokens: { input: 32000, output: 4096 },
    capabilities: { streaming: true, functionCalling: false, vision: true },
    pricing: { input: 1.2, output: 2.4 },
    notes: "通义千问多模态模型",
  },

  // ===== 腾讯混元 (Hunyuan) 系列 =====
  {
    id: "hunyuan-pro",
    providerId: "hunyuan",
    modelName: "Hunyuan Pro",
    maxTokens: { input: 128000, output: 4096 },
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 1.5, output: 5.0 },
    notes: "腾讯混元旗舰模型",
  },
  {
    id: "hunyuan-standard",
    providerId: "hunyuan",
    modelName: "Hunyuan Standard",
    maxTokens: { input: 64000, output: 4096 },
    capabilities: { streaming: true, functionCalling: true, vision: false },
    pricing: { input: 0.8, output: 2.0 },
    notes: "腾讯混元标准模型",
  },

  // ===== 零一万物 (Yi) 系列 =====
  {
    id: "yi-large",
    providerId: "yiyi",
    modelName: "Yi Large",
    maxTokens: { input: 128000, output: 4096 },
    capabilities: { streaming: true, functionCalling: true, vision: false },
    pricing: { input: 1.2, output: 1.2 },
    notes: "零一万物大模型",
  },
  {
    id: "yi-medium",
    providerId: "yiyi",
    modelName: "Yi Medium",
    maxTokens: { input: 64000, output: 4096 },
    capabilities: { streaming: true, functionCalling: true, vision: false },
    pricing: { input: 0.5, output: 0.5 },
    notes: "零一万物中等模型",
  },

  // ===== MiniMax 系列 =====
  {
    id: "abab6.5",
    providerId: "minimax",
    modelName: "ABAB 6.5",
    maxTokens: { input: 200000, output: 4096 },
    capabilities: { streaming: true, functionCalling: true, vision: false },
    pricing: { input: 1.0, output: 1.0 },
    notes: "MiniMax ABAB 6.5 超长上下文",
  },
  {
    id: "abab6.5s",
    providerId: "minimax",
    modelName: "ABAB 6.5s",
    maxTokens: { input: 128000, output: 4096 },
    capabilities: { streaming: true, functionCalling: false, vision: false },
    pricing: { input: 0.5, output: 0.5 },
    notes: "MiniMax ABAB 6.5 快速版",
  },

  // ===== 百川智能 (Baichuan) 系列 =====
  {
    id: "baichuan4",
    providerId: "baichuan",
    modelName: "Baichuan 4",
    maxTokens: { input: 128000, output: 4096 },
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 1.5, output: 3.0 },
    notes: "百川智能最新模型",
  },
  {
    id: "baichuan3-turbo",
    providerId: "baichuan",
    modelName: "Baichuan 3 Turbo",
    maxTokens: { input: 64000, output: 4096 },
    capabilities: { streaming: true, functionCalling: true, vision: false },
    pricing: { input: 0.8, output: 1.6 },
    notes: "百川智能快速模型",
  },

  // ===== 阶跃星辰 (StepFun) 系列 =====
  {
    id: "step-1-128k",
    providerId: "stepfun",
    modelName: "Step-1 128K",
    maxTokens: { input: 128000, output: 4096 },
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 1.0, output: 2.0 },
    notes: "阶跃星辰通用模型",
  },
  {
    id: "step-1v-32k",
    providerId: "stepfun",
    modelName: "Step-1V 32K",
    maxTokens: { input: 32000, output: 4096 },
    capabilities: { streaming: true, functionCalling: false, vision: true },
    pricing: { input: 1.2, output: 2.4 },
    notes: "阶跃星辰多模态模型",
  },

  // ===== 讯飞星火 (Spark) 系列 =====
  {
    id: "spark-max-32k",
    providerId: "spark",
    modelName: "Spark Max 32K",
    maxTokens: { input: 32000, output: 4096 },
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 1.0, output: 2.0 },
    notes: "讯飞星火旗舰模型",
  },
  {
    id: "spark-lite",
    providerId: "spark",
    modelName: "Spark Lite",
    maxTokens: { input: 8192, output: 2048 },
    capabilities: { streaming: true, functionCalling: false, vision: false },
    pricing: { input: 0.3, output: 0.6 },
    notes: "讯飞星火轻量模型",
  },

  // ===== 鹏城实验室 (PengCheng) =====
  {
    id: "pengcheng-13b",
    providerId: "pengcheng",
    modelName: "PengCheng 13B",
    maxTokens: { input: 32000, output: 4096 },
    capabilities: { streaming: true, functionCalling: false, vision: false },
    pricing: { input: 0.2, output: 0.4 },
    notes: "鹏城实验室开源模型",
  },

  // ===== 本地部署模型 (Local) =====
  {
    id: "local-llama-3-70b",
    providerId: "local",
    modelName: "Llama 3 70B (Local)",
    maxTokens: { input: 8192, output: 2048 },
    capabilities: { streaming: true, functionCalling: false, vision: false },
    notes: "本地部署的 Llama 3 70B",
  },
  {
    id: "local-mixtral-8x7b",
    providerId: "local",
    modelName: "Mixtral 8x7B (Local)",
    maxTokens: { input: 32768, output: 4096 },
    capabilities: { streaming: true, functionCalling: false, vision: false },
    notes: "本地部署的 Mixtral 8x7B",
  },
  {
    id: "local-qwen-14b",
    providerId: "local",
    modelName: "Qwen 14B (Local)",
    maxTokens: { input: 32000, output: 4096 },
    capabilities: { streaming: true, functionCalling: false, vision: false },
    notes: "本地部署的通义千问 14B",
  },
];

/**
 * 获取预设模型的注册表格式
 */
export function getPresetRegistry(): CustomModelRegistry {
  const models: Record<string, CustomModelInfo> = {};

  PRESET_MODELS.forEach(model => {
    const key = `${model.providerId}_${model.id}`;
    models[key] = {
      ...model,
      lastUpdated: new Date().toISOString(),
    };
  });

  return {
    models,
    version: "1.0.0",
    lastSync: new Date().toISOString(),
  };
}
