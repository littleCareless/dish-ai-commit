<div align="center">

<h1>Dish AI Commit Gen</h1>

A powerful VSCode extension that uses AI technology to generate standardized Git/SVN commit messages. Supports multiple AI providers with intelligent code analysis and semantic indexing capabilities.

[Report Bug][github-issues-link] · [Request Feature][github-issues-link]

<!-- SHIELD GROUP -->

[![][github-contributors-shield]][github-contributors-link]
[![][github-forks-shield]][github-forks-link]
[![][github-stars-shield]][github-stars-link]
[![][github-issues-shield]][github-issues-link]
[![][vscode-marketplace-shield]][vscode-marketplace-link]
[![][total-installs-shield]][total-installs-link]
[![][avarage-rating-shield]][avarage-rating-link]
[![][github-license-shield]][github-license-link]

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



> 💡 **Why Choose Us?** Compared to other AI commit tools, we provide the most comprehensive AI provider support, pioneering semantic code analysis, and multi-dimensional intelligent generation features, making us the best choice for developers.

## 🚀 Core Features Overview

- **AI-Powered Commit Generation**: Intelligent commit message creation from code changes with context-aware analysis
- **Multi-VCS Support**: Works with both Git and SVN version control systems
- **20+ AI Providers**: OpenAI, Ollama, GitHub Copilot, Zhipu AI, DashScope, Gemini, Anthropic Claude, Mistral AI, and more (including free options, local deployment with Ollama, and enterprise solutions like Azure OpenAI, Vertex AI, Cloudflare Workers AI)
- **Semantic Code Analysis**: Tree-sitter + Qdrant vector database to provide precise context for commit message generation
- **Multi-language Support**: 19 languages including English and Chinese
- **Standardized Commit Format**: Follows Conventional Commits specification with intelligent emoji matching
- **PR Summary Generation**: Auto-generate PR titles and descriptions from commit history
- **Branch Name Generation**: Smart branch naming based on requirements or code changes
- **Weekly Report Generation**: AI-powered work summaries and progress tracking
- **Code Review**: AI-assisted code review with detailed feedback
- **Interactive Chat Interface**: Real-time commit generation through natural language
- **Dynamic Settings UI**: Auto-generated configuration interface based on schema
- **Cross-repository Support**: Handle multiple repositories in single workspace

## 🎯 Unique Advantages Over Competitors

### 1. **Most Comprehensive AI Provider Support**
- Support for 10+ mainstream AI services, including free options
- One-click switching between different AI models to meet various scenario needs

### 2. **Intelligent Semantic Analysis**
- Pioneering code semantic indexing based on tree-sitter
- Provides more accurate code change understanding and contextual analysis

### 3. **Multi-dimensional Intelligent Generation**
- Not only generates commit messages, but also supports PR summaries, branch names, and weekly reports
- One-stop solution for developer documentation needs

### 4. **Enterprise-grade Features**
- Support for both SVN and Git version control systems
- Dynamic configuration interface suitable for team collaboration
- Comprehensive error handling and user feedback mechanisms

## ✨ What's New

- **PR Summary Generation**: Automatically generate PR titles and descriptions based on Git commit history.
- **Code Semantic Indexing and Search**: Utilizes `tree-sitter` and a vector database (Qdrant) to index the codebase semantically, providing richer context for generating commit messages and code reviews.
- **Function Calling Mode**: An experimental feature that generates structured commit messages through the AI's function-calling capabilities.
- **Dynamic Settings UI**: The plugin's settings interface is now dynamically generated based on configuration definitions, offering more flexible and detailed options.

## Features

### 🤖 Comprehensive AI Provider Support

Our extension supports 20+ AI providers, making it the most comprehensive AI-powered commit message generator available:

