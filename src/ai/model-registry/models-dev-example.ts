/**
 * Models.dev 集成使用示例
 * 展示如何使用 Models.dev API 集成功能
 */

import {
  fetchModelsDevData,
  getModelsDevModel,
  getModelsDevProvider,
  searchModelsDevModels,
  getModelsDevStats,
  getRecommendedModels,
  startModelsDevScheduler,
  stopModelsDevScheduler,
  getModelsDevSchedulerStatus,
  ModelsDevIntegration,
} from "@/ai/model-registry";

/**
 * 示例 1: 手动拉取 Models.dev 数据
 */
export async function example1_ManualFetch() {
  console.log("=== 示例 1: 手动拉取 Models.dev 数据 ===");

  // 拉取最新数据
  const result = await fetchModelsDevData({
    forceRefresh: true, // 强制刷新
    cacheTTL: 24 * 60 * 60 * 1000, // 24小时缓存
  });

  console.log("拉取结果:", {
    成功: result.success,
    模型数量: result.modelCount,
    Provider数量: result.providerCount,
    新增模型: result.newModels.length,
    更新模型: result.updatedModels.length,
    错误: result.errors.length,
  });

  if (result.newModels.length > 0) {
    console.log("新增的模型:", result.newModels.slice(0, 5));
  }

  if (result.updatedModels.length > 0) {
    console.log("更新的模型:", result.updatedModels.slice(0, 5));
  }

  return result;
}

/**
 * 示例 2: 查询特定模型信息
 */
export async function example2_QueryModel() {
  console.log("\n=== 示例 2: 查询特定模型信息 ===");

  // 查询 GPT-4o 模型
  const model = getModelsDevModel("gpt-4o");
  if (model) {
    console.log("模型信息:", {
      ID: model.id,
      名称: model.name,
      Provider: model.provider,
      输入模态: model.modalities.input,
      输出模态: model.modalities.output,
      上下文窗口: model.limit?.context,
      最大输出: model.limit?.output,
      支持工具调用: model.tool_call,
      支持推理: model.reasoning,
      输入成本: model.cost?.input,
      输出成本: model.cost?.output,
    });
  } else {
    console.log("未找到模型 gpt-4o");
  }

  return model;
}

/**
 * 示例 3: 查询 Provider 信息
 */
export async function example3_QueryProvider() {
  console.log("\n=== 示例 3: 查询 Provider 信息 ===");

  // 查询 OpenAI Provider
  const provider = getModelsDevProvider("openai");
  if (provider) {
    console.log("Provider 信息:", {
      ID: provider.id,
      名称: provider.name,
      NPM包: provider.npm,
      环境变量: provider.env,
      文档: provider.doc,
      API地址: provider.api,
      Logo: provider.logo,
    });
  } else {
    console.log("未找到 Provider openai");
  }

  return provider;
}

/**
 * 示例 4: 搜索模型
 */
export async function example4_SearchModels() {
  console.log("\n=== 示例 4: 搜索模型 ===");

  // 搜索包含 "gpt" 的模型
  const models = await searchModelsDevModels("gpt");
  console.log(`找到 ${models.length} 个包含 "gpt" 的模型:`);

  models.slice(0, 5).forEach((spec) => {
    console.log(`- ${spec.id} (${spec.provider.name})`);
  });

  return models;
}

/**
 * 示例 5: 获取统计信息
 */
export function example5_GetStats() {
  console.log("\n=== 示例 5: 获取统计信息 ===");

  const stats = getModelsDevStats();
  console.log("统计信息:", {
    总模型数: stats.totalModels,
    总Provider数: stats.totalProviders,
    缓存状态: stats.cacheStats,
  });

  console.log("\n各 Provider 的模型数量:");
  Object.entries(stats.modelsByProvider)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([provider, count]) => {
      console.log(`  ${provider}: ${count} 个模型`);
    });

  return stats;
}

/**
 * 示例 6: 获取推荐模型
 */
export async function example6_GetRecommendedModels() {
  console.log("\n=== 示例 6: 获取推荐模型 ===");

  // 获取支持工具调用且成本较低的模型
  const recommended = getRecommendedModels({
    capabilities: {
      toolCall: true,
    },
    maxCost: 5.0, // 最大平均成本 $5/M tokens
    limit: 5,
  });

  console.log(`推荐的 ${recommended.length} 个模型:`);
  recommended.forEach((model) => {
    const avgCost = model.cost
      ? ((model.cost.input || 0) + (model.cost.output || 0)) / 2
      : 0;
    console.log(`- ${model.id} (${model.provider})`);
    console.log(`  平均成本: $${avgCost.toFixed(2)}/M tokens`);
    console.log(`  上下文: ${model.limit?.context || "N/A"}`);
  });

  return recommended;
}

