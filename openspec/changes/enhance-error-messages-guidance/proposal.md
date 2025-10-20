## Why

错误提示和用户引导是影响用户体验的关键因素，当前实现存在以下问题：

1. **错误信息不友好**：错误信息过于技术化，普通用户难以理解
2. **缺乏操作指导**：错误发生后没有具体的解决步骤和操作指导
3. **无问题诊断**：缺乏自动问题诊断和解决建议功能
4. **帮助文档不足**：缺乏完整的帮助文档和常见问题解答

这些问题导致用户遇到问题时感到困惑，增加了支持成本，降低了用户满意度。

## What Changes

- **ADDED**: 友好的错误信息显示，使用通俗易懂的语言
- **ADDED**: 详细的操作指导和帮助文档系统
- **ADDED**: 自动问题诊断和解决建议功能
- **ADDED**: 常见问题解答和故障排除指南
- **MODIFIED**: 错误处理流程，集成用户引导和帮助系统

## Impact

- **Affected specs**: `user-guidance` capability
- **Affected code**: 
  - `src/services/error-handler.ts` - 错误处理服务增强
  - `src/webview-ui/src/components/` - 错误显示和帮助组件
  - `src/docs/` - 新增帮助文档系统
  - `src/services/guidance/` - 新增用户引导服务
- **User experience**: 显著提升用户满意度，减少用户困惑
- **Support efficiency**: 降低支持成本，提高问题解决效率
