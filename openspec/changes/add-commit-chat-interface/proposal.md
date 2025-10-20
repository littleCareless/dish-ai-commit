## Why

当前配置管理界面缺乏与 AI 交互的直观方式，用户无法通过对话方式优化和调整 commit message 生成。基于现有的 ChatView 组件架构，我们需要一个专门针对 git commit message 生成的聊天界面：

1. **缺乏交互式配置**：用户无法通过对话方式与 AI 交互来优化 commit message 生成
2. **配置过程复杂**：传统的表单配置方式对用户不够友好，特别是对于 commit message 的个性化需求
3. **缺乏实时反馈**：用户无法实时看到 AI 如何理解和处理他们的需求
4. **个性化体验不足**：无法通过对话学习用户的偏好和习惯

通过添加专门的 commit chat 界面，可以让用户通过自然语言与 AI 交互，实时调整和优化 commit message 生成策略。

## What Changes

- **ADDED**: CommitChatView 组件，专门用于 commit message 生成的对话界面
- **ADDED**: 对话状态管理，包括消息历史、输入状态和 AI 响应处理
- **ADDED**: 智能提示和自动补全，支持 commit message 相关的命令和模板
- **ADDED**: 实时预览功能，显示 AI 生成的 commit message 效果
- **MODIFIED**: 配置界面集成，将聊天界面作为配置管理的一部分

## Impact

- **Affected specs**: `commit-chat` capability
- **Affected code**: 
  - `src/webview-ui/src/components/commit-chat/` - 新增 commit chat 组件
  - `src/webview-ui/src/pages/setting/` - 集成到配置界面
  - `src/services/commit-chat/` - commit chat 相关服务
  - `src/ai/commit-optimizer.ts` - AI commit 优化服务
- **User experience**: 提供直观的对话式配置体验，降低使用门槛
- **Productivity**: 通过对话快速调整和优化 commit message 生成策略