/**
 * 示例 7: 启动定期更新调度器
 */
export async function example7_StartScheduler() {
  console.log("\n=== 示例 7: 启动定期更新调度器 ===");

  // 启动调度器，每 24 小时更新一次
  await startModelsDevScheduler({
    enabled: true,
    interval: 24 * 60 * 60 * 1000, // 24小时
    updateOnStart: true, // 启动时立即更新
    cacheTTL: 24 * 60 * 60 * 1000,
  });

  // 获取调度器状态
  const status = getModelsDevSchedulerStatus();
  console.log("调度器状态:", {
    运行中: status.isRunning,
    更新间隔: `${status.config.interval / 1000 / 60} 分钟`,
    缓存TTL: `${status.config.cacheTTL / 1000 / 60 / 60} 小时`,
    模型数量: status.cacheStats.modelCount,
    上次拉取: status.cacheStats.lastFetchTime,
  });

  return status;
}

/**
 * 示例 8: 高级筛选 - 按能力筛选模型
 */
export async function example8_FilterByCapabilities() {
  console.log("\n=== 示例 8: 按能力筛选模型 ===");

  const integration = ModelsDevIntegration.getInstance();

  // 筛选支持推理和工具调用的模型
  const reasoningModels = integration.filterModelsByCapabilities({
    reasoning: true,
    toolCall: true,
  });

  console.log(`找到 ${reasoningModels.length} 个支持推理和工具调用的模型:`);
  reasoningModels.slice(0, 5).forEach((model) => {
    console.log(`- ${model.id} (${model.provider})`);
    console.log(`  上下文: ${model.limit?.context || "N/A"}`);
  });

  return reasoningModels;
}

/**
 * 示例 9: 高级筛选 - 按成本筛选模型
 */
export async function example9_FilterByCost() {
  console.log("\n=== 示例 9: 按成本筛选模型 ===");

  const integration = ModelsDevIntegration.getInstance();

  // 筛选输入成本低于 $1/M tokens 的模型
  const cheapModels = integration.filterModelsByCost({
    maxInputCost: 1.0,
    maxOutputCost: 3.0,
  });

  console.log(`找到 ${cheapModels.length} 个低成本模型:`);
  cheapModels.slice(0, 5).forEach((model) => {
    console.log(`- ${model.id} (${model.provider})`);
    console.log(`  输入: $${model.cost?.input || 0}/M, 输出: $${model.cost?.output || 0}/M`);
  });

  return cheapModels;
}

/**
 * 示例 10: 获取增强的模型信息
 */
export async function example10_GetEnhancedInfo() {
  console.log("\n=== 示例 10: 获取增强的模型信息 ===");

  const integration = ModelsDevIntegration.getInstance();

  // 获取 Claude 3.5 Sonnet 的增强信息
  const info = await integration.getEnhancedModelInfo("claude-3-5-sonnet-20241022");

  if (info.spec) {
    console.log("ModelSpec 格式:", {
      ID: info.spec.id,
      名称: info.spec.name,
      Provider: info.spec.provider.name,
      输入Token限制: info.spec.maxTokens.input,
      输出Token限制: info.spec.maxTokens.output,
      能力: info.spec.capabilities,
    });
  }

  if (info.modelsDevData) {
    console.log("\nModels.dev 原始数据:", {
      知识截止: info.modelsDevData.knowledge,
      发布日期: info.modelsDevData.release_date,
      开源权重: info.modelsDevData.open_weights,
    });
  }

  return info;
}

/**
 * 运行所有示例
 */
export async function runAllExamples() {
  console.log("========================================");
  console.log("Models.dev 集成功能示例");
  console.log("========================================\n");

  try {
    // 1. 拉取数据
    await example1_ManualFetch();

    // 2. 查询模型
    await example2_QueryModel();

    // 3. 查询 Provider
    await example3_QueryProvider();

    // 4. 搜索模型
    await example4_SearchModels();

    // 5. 获取统计
    await example5_GetStats();

    // 6. 获取推荐
    await example6_GetRecommendedModels();

    // 7. 启动调度器
    await example7_StartScheduler();

    // 8. 按能力筛选
    await example8_FilterByCapabilities();

    // 9. 按成本筛选
    await example9_FilterByCost();

    // 10. 获取增强信息
    await example10_GetEnhancedInfo();

    console.log("\n========================================");
    console.log("所有示例运行完成！");
    console.log("========================================");

    // 停止调度器
    stopModelsDevScheduler();
  } catch (error) {
    console.error("运行示例时出错:", error);
  }
}

// 如果直接运行此文件，执行所有示例
if (require.main === module) {
  runAllExamples();
}
