# Change: 操作反馈与进度可视化优化

## Why

AI 调用、代码索引等长时间操作的用户感知体验存在以下问题：

1. **进度反馈模糊**：只有 loading 状态，用户不知道操作进行到哪一步
2. **流式响应不可见**：AI 流式生成时，用户需要等到完全完成才能看到结果
3. **操作历史无追溯**：无法查看历史生成记录，重复生成效率低
4. **状态区分不明显**：成功、失败、警告状态的视觉区分不够醒目

这些问题导致用户在等待时焦虑，对操作结果缺乏预期，影响整体使用体验。

## What Changes

- **ADDED**: 详细进度阶段显示（分析变更 → 构建上下文 → 生成消息 → 完成）
- **ADDED**: 流式响应实时可视化（逐字/逐行显示 AI 生成内容）
- **ADDED**: 操作历史记录面板（最近生成的提交消息、周报等）
- **ADDED**: 增强状态反馈设计（成功/失败/警告的颜色和图标区分）
- **MODIFIED**: 代码索引进度展示优化，显示当前处理文件和阶段

## Impact

- **Affected specs**: `operation-feedback` capability (新建)
- **Affected code**:
  - `src/commands/generate-commit/` - 进度报告增强
  - `webview-ui/src/components/` - 进度和状态组件
  - `src/services/` - 操作历史服务（新建）
  - `webview-ui/src/pages/` - 历史记录页面
- **User experience**: 减少等待焦虑，提供操作预期感
- **Productivity**: 历史记录复用提高效率
