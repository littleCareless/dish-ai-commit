# 模型信息注册表 (Model Registry)

这个模块提供了一个完整的模型信息管理系统，用于准确获取和维护各个AI提供商的模型规格信息。**新版本增加了增强的模型验证、代理检测和智能匹配功能，专门解决OpenAI兼容API环境下的模型信息准确性问题。**

## 核心问题解决

### OpenAI兼容API环境下的挑战
在使用OpenAI兼容的API服务时，经常遇到以下问题：
1. **模型标识不匹配**：调用`/models`接口时可能返回Gemini模型而非实际使用的模型
2. **兼容层映射错误**：代理服务可能返回错误的模型信息映射
3. **模型类型误判**：无法准确识别实际可用的模型类型

### 解决方案
本模块提供了以下技术方案：
- **智能模型验证**：多层级验证机制确保模型信息准确性
- **代理服务检测**：自动识别OpenAI兼容的代理服务
- **模糊匹配算法**：在代理环境中智能匹配最相似的模型
- **降级策略**：确保在任何情况下都能获取可用的模型信息

## 主要功能

### 1. 增强的Token限制获取
替代原有的硬编码方式，动态获取模型的实际token限制，支持代理检测和验证：

```typescript
import { getAccurateTokenLimits } from '../ai/model-registry';

// 旧方式（不准确）
const maxTokens = selectedModel.maxTokens?.input ?? 8192;

// 新方式（准确，支持增强验证）
const tokenLimits = await getAccurateTokenLimits(selectedModel, {
  enhanced: true,        // 启用增强验证
  minConfidence: 0.7,    // 最小置信度阈值
  allowFuzzyMatch: true  // 允许模糊匹配
});
const maxTokens = tokenLimits.input;
```

### 2. 模型信息验证
验证API返回的模型信息是否与请求的模型匹配：

```typescript
import { validateModelInfo } from '../ai/model-registry';

const validation = await validateModelInfo(selectedModel);
console.log('验证结果:', {
  是否有效: validation.isValid,
  置信度: `${(validation.confidence * 100).toFixed(1)}%`,
  问题: validation.issues,
  建议: validation.recommendations
});
```

### 3. 增强的模型规格获取
获取包含验证信息和代理检测结果的完整模型规格：

```typescript
import { getEnhancedModelSpec } from '../ai/model-registry';

const enhancedSpec = await getEnhancedModelSpec(selectedModel, {
  enableProxyDetection: true,  // 启用代理检测
  allowFuzzyMatch: true,       // 允许模糊匹配
  minConfidence: 0.5           // 最小置信度
});

console.log('增强模型规格:', {
  基本信息: enhancedSpec.maxTokens,
  验证信息: enhancedSpec.validation,
  代理信息: enhancedSpec.proxyInfo
});
```

### 2. 多层级信息获取策略
系统按以下优先级获取模型信息：
1. **缓存** - 快速响应，减少API调用
2. **API调用** - 获取最新的实时信息
3. **本地规格数据库** - 预设的准确规格信息
4. **默认值** - 兜底方案

### 3. 模型规格数据库
维护最新的模型规格信息：

```typescript
import { findModelSpec, getModelSpecsByProvider } from '../ai/model-registry';

// 查找特定模型
const spec = findModelSpec('gpt-4o');

// 获取提供商的所有模型
const openaiModels = getModelSpecsByProvider('openai');
```

### 4. 动态信息更新
支持手动和自动更新模型信息：

```typescript
import { updateAllModelInfo, updateProviderModelInfo } from '../ai/model-registry/model-update-service';

// 更新所有模型
await updateAllModelInfo();

// 更新特定提供商
await updateProviderModelInfo('openai');
```

## 使用方法

### 基本使用

