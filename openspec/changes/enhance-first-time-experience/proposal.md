# Change: 首次使用体验增强

## Why

新用户从安装扩展到成功生成第一条提交消息的流程存在以下体验问题：

1. **配置门槛高**：需要一次性配置多个必需项（AI 提供商、API Key、模型选择），新用户容易感到困惑
2. **缺乏即时反馈**：配置后不知道是否生效，需要尝试生成才能验证
3. **引导不够渐进**：Welcome 页面虽有引导，但缺乏分步骤的引导式配置流程
4. **智能推荐缺失**：没有基于用户环境（如已安装 Ollama）的智能推荐

这些问题导致新用户流失率高，需要优化首次使用体验以降低使用门槛。

## What Changes

- **ADDED**: 渐进式新手引导向导（step-by-step onboarding wizard）
- **ADDED**: 配置即时验证功能（实时检测 API 连通性和 Key 有效性）
- **ADDED**: 智能环境检测与推荐（自动检测 Ollama 等本地服务）
- **ADDED**: 快速开始模板（预置常用配置组合供一键选用）
- **MODIFIED**: Welcome 页面重构，集成新的引导流程

## Impact

- **Affected specs**: `onboarding` capability (新建)
- **Affected code**:
  - `webview-ui/src/pages/welcome-page.tsx` - 欢迎页重构
  - `webview-ui/src/components/welcome/` - 引导组件增强
  - `src/services/settings/` - 配置验证服务
  - `src/utils/environment-detector.ts` - 环境检测工具（新建）
- **User experience**: 降低新用户配置门槛，提高配置成功率
- **Business impact**: 提高用户留存率，减少配置放弃率
