# Models.dev 集成文档

## 概述

本模块提供了与 [Models.dev](https://models.dev) API 的完整集成，用于自动拉取和缓存最新的 AI 模型信息。

## 功能特性

- ✅ 从 Models.dev API 拉取完整模型数据
- ✅ 解析模型和 Provider 信息
- ✅ 内存缓存机制（可扩展到持久化存储）
- ✅ 定期自动更新（可配置间隔）
- ✅ 模型搜索和筛选
- ✅ 按能力和成本筛选模型
- ✅ 与现有模型注册表系统无缝集成
- ✅ 完整的 TypeScript 类型定义

## 架构设计

```
models-dev-types.ts          # 类型定义
models-dev-fetcher.ts        # 数据获取和缓存
models-dev-scheduler.ts      # 定期更新调度器
models-dev-integration.ts    # 与现有系统集成
models-dev-example.ts        # 使用示例
```

## 快速开始

### 1. 手动拉取数据

```typescript
import { fetchModelsDevData } from '@/ai/model-registry';

// 拉取最新数据
const result = await fetchModelsDevData({
  forceRefresh: true,        // 强制刷新缓存
  cacheTTL: 24 * 60 * 60 * 1000  // 24小时缓存
});

console.log(`成功拉取 ${result.modelCount} 个模型`);
console.log(`新增: ${result.newModels.length}, 更新: ${result.updatedModels.length}`);
```

### 2. 启动定期更新

```typescript
import { startModelsDevScheduler } from '@/ai/model-registry';

// 启动调度器，每24小时自动更新
await startModelsDevScheduler({
  enabled: true,
  interval: 24 * 60 * 60 * 1000,  // 24小时
  updateOnStart: true,             // 启动时立即更新
  cacheTTL: 24 * 60 * 60 * 1000
});
```

### 3. 查询模型信息

```typescript
import { getModelsDevModel, getModelsDevProvider } from '@/ai/model-registry';

// 查询特定模型
const model = getModelsDevModel('gpt-4o');
console.log(model?.name, model?.limit?.context);

// 查询 Provider
const provider = getModelsDevProvider('openai');
console.log(provider?.name, provider?.npm);
```

### 4. 搜索模型

```typescript
import { searchModelsDevModels } from '@/ai/model-registry';

// 搜索包含 "gpt" 的模型
const models = await searchModelsDevModels('gpt');
models.forEach(spec => {
  console.log(`${spec.id} - ${spec.provider.name}`);
});
```

### 5. 获取推荐模型

```typescript
import { getRecommendedModels } from '@/ai/model-registry';

// 获取支持工具调用且成本低于 $5/M tokens 的模型
const recommended = getRecommendedModels({
  capabilities: {
    toolCall: true,
    vision: false
  },
  maxCost: 5.0,
  limit: 10
});
```

## API 参考

### 数据获取

#### `fetchModelsDevData(options?)`

从 Models.dev API 拉取最新数据。

**参数：**
- `options.forceRefresh?: boolean` - 是否强制刷新缓存
- `options.cacheTTL?: number` - 缓存生存时间（毫秒）

**返回：** `Promise<FetchResult>`

```typescript
interface FetchResult {
  success: boolean;
  modelCount: number;
  providerCount: number;
  updatedModels: string[]; newModels: string[];
  errorModels: string[];
  errors: string[];
  fetchTime: string;
}
```

#### `getModelsDevModel(modelId: string)`

获取特定模型的信息。

**返回：** `ModelsDevModel | null`

#### `getModelsDevProvider(providerId: string)`

获取特定 Provider 的信息。

**返回：** `ModelsDevProvider | null`

### 调度器

#### `startModelsDevScheduler(config?)`

启动定期更新调度器。

**参数：**
```typescript
interface SchedulerConfig {
  enabled: boolean;           // 是否启用
  interval: number;           // 更新间隔（毫秒）
  updateOnStart: boolean;     // 启动时是否立即更新
  cacheTTL: number;          // 缓存TTL（n```

#### `stopModelsDevScheduler()`

停止调度器。

#### `triggerModelsDevUpdate(forceRefresh?)`

手动触发更新。

#### `getModelsDevSchedulerStatus()`

获取调度器状态。

### 集成功能

#### `getModelsDevModelSpec(modelId: string)`

获取转换为 ModelSpec 格式的模型信息。

**返回：** `Promise<ModelSpec | null>`

#### `searchModelsDevModels(query: string)`

搜索模型并返回 ModelSpec 格式。

**返回：** `Promise<ModelSpec[]>`

#### `getModelsDevStats()`

获取统计信息。

**返回：**
```typescript
{
  totalModels: number;
  totalProviders: number;
  modelsByProvider: Record<string, number>;
  cacheStats: {
    modelCount: number;
    providerCount: number;
    lastFetchTime: string | null;
    cacheAge: number;
    isExpired: boolean;
  };
}
```

#### `getRecommendedModels(options?)`

获取推荐模型。

**参数：**
```typescript
{
  capabilities?: {
    reasoning?: boolean;
    toolCall?: boolean;
    vision?: boolean;
  };
  maxCost?: number;
  limit?: number;
}
```

### 高级筛选

#### `ModelsDevIntegration.filterModelsByCapabilities(options)`

按能力筛选模型。

**参数：**
```typescript
{
  reasoning?: boolean;
  toolCall?: boolean;
  vision?: boolean;
  attachment?: boolean;
}
```

#### `ModelsDevIntegration.filterModelsByCost(options)`

按成本筛选模型。

**参数：**
```typescript
{
  maxInputCost;
  maxOutputCost?: number;
}
```

## 数据结构

### ModelsDevModel

```typescript
interface ModelsDevModel {
  id: string;
  provider: string;
  name: string;
  modalities: {
    input: Modality[];
    output: Modality[];
  };
  attachment?: boolean;
  reasoning?: boolean;
  tool_call?: boolean;
  structured_output?: boolean;
  temperature?: boolean;
  knowledge?: string;
  release_date?: string;
  last_updated?: string;
  open_weights?: boolean;
  cost?: {
    input?: number;
    output?: number;
    cache_read?: number;
    cache_write?: number;
    reasoning?: number;
    input_audio?: number;
    output_audio?: number;
  };
  limit?: {
    context?: number;
    output?: number;
  };
  interleaved?: {
    field?: string;
  };
  family?: string;
}
```

### ModelsDevProvider

```typescript
interface ModelsDevProvider {
  id: string;
  name: string;
  npm?: string;
  env?: string[];
  doc?: string;
  api?: string;
  logo?: string;  // https://models.dev/logos/{provider}.svg
}
```

## 缓存机制

### 内存缓存

当前实现使用内存缓存，数据存储在 `Map` 中：

- **模型缓存：** `Map<modelId, CachedModelData>`
- **Provider 缓存：** `Map<providerId, CachedProviderData>`
- **默认 TTL：** 24 小时

### 扩展到持久化存储

可以通过修改 `ModelsDevFetcher` 中的以下方法来

```typescript
private async loadCacheFromStorage(): Promise<void> {
  // 从 VSCode globalState 或文件系统加载
  const cached = await context.globalState.get('modelsDevCache');
  // ...
}

private async saveCacheToStorage(): Promise<void> {
  // 保存到 VSCode globalState 或文件系统
  await context.globalState.update('modelsDevCache', {
    models: Array.from(this.modelCache.entries()),
    providers: Array.from(this.providerCache.entries()),
    lastFetchTime: this.lastFetchTime
  });
}
```

## 使用场景

### 场景 1: 扩展启动时初始化

```typescript
importodelsDevScheduler } from '@/ai/model-registry';

export async function(context: vscode.ExtensionContext) {
  // 启动 Models.dev 调度器
  await startModelsDevScheduler({
    enabled: true,
    interval: 24 * 60 * 60 * 1000,
    updateOnStart: true,
    cacheTTL: 24 * 60 * 60 * 1000
  });
}
```

### 场景 2: 模型选择器

```typescript
import { getModelsDevStats, searchModelsDevModels } from '@/ai/model-registry';

async function showModelPicker() {
  const stats = getModelsDevStats();

  // 显示统计信息
  vscode.window.showInformationMessage(
    `可用模型: ${stats.totalModels} 个，来自 ${stats.totalProviders} 个 Provider`
  );

  // 搜索模型
  const query = await vscode.window.showInputBox({
    prompt: '搜索模型'
  });

  if) {
    const models = await searchModelsDevModels(query);
    // 显示搜索结果...
  }
}
```

### 场景 3: 智能模型推荐

```typescript
import { getRecommendedModels } from '@/ai/model-registry';

async function recommendModelForTask(task: 'code' | 'chat' | 'reasoning') {
  let options = {};

  switch (task) {
    case 'code':
      options = {
        capabilities: { toolCall: true },
        maxCost: 3.0,
        limit: 5
      };
      break;
    case 'reasoning':
      options = {
        capabilities: { reasoning: true },
        limit: 5
      };
      break;
    case 'chat':
      options = {
        maxCost: 1.0,
        limit: 5
      };
      break;
  }

  return getRecommendedModels(options);
}
```

## 配置建议

### 开发环境

```typescript
{
  enabled: true,
  interval: 60 * 60 * 1000,      // 1小时更新一次
  updateOnStart: true,
  cacheTTL: 60 * 60 * 1000       // 1小时缓存
}
```

### 生产环境

```typescript
{
  enabled: true,
  interval: 24 * 60 * 60 * 1000,  // 24小时更新一次
  updateOnStart: true,
  cacheTTL: 24 * 60 * 60 * 1000   // 24小时缓存
}
```

### 禁用自动更新

```typescript
{
  enabled: false,
  l: 24 * 60 * 60 * 1000,
  updateOnStart: false,
  cacheTTL: 7 * 24 * 60 * 60 * 1000  // 7天缓存
}
```

## 错误处理

所有 API 调用都包含错误处理：

```typescript
try {
  const result = await fetchModelsDevData({ forceRefresh: true });

  if (!result.success) {
    console.error('拉取失败:', result.errors);
    // 处理错误...
  }

  if (result.errorModels.length > 0) {
    console.warn('部分模型拉取失败:', result.errorModels);
  }
} catch (error) {
  console.error('拉取异常:', error);
}
```

## 性能优化

1. **缓存优先：** 优先使用缓存数据，减少 API 调用
2. **增量更新：** 只更新变化的模型
3. **异步加载：** 不阻塞主线程
4. **批量处理：** 一次性处理所有模型和 Provider

## 未来扩展

- [ ] 持久化缓据库
- [ ] 支持 Redis 缓存
- [ ] 增量更新优化
- [ ] 模型版本历史追踪
- [ ] 自定义筛选规则
- [ ] 模型性能基准数据集成
- [ ] 多语言支持

## 相关链接

- [Models.dev 官网](https://models.dev)
- [Models.dev API 文档](https://models.dev/api.json)
- [项目 GitHub](https://github.com/your-repo)

## 许可证

MIT