```typescript
import { getAccurateTokenLimits, getModelSpec } from '../ai/model-registry';

// 在需要获取token限制的地方
async function generateCommit(selectedModel: AIModel) {
  // 获取准确的token限制
  const tokenLimits = await getAccurateTokenLimits(selectedModel);
  const maxTokens = tokenLimits.input;
  
  // 获取完整的模型规格
  const modelSpec = await getModelSpec(selectedModel);
  console.log('模型能力:', modelSpec.capabilities);
  console.log('费用信息:', modelSpec.cost);
  
  // 使用准确的限制进行处理
  if (promptLength > maxTokens * 0.75) {
    // 处理超长提示词
  }
}
```

### VS Code 命令

系统提供了VS Code命令来管理模型信息：

1. **更新模型信息** - `dish.updateModelInfo`
   - 更新所有模型信息
   - 更新特定提供商的模型
   - 查看模型统计信息

2. **检查模型更新** - 自动检查是否需要更新

### 配置管理

```typescript
import { ModelRegistryConfigManager } from '../ai/model-registry/model-config';

const configManager = ModelRegistryConfigManager.getInstance();

// 设置缓存时间为12小时
configManager.set('cacheTTL', 12 * 60 * 60 * 1000);

// 启用自动更新
configManager.updateConfig({
  autoUpdate: true,
  autoUpdateInterval: 3 * 24 * 60 * 60 * 1000 // 3天
});
```

## 支持的提供商

目前支持以下AI提供商的动态信息获取：

- **OpenAI** - 通过 `/models` API 获取
- **GitHub Models** - 通过 GitHub Models API
- **Anthropic** - 使用本地规格数据库
- **其他提供商** - 使用本地规格数据库

## 模型规格数据

### OpenAI 模型（2024年最新）

| 模型 | 输入限制 | 输出限制 | 特殊能力 |
|------|----------|----------|----------|
| o1-preview | 128,000 | 32,768 | 推理模型 |
| o1-mini | 128,000 | 65,536 | 轻量推理 |
| gpt-4o | 128,000 | 16,384 | 多模态 |
| gpt-4o-mini | 128,000 | 16,384 | 高效多模态 |
| gpt-4-turbo | 128,000 | 4,096 | 高速处理 |
| gpt-4 | 8,192 | 4,096 | 标准版本 |
| gpt-3.5-turbo | 16,385 | 4,096 | 经济版本 |

### Anthropic 模型

| 模型 | 输入限制 | 输出限制 | 特殊能力 |
|------|----------|----------|----------|
| claude-3-opus | 200,000 | 4,096 | 最强能力 |
| claude-3-sonnet | 200,000 | 4,096 | 平衡性能 |
| claude-3-haiku | 200,000 | 4,096 | 快速响应 |

## 错误处理

系统提供了完善的错误处理机制：

```typescript
try {
  const tokenLimits = await getAccurateTokenLimits(selectedModel);
  // 使用准确的限制
} catch (error) {
  // 降级到默认值
  const defaultLimits = getDefaultTokenLimits(selectedModel.provider.id);
  console.warn('使用默认token限制:', defaultLimits);
}
```

## 性能优化

- **智能缓存** - 24小时缓存，减少API调用
- **批量更新** - 支持批量更新多个模型
- **异步处理** - 不阻塞主要功能
- **降级策略** - 确保系统始终可用

## 扩展支持

要添加新的AI提供商支持：

1. 在 `model-specs.ts` 中添加模型规格
2. 在 `model-info-fetcher.ts` 中实现API获取逻辑
3. 更新 `model-update-service.ts` 支持新提供商

## 注意事项

1. **API密钥** - 确保配置了正确的API密钥
2. **网络连接** - API调用需要网络连接
3. **速率限制** - 注意各提供商的API速率限制
4. **缓存管理** - 定期清理过期缓存

## 迁移指南

### 从旧版本迁移

将所有使用 `selectedModel.maxTokens?.input ?? defaultValue` 的地方替换为：

```typescript
// 旧代码
const maxTokens = selectedModel.maxTokens?.input ?? 8192;

// 新代码
const tokenLimits = await getAccurateTokenLimits(selectedModel);
const maxTokens = tokenLimits.input;
```

这样可以确保获取到准确的模型token限制，避免因为过时的配置导致的问题。