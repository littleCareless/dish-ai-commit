<div align="center">

<h1>Dish AI Commit Gen</h1>

使用 AI 生成标准化 Git/SVN 提交消息的 VSCode 扩展

[报告 Bug][github-issues-link] · [请求新功能][github-issues-link]

<!-- SHIELD GROUP -->

[![][github-contributors-shield]][github-contributors-link]
[![][github-forks-shield]][github-forks-link]
[![][github-stars-shield]][github-stars-link]
[![][github-issues-shield]][github-issues-link]
[![][vscode-marketplace-shield]][vscode-marketplace-link]
[![][total-installs-shield]][total-installs-link]
[![][avarage-rating-shield]][avarage-rating-link]
[![][github-license-shield]][github-license-link]
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/littleCareless/dish-ai-commit)

![Demo](images/demo.gif)

</div>

[English](README.md) | [简体中文](README.zh-CN.md)

<!-- Keep these links. Translations will automatically update with the README. -->

[Deutsch](https://www.readme-i18n.com/littleCareless/dish-ai-commit?lang=de) |
[Español](https://www.readme-i18n.com/littleCareless/dish-ai-commit?lang=es) |
[français](https://www.readme-i18n.com/littleCareless/dish-ai-commit?lang=fr) |
[日本語](https://www.readme-i18n.com/littleCareless/dish-ai-commit?lang=ja) |
[한국어](https://www.readme-i18n.com/littleCareless/dish-ai-commit?lang=ko) |
[Português](https://www.readme-i18n.com/littleCareless/dish-ai-commit?lang=pt) |
[Русский](https://www.readme-i18n.com/littleCareless/dish-ai-commit?lang=ru) |
[中文](https://www.readme-i18n.com/littleCareless/dish-ai-commit?lang=zh)

一个使用 AI 生成标准化 Git/SVN 提交消息的 VSCode 扩展。支持 OpenAI、Ollama、VSCode 内置 AI 服务、智谱 AI、DashScope、Gemini AI、豆包 AI、Deepseek AI、SiliconFlow 和 OpenRouter。

### 🆓 免费 AI 模型支持

- **智谱 AI (GLM-4-Flash)** - 固定月度免费额度 ([获取 API Key](https://open.bigmodel.cn/usercenter/apikeys))
- **Gemini AI** - 每天 1500 次免费请求 ([获取 API Key](https://makersuite.google.com/app/apikey))

## ✨ 新功能

- **PR 摘要生成**: 根据 Git 提交记录自动生成 PR 的标题和描述。
- **代码语义索引与搜索**: 利用 `tree-sitter` 和向量数据库（Qdrant）对代码库进行语义索引，以在生成提交信息和代码审查时提供更丰富的上下文。
- **函数调用模式**: 实验性功能，通过 AI 的函数调用能力生成结构化的提交信息。
- **动态设置界面**: 插件的设置界面现在基于配置定义动态生成，提供更灵活和详细的配置选项。

## 特性

### 🤖 多平台 AI 支持

| AI 提供商       | 特点                                 | 适用场景                           |
| --------------- | ------------------------------------ | ---------------------------------- |
| OpenAI API      | 高质量生成结果，支持 GPT-3.5/GPT-4   | 需要高质量输出的场景，按使用量收费 |
| Ollama          | 本地部署，支持多个开源模型           | 数据隐私要求高的场景               |
| VSCode 内置 AI  | 使用 GitHub Copilot                  | 拥有 GitHub Copilot 订阅的用户     |
| 智谱 AI (GLM-4) | 优秀的中文处理能力，固定月度免费额度 | 中国用户，中文处理                 |
| DashScope       | 阿里云提供，支持通义千问系列模型     | 企业级应用                         |
| Gemini AI       | 每日免费额度 1500 次请求             | 个人开发者                         |
| Deepseek AI     | 高质量开源大模型，中英文双语优化     | 多语言支持需求                     |
| SiliconFlow     | 高性能 AI 推理平台                   | 需要多模型支持的场景               |
| OpenRouter      | 开源 AI 路由服务，多模型支持         | 灵活的模型选择需求                 |

### 📝 版本控制系统支持

- SVN
- Git

### 📊 周报生成

- AI 驱动的周报生成
- 自动总结你的工作进展
- 可自定义报告模板
- 支持多个 AI 提供商进行报告生成

### 🌿 分支名称生成

- 自动生成符合规范的 Git 分支名称
- 基于需求或功能描述智能创建分支名
- 支持多种分支命名规范和格式化
- 与所有 AI 提供商无缝集成
- 提高团队分支命名一致性

### 🌍 多语言提交消息生成

支持以下 19 种语言：

- 简体中文 (简体中文)
- 繁體中文 (繁體中文)
- 日语 (日本語)
- 韩语 (한국어)
- 捷克语 (Čeština)
- 德语 (Deutsch)
- 法语 (Français)
- 意大利语 (Italiano)
- 荷兰语 (Nederlands)
- 葡萄牙语 (Português)
- 越南语 (Tiếng Việt)
- 英语
- 西班牙语 (Español)
- 瑞典语 (Svenska)
- 俄语 (Русский)
- 印度尼西亚语 (Bahasa Indonesia)
- 波兰语 (Polski)
- 土耳其语 (Türkçe)
- 泰语 (ไทย)

### 🎨 符合 Conventional Commits 规范

生成的提交消息遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- 提交消息格式：

  ```
  <类型>[可选作用域]: <描述>

  [可选正文]

  [可选脚注]
  ```

- 支持的提交类型：

  - `feat`：新功能
  - `fix`：修复 bug
  - `docs`：文档更改
  - `style`：代码样式调整
  - `refactor`：代码重构
  - `perf`：性能改进
  - `test`：测试相关改动
  - `build`：构建相关改动
  - `ci`：CI/CD 相关改动
  - `chore`：其他改动
  - `revert`：回滚提交

- 自动作用域检测：

  - 从修改的文件路径自动推断
  - 智能分类多文件更改
  - 通过配置自定义作用域规则

- 支持重大更改：

  - 使用 `!` 标记重大更改
  - 在正文中详细描述影响
  - 示例：`feat!: 重构认证系统`

- 智能描述生成：
  - 自动代码更改分析
  - 关键修改点提取
  - 生成清晰简洁的描述

### 😄 自动添加表情符号

- 自动为提交消息添加表情符号
- 可以通过配置启用/禁用：

```json
{
  "dish-ai-commit.features.commitFormat.enableEmoji": true // 启用表情符号
}
```

- 表情符号自动匹配提交类型：
  - ✨ feat: 新功能
  - 🐛 fix: 修复 bug
  - 📝 docs: 文档
  - 💄 style: 样式
  - ♻️ refactor: 重构
  - ⚡️ perf: 性能
  - ✅ test: 测试
  - 🔧 chore: 其他改动

### 📊 代码分析功能

- 智能代码差异分析
- 自动简化复杂代码更改
- 保留关键上下文信息

### 🔄 合并提交支持

通过启用 enableMergeCommit 选项，您可以：

- 将多个相关文件的更改合并到一个提交消息中
- 自动分析文件关联
- 生成更简洁的提交记录

### 📋 仅标题行提交消息

通过禁用 enableBody 选项，您可以：

- 生成仅包含标题行的提交消息（不含正文内容）
- 创建更简洁的提交历史
- 专注于最基本的信息

通过配置启用/禁用：

```json
{
  "dish-ai-commit.features.commitFormat.enableBody": false // 禁用提交消息正文
}
```

### 📝 周报模板

周报生成支持自定义模板：

- 通过 systemPrompt 配置自定义提示
- 按项目/任务总结
- 自定义报告格式和关键内容

### 🚀 PR 摘要生成

- **自动生成 PR 摘要**: 根据 Git 提交记录自动生成 PR 的标题和描述。
- **多 AI 提供商支持**: 支持多个 AI 提供商进行摘要生成。
- **可自定义**: 可自定义摘要模板。

### 🧠 代码语义索引与搜索

- **语义索引**: 利用 `tree-sitter` 和向量数据库（Qdrant）对代码库进行语义索引。
- **上下文增强**: 在生成提交信息和代码审查时提供更丰富的上下文。
- **多 embedding 服务支持**: 支持 Ollama, Qdrant 等多种 embedding 服务。

### 📞 函数调用模式

- **结构化提交**: 实验性功能，通过 AI 的函数调用能力生成结构化的提交信息。
- **工具集成**: 允许 AI 模型通过指定的工具 (tool) 返回结构化的提交信息数据。

### ⚙️ 动态设置界面

- **动态生成**: 插件的设置界面现在基于配置定义动态生成。
- **灵活配置**: 提供更灵活和详细的配置选项。

## 配置

| 配置项                                                 | 类型    | 默认值                    | 描述                             |
| ------------------------------------------------------ | ------- | ------------------------- | -------------------------------- |
| dish-ai-commit.base.language                           | string  | 简体中文                  | 提交消息语言                     |
| dish-ai-commit.base.systemPrompt                       | string  | ""                        | 自定义系统提示                   |
| dish-ai-commit.base.provider                           | string  | OpenAI                    | AI 提供商                        |
| dish-ai-commit.base.model                              | string  | gpt-3.5-turbo             | AI 模型                          |
| dish-ai-commit.providers.openai.apiKey                 | string  | ""                        | OpenAI API key                   |
| dish-ai-commit.providers.openai.baseUrl                | string  | https://api.openai.com/v1 | OpenAI API 基础 URL              |
| dish-ai-commit.providers.zhipu.apiKey                  | string  | ""                        | 智谱 AI API key                  |
| dish-ai-commit.providers.dashscope.apiKey              | string  | ""                        | DashScope API key                |
| dish-ai-commit.providers.doubao.apiKey                 | string  | ""                        | 豆包 AI API key                  |
| dish-ai-commit.providers.ollama.baseUrl                | string  | http://localhost:11434    | Ollama API 基础 URL              |
| dish-ai-commit.providers.gemini.apiKey                 | string  | ""                        | Gemini AI API key                |
| dish-ai-commit.providers.deepseek.apiKey               | string  | ""                        | Deepseek AI API key              |
| dish-ai-commit.providers.siliconflow.apiKey            | string  | ""                        | SiliconFlow API key              |
| dish-ai-commit.providers.openrouter.apiKey             | string  | ""                        | OpenRouter API key               |
| dish-ai-commit.features.codeAnalysis.simplifyDiff      | boolean | false                     | 启用差异内容简化                 |
| dish-ai-commit.features.commitFormat.enableMergeCommit | boolean | false                     | 允许将多个文件更改合并为一个提交 |
| dish-ai-commit.features.commitFormat.enableEmoji       | boolean | true                      | 在提交消息中使用表情符号         |
| dish-ai-commit.features.commitFormat.enableBody        | boolean | true                      | 在提交消息中包含正文内容         |
| dish-ai-commit.features.weeklyReport.systemPrompt      | string  | ""                        | 周报的自定义系统提示             |
| dish-ai-commit.features.prSummary.systemPrompt         | string  | ""                        | PR 摘要的自定义系统提示          |
| dish-ai-commit.features.codeIndex.enabled              | boolean | false                     | 启用代码语义索引                 |
| dish-ai-commit.features.codeIndex.provider             | string  | "ollama"                  | 代码索引的 embedding 提供商      |
| dish-ai-commit.features.codeIndex.model                | string  | "nomic-embed-text"        | 代码索引的 embedding 模型        |
| dish-ai-commit.features.codeIndex.qdrantUrl            | string  | "http://localhost:6333"   | Qdrant 向量数据库 URL            |

### 命令

| 命令 ID                              | 类别             | 标题                   | 描述                           |
| ------------------------------------ | ---------------- | ---------------------- | ------------------------------ |
| dish-ai-commit.selectModel           | [Dish AI Commit] | 选择提交生成的 AI 模型 | 选择用于生成提交消息的 AI 模型 |
| dish-ai-commit.generateWeeklyReport  | [Dish AI Commit] | 生成周报               | 生成 AI 驱动的每周工作报告     |
| dish-ai-commit.generateBranchName    | [Dish AI Commit] | 生成分支名称           | 基于需求描述生成标准化分支名   |
| dish-ai-commit.generateCommitMessage | [Dish AI Commit] | 生成提交信息           | 生成符合规范的提交消息         |
| dish-ai-commit.reviewCode            | [Dish AI Commit] | 代码审查               | AI 辅助的代码审查              |
| dish-ai-commit.generatePRSummary     | [Dish AI Commit] | 生成 PR 摘要           | 根据 Git 提交记录生成 PR 摘要  |

## 配置说明

1. OpenAI 配置

```json
{
  "dish-ai-commit.base.provider": "openai",
  "dish-ai-commit.providers.openai.apiKey": "your-api-key",
  "dish-ai-commit.providers.openai.baseUrl": "https://api.openai.com/v1"
}
```

2. Ollama 配置

```json
{
  "dish-ai-commit.base.provider": "ollama",
  "dish-ai-commit.providers.ollama.baseUrl": "http://localhost:11434"
}
```

3. VSCode 配置

```json
{
  "dish-ai-commit.base.provider": "vscode"
}
```

4. Deepseek AI 配置

```json
{
  "dish-ai-commit.base.provider": "deepseek",
  "dish-ai-commit.providers.deepseek.apiKey": "your-api-key"
}
```

5. SiliconFlow 配置

```json
{
  "dish-ai-commit.base.provider": "siliconflow",
  "dish-ai-commit.providers.siliconflow.apiKey": "your-api-key"
}
```

6. OpenRouter 配置

```json
{
  "dish-ai-commit.base.provider": "openrouter",
  "dish-ai-commit.providers.openrouter.apiKey": "your-api-key"
}
```

## 📋 如何使用

- 从源代码管理器中选择要提交的文件
- 点击源代码管理器标题栏中的 "Dish AI Commit" 图标
- 或在命令面板中执行 "Dish AI Commit" 命令
- AI 将自动生成符合规范的提交消息

## 📥 安装

1. 从 VS Code 扩展市场搜索 "Dish AI Commit"
2. 点击安装
3. 重启 VS Code
4. 根据实际需要配置 AI 服务参数

## 📝 更新日志

请参阅 [CHANGELOG.zh-CN.md](CHANGELOG.zh-CN.md) 了解详细的版本历史。

## 📋 依赖要求

- VS Code 1.80.0+
- [SVN 命令行工具](http://subversion.apache.org/packages.html)
- SVN SCM（可选）- 如果您需要在 VSCode 的 SCM 输入框中输入提交信息，请安装 [SVN SCM v2.18.1+](https://marketplace.visualstudio.com/items?itemName=littleCareless.svn-scm-ai)
- 从 [发布页面](https://marketplace.visualstudio.com/items?itemName=littleCareless.svn-scm-ai) 下载最新版本的 SVN SCM 扩展
- Git SCM（可选）- 如果您需要在 VSCode 的 SCM 输入框中输入提交信息，请安装 [Git SCM](https://marketplace.visualstudio.com/items?itemName=vscode.git)
- 有效的 AI 服务配置（OpenAI API 密钥或 Ollama 服务）

## 💡 常见问题

- 确保正确安装并可访问 SVN 命令行工具
- 确保正确安装并启用 SVN SCM 扩展
- 配置正确的 AI 服务参数
- 确保网络可以访问所选的 AI 服务

## 🛠️ 开发指南

### 🚀 CI/CD 自动化

本项目配置了完整的 CI/CD 工作流，用于自动化发布流程：

- **Develop 分支**：自动发布预发布版本
- **Main 分支**：自动发布正式版本
- 使用 GitHub Actions 完成自动构建、测试和发布
- 自动处理版本管理和发布流程

您可以使用 Github Codespaces 进行在线开发：

[![github-codespace][github-codespace-shield]][github-codespace-link]

或者，您可以克隆仓库并运行以下命令进行本地开发：

```bash
$ git clone https://github.com/littleCareless/dish-ai-commit
$ cd dish-ai-commit
$ npm install
```

在 VSCode 中打开项目文件夹。按 F5 运行项目。将弹出一个新的扩展开发主机窗口并启动扩展。

## 🤝 贡献指南

我们欢迎所有形式的贡献，包括但不限于：

- 提交 [Issues][github-issues-link] 报告 bug
- 提出新功能
- 提交 Pull Request 改进代码
- 改进文档

请确保在提交 PR 之前：

1. 代码已测试

2. 更新相关文档

3. 遵循项目代码规范

[![][pr-welcome-shield]][pr-welcome-link]

### 💗 感谢我们的贡献者

[![][github-contrib-shield]][github-contrib-link]

## 🙏 鸣谢

本项目受以下优秀开源项目启发并参考：

- [svn-scm](https://github.com/JohnstonCode/svn-scm) - VSCode 的 SVN 源代码管理
- [vscode](https://github.com/microsoft/vscode) - Visual Studio Code 编辑器
- [vscode-gitlens](https://github.com/gitkraken/vscode-gitlens) - VSCode 的 Git 超级助手
- [ai-commit](https://github.com/Sitoi/ai-commit) - AI 辅助的 Git 提交消息生成
- [vscode-copilot-chat](https://github.com/microsoft/vscode-copilot-chat) - 由 Copilot 提供支持的 AI 聊天功能

## 📄 许可证

本项目采用 [MIT](./LICENSE) 许可证。

<!-- LINK GROUP -->

[github-codespace-link]: https://codespaces.new/littleCareless/dish-ai-commit
[github-codespace-shield]: https://github.com/littleCareless/dish-ai-commit/blob/main/images/codespaces.png?raw=true
[github-contributors-link]: https://github.com/littleCareless/dish-ai-commit/graphs/contributors
[github-contributors-shield]: https://img.shields.io/github/contributors/littleCareless/dish-ai-commit?color=c4f042&labelColor=black&style=flat-square
[github-forks-link]: https://github.com/littleCareless/dish-ai-commit/network/members
[github-forks-shield]: https://img.shields.io/github/forks/littleCareless/dish-ai-commit?color=8ae8ff&labelColor=black&style=flat-square
[github-issues-link]: https://github.com/littleCareless/dish-ai-commit/issues
[github-issues-shield]: https://img.shields.io/github/issues/littleCareless/dish-ai-commit?color=ff80eb&labelColor=black&style=flat-square
[github-license-link]: https://github.com/littleCareless/dish-ai-commit/blob/main/LICENSE
[github-license-shield]: https://img.shields.io/github/license/littleCareless/dish-ai-commit?color=white&labelColor=black&style=flat-square
[github-stars-link]: https://github.com/littleCareless/dish-ai-commit/network/stargazers
[github-stars-shield]: https://img.shields.io/github/stars/littleCareless/dish-ai-commit?color=ffcb47&labelColor=black&style=flat-square
[pr-welcome-link]: https://github.com/littleCareless/dish-ai-commit/pulls
[pr-welcome-shield]: https://img.shields.io/badge/🤯_pr_welcome-%E2%86%92-ffcb47?labelColor=black&style=for-the-badge
[github-contrib-link]: https://github.com/littleCareless/dish-ai-commit/graphs/contributors
[github-contrib-shield]: https://contrib.rocks/image?repo=littleCareless%2Fdish-ai-commit
[vscode-marketplace-link]: https://marketplace.visualstudio.com/items?itemName=littleCareless.dish-ai-commit
[vscode-marketplace-shield]: https://img.shields.io/vscode-marketplace/v/littleCareless.dish-ai-commit.svg?label=vscode%20marketplace&color=blue&labelColor=black&style=flat-square
[total-installs-link]: https://marketplace.visualstudio.com/items?itemName=littleCareless.dish-ai-commit
[total-installs-shield]: https://img.shields.io/vscode-marketplace/d/littleCareless.dish-ai-commit.svg?&color=greeen&labelColor=black&style=flat-square
[avarage-rating-link]: https://marketplace.visualstudio.com/items?itemName=littleCareless.dish-ai-commit
[avarage-rating-shield]: https://img.shields.io/vscode-marketplace/r/littleCareless.dish-ai-commit.svg?&color=green&labelColor=black&style=flat-square
