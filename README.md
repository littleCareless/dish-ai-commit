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

在 VS Code 设置中配置以下参数：

```json
{
  "svn-ai-commit.OPENAI_API_KEY": "你的 OpenAI API 密钥",
  "svn-ai-commit.OLLAMA_BASE_URL": "Ollama 服务地址",
  "svn-ai-commit.defaultProvider": "选择默认 AI 提供商 (openai/ollama)",
  "svn-ai-commit.language": "生成的提交信息语言"
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

## 📄 许可证

MIT License
