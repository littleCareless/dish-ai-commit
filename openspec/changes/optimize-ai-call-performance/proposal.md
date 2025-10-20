## Why

AI 调用是 Dish AI Commit 的核心功能，但当前实现存在以下性能问题：

1. **响应时间不稳定**：不同 AI 提供商的响应时间差异很大，缺乏统一的优化策略
2. **Token 计算效率低**：每次调用都需要重新计算 Token 数量，消耗额外时间
3. **缺乏请求优化**：没有重试机制和并发控制
4. **资源浪费**：重复的 API 调用和无效请求导致资源浪费

这些问题影响了用户体验，特别是在处理大型代码库或频繁使用功能时，响应延迟明显。

## What Changes

- **ADDED**: 优化的 Token 计算算法，支持增量计算
- **ADDED**: 请求超时和重试机制，提高可靠性
- **ADDED**: 并发请求控制，避免 API 限制
- **MODIFIED**: AI 提供商接口优化，支持批量操作

## Impact

- **Affected specs**: `ai-provider` capability
- **Affected code**: 
  - `src/ai/ai-provider-factory.ts` - 提供商工厂优化
  - `src/ai/providers/` - 各提供商实现优化
  - `src/ai/utils/` - Token 计算和缓存工具
  - `src/commands/generate-commit/` - 提交生成流程优化
- **Performance improvement**: 响应时间减少 30-50%，减少不必要的 API 调用
- **User experience**: 提升系统稳定性和响应速度
