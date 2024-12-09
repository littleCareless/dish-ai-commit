<div align="center">

<h1>Dish AI Commit Gen</h1>

用 AI 辅助生成规范的 Git/SVN 提交信息的 VSCode 扩展

[报告错误][github-issues-link] · [请求功能][github-issues-link]

<!-- SHIELD GROUP -->

[![][github-contributors-shield]][github-contributors-link]
[![][github-forks-shield]][github-forks-link]
[![][github-stars-shield]][github-stars-link]
[![][github-issues-shield]][github-issues-link]
[![][vscode-marketplace-shield]][vscode-marketplace-link]
[![][total-installs-shield]][total-installs-link]
[![][avarage-rating-shield]][avarage-rating-link]
[![][github-license-shield]][github-license-link]

![演示](images/demo.gif)

</div>

[English](README.md) | [简体中文](README.zh-CN.md)

用 AI 辅助生成规范的 Git/SVN 提交信息的 VSCode 扩展。支持 OpenAI、Ollama 和 VSCode 内置 AI 服务。

## 功能特性

### 🤖 多平台 AI 支持

- OpenAI API 支持 (GPT-3.5/GPT-4/Other)
- Ollama 本地模型支持
- VSCode 内置 AI 支持

### 📝 版本控制系统支持

- SVN
- Git

### 🌍 支持多语言提交信息生成：

- 简体中文
- 繁體中文
- English
- 日本語
- 한국어
  等 19 种语言

### 🎨 符合 Conventional Commits 规范

### 😄 自动添加 emoji 表情

### 配置项

| 配置项                                          | 类型    | 默认值                    | 说明                                       |
| ----------------------------------------------- | ------- | ------------------------- | ------------------------------------------ |
| dish-ai-commit.commitLanguage                   | string  | Simplified Chinese        | 提交信息语言                               |
| dish-ai-commit.systemPrompt                     | string  | ""                        | 自定义生成提交信息的系统提示               |
| dish-ai-commit.provider                         | string  | OpenAI                    | 默认的 AI 提供商                           |
| dish-ai-commit.model                            | string  | gpt-3.5-turbo             | AI 模型选择                                |
| dish-ai-commit.openai.apiKey                    | string  | -                         | OpenAI API 密钥                            |
| dish-ai-commit.openai.baseUrl                   | string  | https://api.openai.com/v1 | OpenAI API 基础 URL                        |
| dish-ai-commit.ollama.baseUrl                   | string  | http://localhost:11434    | Ollama API 基础 URL                        |
| dish-ai-commit.enableDiffSimplification         | boolean | false                     | 启用 diff 内容简化功能                     |
| dish-ai-commit.diffSimplification.maxLineLength | number  | 120                       | 简化后每行的最大长度                       |
| dish-ai-commit.diffSimplification.contextLines  | number  | 3                         | 保留上下文行数                             |
| dish-ai-commit.allowMergeCommits                | boolean | false                     | 是否允许将多个文件的变更合并为一条提交信息 |

### 命令

- `Generate Commit Message`: 根据当前更改生成提交信息
- `Select AI Model`: 选择要使用的 AI 模型

## 配置说明

1. OpenAI 配置

```json
{
  "dish-ai-commit.PROVIDER": "openai",
  "dish-ai-commit.OPENAI_API_KEY": "your-api-key",
  "dish-ai-commit.OPENAI_BASE_URL": "https://api.openai.com/v1"
}
```

2. Ollama 配置

```json
{
  "dish-ai-commit.PROVIDER": "ollama",
  "dish-ai-commit.OLLAMA_BASE_URL": "http://localhost:11434"
}
```

3. VSCode 配置

```json
{
  "dish-ai-commit.PROVIDER": "vscode"
}
```

## 📋 使用方法

- 从源代码管理器中选择要提交的文件
- 点击源代码管理器标题栏中的"Dish AI Commit"图标
- 或在命令面板中执行"Dish AI Commit"命令
- AI 将自动生成符合规范的提交信息

## 📥 安装

1. 从 VS Code 扩展市场搜索 "Dish AI Commit"
2. 点击安装
3. 重启 VS Code
4. 根据实际需求配置 AI 服务参数

## 📝 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解详细的版本更新历史。

## 🤝 贡献指南

我们欢迎所有形式的贡献，包括但不限于：

- 提交 Issue 报告 bug
- 提出新功能建议
- 提交 Pull Request 改进代码
- 完善文档

请确保在提交 PR 之前：

1. 代码经过测试
2. 更新相关文档
3. 遵循项目代码规范

## 📋 依赖要求

- VS Code 1.80.0+
- [SVN 命令行工具](http://subversion.apache.org/packages.html)
- SVN SCM (可选) - 如需在 VSCode 的 SCM 输入框中输入提交信息，请安装 [SVN SCM v2.18.1+](https://github.com/littleCareless/svn-scm/releases/tag/v2.18.1)
- 有效的 AI 服务配置(OpenAI API Key 或 Ollama 服务)

## 💡 常见问题

- 确保 SVN 命令行工具已正确安装并可访问
- 配置正确的 AI 服务参数
- 确保网络可以访问选择的 AI 服务

## 🛠️ 开发指南

1. 克隆仓库
2. 运行 `npm install` 安装依赖
3. 运行 `npm run compile` 编译代码
4. 按 `F5` 启动调试

### 功能特性（补充）

- [ ] **🧠 深度分析和建议**  
       提供更智能的提交信息建议，不仅仅是基于 SVN 变更，还可以根据项目上下文提供改进意见（例如：建议更改某些功能名称，或者指出可能的代码风格改进）。

- [ ] **📈 统计与报告**  
       提供提交统计功能，如提交频率、类型分析、提交信息的质量评分等，帮助开发者更好地了解自己的提交习惯。

- [ ] **🎨 自定义提交模板**  
       允许用户自定义提交信息的模板格式（如：包括关联的 Jira 票号、功能描述等），AI 会根据模板生成符合要求的提交信息。

- [ ] **⚙️ 深度配置选项**  
       提供更多的配置项，比如是否启用 AI 生成的建议，生成提交信息的详细程度，是否自动修改现有提交信息等。

- [ ] **🔒 安全性功能**  
       加密存储 API 密钥，确保敏感信息不被泄露，并提供额外的身份验证机制来提高安全性。

## 🙏 致谢

本项目参考了以下优秀的开源项目：

- [svn-scm](https://github.com/JohnstonCode/svn-scm) - VSCode 的 SVN 源代码管理扩展
- [vscode](https://github.com/microsoft/vscode) - Visual Studio Code 编辑器
- [vscode-gitlens](https://github.com/gitkraken/vscode-gitlens) - VSCode 的 Git 增强扩展
- [ai-commit](https://github.com/Sitoi/ai-commit) - AI 辅助生成 Git 提交信息

## 📄 许可证

该项目是 [MIT](./LICENSE) 许可证。

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
