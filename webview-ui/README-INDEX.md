# WebView UI 文档索引

## 📚 文档总览

本文档索引列出了 webview-ui 模块中所有核心模块的 README.md 文件，帮助开发者快速定位和理解各模块的功能和使用方法。

## 📋 已创建的文档

### 主文档 (1 个)

| 文件路径    | 说明                |
| ----------- | ------------------- |
| `README.md` | WebView UI 总览文档 |

### 组件模块 (7 个)

| 文件路径                               | 说明                         |
| -------------------------------------- | ---------------------------- |
| `src/components/commit-chat/README.md` | 提交聊天界面组件（已存在）   |
| `src/components/layout/README.md`      | 布局和导航组件               |
| `src/components/settings/README.md`    | 设置相关组件                 |
| `src/components/ui/README.md`          | 基础 UI 组件库               |
| `src/components/common/README.md`      | 通用组件（错误边界、加载页） |
| `src/components/prompts/README.md`     | 提示词管理组件               |
| `src/components/welcome/README.md`     | 欢迎页面组件                 |

### 页面模块 (2 个)

| 文件路径                       | 说明           |
| ------------------------------ | -------------- |
| `src/pages/README.md`          | 页面模块总览   |
| `src/pages/settings/README.md` | 设置页面子模块 |

### 功能模块 (8 个)

| 文件路径                 | 说明                 |
| ------------------------ | -------------------- |
| `src/hooks/README.md`    | React Hooks 集合     |
| `src/contexts/README.md` | React Contexts       |
| `src/services/README.md` | 服务层（通信、存储） |
| `src/router/README.md`   | 路由管理             |
| `src/utils/README.md`    | 工具函数             |
| `src/i18n/README.md`     | 国际化支持           |
| `src/config/README.md`   | 配置管理             |
| `src/types/README.md`    | 类型定义             |

## 📊 文档统计

| 类别     | 数量   | 占比     |
| -------- | ------ | -------- |
| 主文档   | 1      | 5.6%     |
| 组件模块 | 7      | 38.9%    |
| 页面模块 | 2      | 11.1%    |
| 功能模块 | 8      | 44.4%    |
| **总计** | **18** | **100%** |

## 🎯 文档结构说明

### 1. 主文档 (README.md)

- 项目概述和技术栈
- 完整的项目结构
- 核心功能模块介绍
- 快速开始指南
- 开发流程
- 设计系统
- 故障排除

### 2. 组件文档

每个组件文档包含：

- **概述**: 模块职责
- **架构设计**: 组件层次和数据流
- **核心组件**: 详细说明每个组件
- **使用示例**: 代码示例
- **最佳实践**: 推荐用法
- **故障排除**: 常见问题

### 3. 功能模块文档

每个功能模块包含：

- **职责**: 功能描述
- **接口定义**: TypeScript 类型
- **核心实现**: 关键代码
- **使用示例**: 实际应用
- **最佳实践**: 性能优化
- **故障排除**: 调试技巧

## 🔍 快速导航

### 我想了解...

- **如何创建新组件** → `src/components/ui/README.md`
- **如何管理状态** → `src/hooks/README.md` + `src/contexts/README.md`
- **如何添加新页面** → `src/router/README.md` + `src/pages/README.md`
- **如何支持多语言** → `src/i18n/README.md`
- **如何与 VS Code 通信** → `src/services/README.md` + `src/utils/vscode.ts`
- **如何验证配置** → `src/utils/config-validator.ts` (文档在 `src/utils/README.md`)
- **如何添加 AI 提供商** → `src/config/provider-registry.tsx` (文档在 `src/config/README.md`)

### 按功能模块

- **提交聊天**: `src/components/commit-chat/README.md`
- **配置管理**: `src/components/settings/README.md` + `src/pages/settings/README.md`
- **代码索引**: `src/pages/README.md` (IndexingPage 部分)
- **提示词管理**: `src/components/prompts/README.md`
- **周报生成**: `src/pages/README.md` (WeeklyReportPage 部分)

## 📝 文档更新日志

### 2024-12-19

- ✅ 创建主文档 (README.md)
- ✅ 创建组件模块文档 (7 个)
- ✅ 创建页面模块文档 (2 个)
- ✅ 创建功能模块文档 (8 个)
- ✅ 创建索引文档 (README-INDEX.md)

## 🔄 文档维护

### 添加新模块

1. 在对应目录创建 `README.md`
2. 参考现有文档的结构和格式
3. 更新本文档的索引表
4. 在主文档中添加链接

### 更新现有模块

1. 修改对应的 README.md
2. 保持格式一致性
3. 更新代码示例
4. 验证所有链接

### 文档质量检查

- ✅ 代码示例可运行
- ✅ 链接有效
- ✅ 中英文混合（根据项目风格）
- ✅ 包含使用示例
- ✅ 包含最佳实践
- ✅ 包含故障排除

## 📖 阅读建议

### 新手开发者

1. 从主文档 (README.md) 开始
2. 阅读组件模块文档
3. 了解 Hooks 和 Contexts
4. 实践小功能开发

### 进阶开发者

1. 深入理解架构设计
2. 阅读服务层和工具函数
3. 了解类型系统
4. 参与复杂功能开发

### 架构师

1. 研究整体架构
2. 理解数据流
3. 评估扩展性
4. 规划技术演进

## 🤝 贡献文档

如果您发现文档有以下问题，欢迎贡献：

- ❌ 错误或不准确的信息
- 📝 语法或拼写错误
- 💡 更好的示例代码
- 🎯 遗漏的功能说明
- 🔍 模糊的解释

请直接修改对应的 README.md 文件。

---

**文档版本**: v1.0
**最后更新**: 2024年12月
**维护者**: 项目团队