| Category | Providers | Key Features | Best For |
|----------|-----------|--------------|----------|
| **Premium AI** | OpenAI (GPT-3.5, GPT-4, GPT-4o, o1-preview, o1-mini) | Highest quality, latest models | Production use, high-quality requirements |
| **Local Deployment** | Ollama, LM Studio | 100+ open-source models, complete privacy | Data-sensitive environments, offline use |
| **VSCode Integration** | GitHub Copilot | Built-in VSCode AI service | Copilot subscribers |
| **Chinese AI Services** | Zhipu AI (GLM-4), DashScope (Alibaba), Doubao (ByteDance), Deepseek, Baidu Qianfan | Excellent Chinese processing, enterprise support | Chinese users, enterprise applications |
| **International Services** | Gemini AI, Anthropic Claude, Mistral AI, SiliconFlow, OpenRouter | Global reach, diverse model options | International teams, model flexibility |
| **Enterprise Solutions** | Azure OpenAI, Vertex AI, Cloudflare Workers AI | Enterprise-grade security and compliance | Large organizations, compliance requirements |
| **Open Source** | Together AI, X.AI (Grok), Groq, Prem AI | Cost-effective, community-driven | Budget-conscious users, open-source projects |

#### 🆓 Free AI Models

- **Zhipu AI (GLM-4-Flash)**: Fixed monthly free quota ([Get API Key](https://open.bigmodel.cn/usercenter/apikeys))
- **Gemini AI**: 1,500 free requests per day ([Get API Key](https://makersuite.google.com/app/apikey))
- **Ollama**: Completely free local deployment with 100+ models
- **LM Studio**: Free local model hosting and management

### 📝 Version Control System Support

- **Git**: Full support for Git repositories with advanced features
- **SVN**: Complete SVN integration with commit message generation
- **Cross-repository**: Handle multiple repositories in single workspace
- **Mixed Environments**: Seamlessly work with both Git and SVN projects

### 📊 Weekly Report Generation

- **AI-Powered Summaries**: Automatically generate comprehensive weekly work reports
- **Progress Tracking**: Analyze commit history and code changes to summarize progress
- **Customizable Templates**: Create personalized report formats and structures
- **Multi-Provider Support**: Use any supported AI provider for report generation
- **Export Options**: Generate reports in various formats for sharing

### 🌿 Branch Name Generation

- **Smart Branch Naming**: Automatically generate standardized branch names based on requirements
- **Multiple Input Modes**: Generate from feature descriptions or code changes
- **Naming Conventions**: Support various branch naming patterns and formats
- **AI Integration**: Seamless integration with all supported AI providers
- **Team Consistency**: Ensure consistent branch naming across development teams

### 🧠 Advanced Code Analysis & Semantic Indexing

- **Tree-sitter Integration**: Deep code parsing and analysis for 30+ programming languages
- **Vector Database**: Qdrant-powered semantic code indexing for intelligent context understanding
- **Semantic Block Extraction**: Identify and extract functions, classes, interfaces, and methods
- **Intelligent Context Collection**: Automatic code change analysis and context building
- **Multi-embedding Support**: OpenAI, Ollama, and OpenAI-compatible embedding services
- **Incremental Indexing**: Smart updates only for changed files, improving performance

### 🎨 Modern WebView Interface

- **Interactive Chat Interface**: Real-time commit message generation through natural language conversation
- **Dynamic Settings UI**: Auto-generated configuration interface based on schema definitions
- **Theme Support**: Light/dark theme switching with VS Code integration
- **Responsive Design**: Modern React-based UI with Tailwind CSS styling
- **Real-time Preview**: Live commit message preview and editing capabilities
- **Command Palette Integration**: Quick access to all features through VSCode command palette

### ⚙️ Enterprise-Grade Configuration

- **Dynamic Configuration**: Schema-driven settings with automatic validation
- **Model Selection**: Quick AI provider and model switching with real-time updates
- **Token Statistics**: Comprehensive usage tracking and cost monitoring
- **Custom Prompts**: Personalized system prompts for different scenarios and use cases
- **Workspace Integration**: Project-specific configuration management and inheritance
- **Configuration Validation**: Automatic validation of settings and API keys

### 🌍 Multi-language Commit Message Generation

Supports the following 19 languages:

- Simplified Chinese (简体中文)
- Traditional Chinese (繁體中文)
- Japanese (日本語)
- Korean (한국어)
- Czech (Čeština)
- German (Deutsch)
- French (Français)
- Italian (Italiano)
- Dutch (Nederlands)
- Portuguese (Português)
- Vietnamese (Tiếng Việt)
- English
- Spanish (Español)
- Swedish (Svenska)
- Russian (Русский)
- Bahasa Indonesia
- Polish (Polski)
- Turkish (Türkçe)
- Thai (ไทย)

### 🎨 Conventional Commits Compliant

Generates commit messages following the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- Commit Message Format:

  ```
  <type>[optional scope]: <description>

  [optional body]

  [optional footer(s)]
  ```

- Supported Commit Types:

  - `feat`: New feature
  - `fix`: Bug fix
  - `docs`: Documentation changes
  - `style`: Code style adjustments
  - `refactor`: Code refactoring
  - `perf`: Performance improvements
  - `test`: Test-related changes
  - `build`: Build-related changes
  - `ci`: CI/CD-related changes
  - `chore`: Other changes
  - `revert`: Revert commits

- Automatic Scope Detection:

  - Automatically inferred from modified file paths
  - Smart categorization for multi-file changes
  - Customizable scope rules via configuration

- Breaking Changes Support:

  - Mark breaking changes with `!`
  - Detailed impact description in body
  - Example: `feat!: Restructure authentication system`

- Intelligent Description Generation:
  - Automatic code change analysis
  - Key modification point extraction
  - Clear and concise description generation

### 😄 Automatic Emoji Addition

- Automatically adds emojis to commit messages
- Can be enabled/disabled through configuration:

```json
{
  "dish-ai-commit.features.commitFormat.enableEmoji": true // Enable emoji
}
```

- Emojis automatically match commit types:
  - ✨ feat: New features
  - 🐛 fix: Bug fixes
  - 📝 docs: Documentation
  - 💄 style: Styling
  - ♻️ refactor: Refactoring
  - ⚡️ perf: Performance
  - ✅ test: Testing
  - 🔧 chore: Other changes

### 📊 Code Analysis Features

- Intelligent code difference analysis
- Automatically simplify complex code changes
- Preserve key context information

### 🔄 Merge Commit Support

By enabling the enableMergeCommit option, you can:

- Merge changes from multiple related files into a single commit message
- Automatically analyze file associations
- Generate more concise commit records

### 📋 Subject-Only Commit Messages

By disabling the enableBody option, you can:

- Generate commit messages with only the subject line (without body content)
- Create more concise commit history
- Focus on the essential information

Enable/disable through configuration:

```json
{
  "dish-ai-commit.features.commitFormat.enableBody": false // Disable commit message body
}
```

### 📝 Weekly Report Templates

Weekly report generation supports custom templates:

- Customize prompts via systemPrompt configuration
- Summarize by project/task
- Customize report format and key content

### 🚀 PR Summary Generation

- **Automatic PR Summary Generation**: Automatically generate PR titles and descriptions based on Git commit history.
- **Multi-AI Provider Support**: Supports multiple AI providers for summary generation.
- **Customizable**: Customizable summary templates.

### 🧠 Code Semantic Indexing and Search

- **Semantic Indexing**: Utilizes `tree-sitter` and a vector database (Qdrant) to index the codebase semantically.
- **Context Enhancement**: Provides richer context for generating commit messages and code reviews.
- **Multi-embedding Service Support**: Supports multiple embedding services like Ollama and Qdrant.

### 📞 Function Calling Mode

- **Structured Commits**: An experimental feature that generates structured commit messages through the AI's function-calling capabilities.
- **Tool Integration**: Allows the AI model to return structured commit message data through specified tools.

### ⚙️ Dynamic Settings UI

- **Dynamic Generation**: The plugin's settings interface is now dynamically generated based on configuration definitions.
- **Flexible Configuration**: Offers more flexible and detailed configuration options.

### 📢 System Notifications

- **Instant Feedback**: Receive system-level notifications upon successful generation of commit messages or weekly reports.
- **Cross-Platform**: Utilizes `node-notifier` to support native notifications on macOS, Windows, and Linux.
- **Dependencies**: This feature relies on native system libraries. Please ensure your system has the necessary components installed for notifications to work correctly (e.g., `SnoreToast` on Windows, `terminal-notifier` on macOS).

## Configuration

| Configuration                                          | Type    | Default                   | Description                                         |
| ------------------------------------------------------ | ------- | ------------------------- | --------------------------------------------------- |
| dish-ai-commit.base.language                           | string  | Simplified Chinese        | Commit message language                             |
| dish-ai-commit.base.systemPrompt                       | string  | ""                        | Custom system prompt                                |
| dish-ai-commit.base.provider                           | string  | OpenAI                    | AI provider                                         |
| dish-ai-commit.base.model                              | string  | gpt-3.5-turbo             | AI model                                            |
| dish-ai-commit.providers.openai.apiKey                 | string  | ""                        | OpenAI API key                                      |
| dish-ai-commit.providers.openai.baseUrl                | string  | https://api.openai.com/v1 | OpenAI API base URL                                 |
| dish-ai-commit.providers.zhipu.apiKey                  | string  | ""                        | Zhipu AI API key                                    |
| dish-ai-commit.providers.dashscope.apiKey              | string  | ""                        | DashScope API key                                   |
| dish-ai-commit.providers.doubao.apiKey                 | string  | ""                        | Doubao API key                                      |
| dish-ai-commit.providers.ollama.baseUrl                | string  | http://localhost:11434    | Ollama API base URL                                 |
| dish-ai-commit.providers.gemini.apiKey                 | string  | ""                        | Gemini AI API key                                   |
| dish-ai-commit.providers.deepseek.apiKey               | string  | ""                        | Deepseek AI API key                                 |
| dish-ai-commit.providers.siliconflow.apiKey            | string  | ""                        | SiliconFlow API key                                 |
| dish-ai-commit.providers.openrouter.apiKey             | string  | ""                        | OpenRouter API key                                  |
| dish-ai-commit.features.codeAnalysis.simplifyDiff      | boolean | false                     | Enable diff content simplification                  |
| dish-ai-commit.features.commitFormat.enableMergeCommit | boolean | false                     | Allow merging multiple file changes into one commit |
| dish-ai-commit.features.commitFormat.enableEmoji       | boolean | true                      | Use emoji in commit messages                        |
| dish-ai-commit.features.commitFormat.enableBody        | boolean | true                      | Include body content in commit messages             |
| dish-ai-commit.features.weeklyReport.systemPrompt      | string  | ""                        | Custom system prompt for weekly reports             |
| dish-ai-commit.features.prSummary.systemPrompt         | string  | ""                        | Custom system prompt for PR summaries               |
| dish-ai-commit.features.codeIndex.enabled              | boolean | false                     | Enable code semantic indexing                       |
| dish-ai-commit.features.codeIndex.provider             | string  | "ollama"                  | Embedding provider for code indexing                |
| dish-ai-commit.features.codeIndex.model                | string  | "nomic-embed-text"        | Embedding model for code indexing                   |
| dish-ai-commit.features.codeIndex.qdrantUrl            | string  | "http://localhost:6333"   | Qdrant vector database URL                          |

### Commands

| Command ID                           | Category         | Title                                       | Description                                                        |
| ------------------------------------ | ---------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| dish-ai-commit.selectModel           | [Dish AI Commit] | Select the AI ​​model for commit generation | Select the AI ​​model for generating commit messages               |
| dish-ai-commit.generateWeeklyReport  | [Dish AI Commit] | Generate weekly report                      | Generate AI-driven weekly work report                              |
| dish-ai-commit.generateBranchName    | [Dish AI Commit] | Generate branch name                        | Generate standardized branch name based on requirement description |
| dish-ai-commit.generateCommitMessage | [Dish AI Commit] | Generate commit message                     | Generate a commit message that complies with the specification     |
| dish-ai-commit.reviewCode            | [Dish AI Commit] | Code review                                 | AI-assisted code review                                            |
| dish-ai-commit.generatePRSummary     | [Dish AI Commit] | Generate PR Summary                         | Generate PR summary based on Git commit history                    |

## Configuration Instructions

1. OpenAI Configuration

```json
{
  "dish-ai-commit.base.provider": "openai",
  "dish-ai-commit.providers.openai.apiKey": "your-api-key",
  "dish-ai-commit.providers.openai.baseUrl": "https://api.openai.com/v1"
}
```

2. Ollama Configuration

```json
{
  "dish-ai-commit.base.provider": "ollama",
  "dish-ai-commit.providers.ollama.baseUrl": "http://localhost:11434"
}
```

3. VSCode Configuration

```json
{
  "dish-ai-commit.base.provider": "vscode"
}
```

4. Deepseek AI Configuration

```json
{
  "dish-ai-commit.base.provider": "deepseek",
  "dish-ai-commit.providers.deepseek.apiKey": "your-api-key"
}
```

5. SiliconFlow Configuration

```json
{
  "dish-ai-commit.base.provider": "siliconflow",
  "dish-ai-commit.providers.siliconflow.apiKey": "your-api-key"
}
```

6. OpenRouter Configuration

```json
{
  "dish-ai-commit.base.provider": "openrouter",
  "dish-ai-commit.providers.openrouter.apiKey": "your-api-key"
}
```

## 📋 How to use

- Select the file to be submitted from the source code manager
- Click the "Dish AI Commit" icon in the source code manager title bar
- Or execute the "Dish AI Commit" command in the command panel
- AI will automatically generate a submission message that meets the specifications

## 📥 Install

1. Search "Dish AI Commit" from the VS Code extension market
2. Click to install
3. Restart VS Code
4. Configure AI service parameters according to actual needs

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed version history.

## 📋 Dependency Requirements

- VS Code 1.80.0+
- [SVN Command Line Tool](http://subversion.apache.org/packages.html)
- SVN SCM (Optional) - Install [SVN SCM v2.18.1+](https://marketplace.visualstudio.com/items?itemName=littleCareless.svn-scm-ai) if you need to enter commit messages in VSCode's SCM input box
  - Download the latest version of the SVN SCM extension from the [release page](https://marketplace.visualstudio.com/items?itemName=littleCareless.svn-scm-ai)
- Git SCM (Optional) - Install [Git SCM](https://marketplace.visualstudio.com/items?itemName=vscode.git) if you need to enter commit messages in VSCode's SCM input box
- Valid AI service configuration (OpenAI API Key or Ollama service)

## 💡 Frequently asked questions

- Ensure that the SVN command line tool is correctly installed and accessible
- Ensure that the SVN SCM extension is correctly installed and enabled
- Configure the correct AI service parameters
- Ensure that the network can access the selected AI service

## 🛠️ Development Guide

You can use Github Codespaces for online development:

[![github-codespace][github-codespace-shield]][github-codespace-link]

Alternatively, you can clone the repository and run the following command for local development:

```bash
$ git clone https://github.com/littleCareless/dish-ai-commit
$ cd dish-ai-commit
$ npm install
```

Open the project folder in VSCode. Press F5 to run the project. A new Extension Development Host window will pop up and start the extension.

## 🤝 Contribution Guidelines

We welcome all forms of contributions, including but not limited to:

- Submit [Issues][github-issues-link] to report bugs
- Propose new features
- Submit Pull Request to improve the code
- Improve the documentation

Please make sure before submitting a PR:

1. The code has been tested

2. Update the relevant documents

3. Follow the project code specifications

[![][pr-welcome-shield]][pr-welcome-link]

### 💗 Thanks to our contributors

[![][github-contrib-shield]][github-contrib-link]

## 🙏 Acknowledgments

This project is inspired by and references these excellent open source projects:

- [svn-scm](https://github.com/JohnstonCode/svn-scm) - SVN source control management for VSCode
- [vscode](https://github.com/microsoft/vscode) - Visual Studio Code editor
- [vscode-gitlens](https://github.com/gitkraken/vscode-gitlens) - Git supercharged for VSCode
- [ai-commit](https://github.com/Sitoi/ai-commit) - AI assisted Git commit message generation
- [vscode-copilot-chat](https://github.com/microsoft/vscode-copilot-chat) - AI chat features powered by Copilot

## 📄 License

This project is [MIT](./LICENSE) licensed.

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
