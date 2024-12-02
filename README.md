# SVN AI Commit

一个 VS Code 扩展，用于使用 AI 自动生成 SVN 提交信息。

## 功能特性

- 🤖 支持 OpenAI 和 Ollama 两种 AI 服务提供商
- 📝 自动分析 SVN 变更并生成相应的提交信息
- 🔍 支持选择特定文件生成提交信息
- 🔄 提供模型列表实时刷新功能
- ✅ 完整的配置验证和错误提示

## 命令列表

- `SVN AI Commit: Generate Commit Message` - 生成提交信息
- `SVN AI Commit: Show Available Models` - 显示可用的 AI 模型
- `SVN AI Commit: Refresh Models` - 刷新模型列表

## 配置项

在 VS Code 设置中配置以下参数 1：

```json
{
  "dish-ai-commit.OPENAI_API_KEY": "你的 OpenAI API 密钥",
  "dish-ai-commit.OLLAMA_BASE_URL": "Ollama 服务地址",
  "dish-ai-commit.defaultProvider": "选择默认 AI 提供商 (openai/ollama)",
  "dish-ai-commit.language": "生成的提交信息语言"
}
```

## 📋 依赖要求

- VS Code
- SVN 命令行工具
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

- [ ] **🔄 多语言支持**  
  支持生成提交信息的多语言版本，用户可以选择使用不同的语言（如中文、英文、法语等）生成提交信息。

- [ ] **🧠 深度分析和建议**  
  提供更智能的提交信息建议，不仅仅是基于 SVN 变更，还可以根据项目上下文提供改进意见（例如：建议更改某些功能名称，或者指出可能的代码风格改进）。

- [ ] **🔄 自动同步 AI 模型**  
  当新模型可用时，自动更新模型列表，无需用户手动刷新。

- [ ] **📈 统计与报告**  
  提供提交统计功能，如提交频率、类型分析、提交信息的质量评分等，帮助开发者更好地了解自己的提交习惯。

- [ ] **🎨 自定义提交模板**  
  允许用户自定义提交信息的模板格式（如：包括关联的 Jira 票号、功能描述等），AI 会根据模板生成符合要求的提交信息。

- [ ] **⚙️ 深度配置选项**  
  提供更多的配置项，比如是否启用 AI 生成的建议，生成提交信息的详细程度，是否自动修改现有提交信息等。

- [ ] **🧩 支持 Git-SVN 混合工作流**  
  对于需要同时使用 Git 和 SVN 的项目，提供混合工作流支持，让用户在 Git 和 SVN 之间无缝切换。

- [ ] **🔒 安全性功能**  
  加密存储 API 密钥，确保敏感信息不被泄露，并提供额外的身份验证机制来提高安全性。



## 📄 许可证

MIT License
