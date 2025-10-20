# Project Context

## Purpose
Dish AI Commit Gen 是一个 VS Code 扩展，使用 AI 技术生成标准化的 Git/SVN 提交消息。项目旨在通过 AI 辅助提高开发者的提交消息质量，支持多种 AI 提供商，提供多语言支持，并包含代码审查、周报生成、分支命名等增强功能。

## Tech Stack
- **核心语言**: TypeScript (ES2022)
- **前端框架**: React + Vite (Webview UI)
- **构建工具**: esbuild, Vite
- **测试框架**: Vitest + @vitest/coverage-v8
- **代码质量**: ESLint + @stylistic/eslint-plugin
- **依赖注入**: Inversify
- **AI 集成**: OpenAI, Anthropic, Ollama, Zhipu AI, DashScope, Gemini 等
- **代码分析**: tree-sitter-wasms, web-tree-sitter
- **向量数据库**: Qdrant (用于代码语义索引)
- **包管理**: pnpm
- **版本控制**: Git + SVN 支持

## Project Conventions

### Code Style
- **TypeScript 严格模式**: 启用所有严格类型检查选项
- **命名约定**: 
  - 文件名使用 kebab-case
  - 类名使用 PascalCase
  - 变量和函数使用 camelCase
  - 常量使用 UPPER_SNAKE_CASE
- **代码格式化**: 
  - 使用 ESLint + @stylistic 插件
  - 强制使用分号
  - 强制使用花括号
  - 使用 === 进行相等比较
- **导入顺序**: 外部库 → 内部模块 → 相对路径
- **注释规范**: 使用 JSDoc 格式，中文注释

### Architecture Patterns
- **依赖注入**: 使用 Inversify 容器管理依赖关系
- **命令模式**: 所有功能通过命令实现，继承自 BaseCommand
- **提供者模式**: AI 提供商通过抽象基类实现统一接口
- **工厂模式**: AI 提供商工厂负责创建具体实例
- **策略模式**: 不同 SCM 提供商（Git/SVN）使用不同策略
- **观察者模式**: 配置变更通过事件通知
- **模块化设计**: 按功能域划分模块（ai/, commands/, config/, core/, scm/, utils/）

### Testing Strategy
- **测试框架**: Vitest (替代 Jest)
- **测试覆盖率**: 使用 v8 提供器，目标覆盖率通过脚本检查
- **测试类型**: 
  - 单元测试: 测试单个函数/类
  - 集成测试: 测试模块间交互
  - 端到端测试: 测试完整工作流
- **测试文件位置**: `src/**/__tests__/**/*.test.ts`
- **测试数据**: 使用 mock 和 fixture 数据
- **质量门禁**: 通过 `npm run quality-gate` 检查测试覆盖率和代码质量

### Git Workflow
- **分支策略**: 
  - `main`: 主分支，用于发布
  - `develop`: 开发分支，用于集成
  - `feature/*`: 功能分支
  - `hotfix/*`: 热修复分支
- **提交规范**: 
  - 使用 Conventional Commits 规范
  - 支持 Gitmoji 表情符号
  - 提交类型: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
  - 最大标题长度: 108 字符
- **代码审查**: 所有 PR 必须通过代码审查
- **自动化**: 使用 Husky + lint-staged 进行提交前检查

## Domain Context
- **VS Code 扩展开发**: 需要理解 VS Code API、扩展生命周期、命令注册、Webview 等概念
- **AI 集成**: 支持多种 AI 提供商，需要处理不同的 API 格式和认证方式
- **版本控制**: 深度集成 Git 和 SVN，需要理解 SCM 操作和差异分析
- **代码分析**: 使用 tree-sitter 进行语法分析，支持多种编程语言
- **国际化**: 支持 19 种语言，使用 i18n 框架
- **语义索引**: 使用向量数据库进行代码语义搜索和索引

## Important Constraints
- **VS Code 版本**: 最低支持 1.90.0
- **Node.js 版本**: 最低支持 18.20.8
- **包大小限制**: VS Code 扩展包大小限制
- **API 限制**: 各种 AI 提供商的 API 调用限制和配额
- **网络依赖**: 需要网络连接访问 AI 服务
- **系统依赖**: 某些功能需要系统级依赖（如通知功能）
- **性能要求**: 代码索引和 AI 调用需要优化性能

## External Dependencies
- **AI 服务**: 
  - OpenAI API
  - Anthropic Claude API
  - Google Gemini API
  - 智谱 AI API
  - 阿里云 DashScope API
  - 字节跳动豆包 API
  - Deepseek AI API
  - SiliconFlow API
  - OpenRouter API
  - Ollama (本地部署)
- **向量数据库**: Qdrant (用于代码语义索引)
- **代码分析**: tree-sitter (支持 30+ 编程语言)
- **系统通知**: node-notifier (跨平台通知)
- **版本控制**: Git CLI, SVN CLI
- **构建工具**: esbuild, Vite, TypeScript 编译器
