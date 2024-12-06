# Dish AI Commit Gen

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

- `dish-ai-commit.PROVIDER`: AI 提供商选择 (openai/ollama/vscode)
- `dish-ai-commit.MODEL`: 使用的 AI 模型
- `dish-ai-commit.OPENAI_API_KEY`: OpenAI API 密钥
- `dish-ai-commit.OPENAI_BASE_URL`: OpenAI API 基础地址
- `dish-ai-commit.OLLAMA_BASE_URL`: Ollama API 地址
- `dish-ai-commit.AI_COMMIT_LANGUAGE`: 生成提交信息的语言
- `dish-ai-commit.AI_COMMIT_SYSTEM_PROMPT`: 自定义系统提示词

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
- AI 将自动生成符合规范��提交信息

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

## 📄 许可证

MIT License
