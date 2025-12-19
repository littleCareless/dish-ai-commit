<div align="center">

# Dish AI Commit Gen

🤖 **AI-Powered VSCode Extension for Intelligent Commit Message Generation**

A powerful VSCode extension that uses AI technology to generate standardized Git/SVN commit messages with intelligent code analysis, semantic indexing, and multi-dimensional generation capabilities.

[Report Bug][github-issues-link] · [Request Feature][github-issues-link] · [View Documentation](#-documentation)

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
[Français](https://www.readme-i18n.com/littleCareless/dish-ai-commit?lang=fr) |
[日本語](https://www.readme-i18n.com/littleCareless/dish-ai-commit?lang=ja) |
[한국어](https://www.readme-i18n.com/littleCareless/dish-ai-commit?lang=ko) |
[Português](https://www.readme-i18n.com/littleCareless/dish-ai-commit?lang=pt) |
[Русский](https://www.readme-i18n.com/littleCareless/dish-ai-commit?lang=ru) |
[中文](https://www.readme-i18n.com/littleCareless/dish-ai-commit?lang=zh)

---

> 💡 **Why Dish AI Commit Gen?**
>
> Unlike other AI commit tools, we provide **the most comprehensive AI provider support** (20+ providers), **pioneering semantic code analysis** (Tree-sitter + Qdrant), and **multi-dimensional intelligent generation** (commits, branches, PR summaries, weekly reports). Built with enterprise-grade architecture following SOLID principles for maximum maintainability and extensibility.

## 🚀 Core Features Overview

### 🤖 AI-Powered Generation

- **Commit Message Generation**: Intelligent commit messages from code changes with context-aware analysis
- **Branch Name Generation**: Smart branch naming based on requirements or code changes
- **PR Summary Generation**: Auto-generate PR titles and descriptions from commit history
- **Weekly Report Generation**: AI-powered work summaries and progress tracking
- **Code Review**: AI-assisted code review with detailed feedback

### 🏗️ Advanced Architecture

- **Modular Design**: SOLID principles, core classes < 200 lines
- **Multi-layer Architecture**: Command → Handler → Builder → Service → Utils
- **Graceful Degradation**: Multi-level fallback for Git and SVN
- **Unified AI Interface**: 20+ providers with consistent API

### 🧠 Intelligent Analysis

- **Semantic Indexing**: Tree-sitter + Qdrant vector database
- **Context Collection**: Automatic code change analysis and context building
- **Framework Detection**: Framework-specific commit suggestions
- **Smart Caching**: LRU cache for performance optimization

### 🎨 Modern UI

- **Interactive Chat**: Real-time commit generation through natural language
- **Dynamic Settings**: Schema-driven auto-generated configuration UI
- **Multi-language Support**: 18 languages including English and Chinese
- **System Notifications**: Cross-platform native notifications

## ✨ What's New (v0.56.1)

### 🔥 Latest Features

- **Xiaomi MiMo Support**: Added Xiaomi's MiMo as a new AI service provider
- **Enhanced Settings Migration**: Improved robustness and traceability for settings migration
- **Framework-Specific Suggestions**: Intelligent commit suggestions based on project type
- **Commit Caching**: LRU cache mechanism to improve performance
- **New User Onboarding**: Enhanced guidance and configuration file robustness
- **Performance Optimizations**: Optimized commit generation and logging

### 📊 Recent Major Features

- **Cross-Repository Support**: Handle multiple repositories in single workspace
- **Function Calling Mode**: Structured commit messages via AI function calling
- **Dynamic Settings UI**: Auto-generated configuration interface
- **System Notifications**: Native notifications (macOS, Windows, Linux)
- **Layered Commits**: Multi-file commit with detailed descriptions

## 🤖 Comprehensive AI Provider Support

### Provider Categories

| Category                | Providers                                                             | Key Features                     | Best For                    |
| ----------------------- | --------------------------------------------------------------------- | -------------------------------- | --------------------------- |
| **Premium AI**          | OpenAI (GPT-3.5/4/4o, o1-preview/mini)                                | Highest quality, latest models   | Production use              |
| **Local Deployment**    | Ollama, LM Studio                                                     | 100+ open-source models, privacy | Data-sensitive environments |
| **VSCode Integration**  | GitHub Copilot                                                        | Built-in VSCode AI service       | Copilot subscribers         |
| **Chinese AI Services** | Zhipu AI, DashScope, Doubao, Deepseek, Baidu Qianfan, **Xiaomi MiMo** | Excellent Chinese processing     | Chinese users               |
| **International**       | Gemini, Claude, Mistral, SiliconFlow, OpenRouter                      | Global reach, diverse options    | International teams         |
| **Enterprise**          | Azure OpenAI, Vertex AI, Cloudflare Workers AI                        | Enterprise-grade security        | Large organizations         |
| **Open Source**         | Together AI, X.AI (Grok), Groq, Prem AI                               | Cost-effective, community-driven | Budget-conscious users      |

### 🆓 Free AI Models

- **Zhipu AI (GLM-4-Flash)**: Fixed monthly free quota ([Get API Key](https://open.bigmodel.cn/usercenter/apikeys))
- **Gemini AI**: 1,500 free requests per day ([Get API Key](https://makersuite.google.com/app/apikey))
- **Ollama**: Completely free local deployment with 100+ models
- **LM Studio**: Free local model hosting and management
- **Xiaomi MiMo**: Competitive pricing with excellent Chinese support

## 📝 Version Control System Support

### Git Support

- **VS Code Git API**: Full integration with VS Code's Git extension
- **CLI Fallback**: Command-line Git operations when API unavailable
- **Multi-repository**: Handle multiple Git repositories in workspace
- **Smart Detection**: Automatic repository detection and switching

### SVN Support

- **SVN SCM Extension**: Integration with VS Code SVN extension
- **CLI Implementation**: Direct SVN command-line operations
- **Graceful Degradation**: 3-level fallback (API → CLI → Simple CLI)
- **Unified Interface**: Same API as Git for seamless switching

## 🏗️ Architecture Highlights

### Modular Design (SOLID Principles)

```
┌─────────────────────────────────────────┐
│           Command Layer                 │
│  GenerateCommitCommand (222 lines)      │
│  GenerateBranchNameCommand (146 lines)  │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Handler Layer                   │
│  • StreamingHandler                     │
│  • FunctionCallingHandler              │
│  • LayeredCommitHandler                │
│  • CrossRepositoryHandler              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Builder Layer                   │
│  • CommitContextBuilder                │
│  • CommitMessageBuilder                │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Service Layer                   │
│  • CommitCacheService                  │
│  • NotificationService                 │
│  • SettingsMigration                   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Utils Layer                     │
│  • StreamingGenerationHelper           │
│  • ContextCollector                    │
│  • CommitFormatter                     │
└─────────────────────────────────────────┘
```

### Performance Optimizations

- **Smart Caching**: LRU cache with MD5-based keys (50 items max)
- **Incremental Indexing**: Only updates changed files
- **Context Management**: Intelligent prompt length optimization
- **Request Retries**: Automatic retry with exponential backoff

## ⚙️ Configuration

### Core Settings

| Configuration                                            | Type    | Default                | Description              |
| -------------------------------------------------------- | ------- | ---------------------- | ------------------------ |
| `dish-ai-commit.base.language`                           | string  | Simplified Chinese     | Commit message language  |
| `dish-ai-commit.base.provider`                           | string  | OpenAI                 | Active AI provider       |
| `dish-ai-commit.base.model`                              | string  | gpt-3.5-turbo          | Active AI model          |
| `dish-ai-commit.providers.openai.apiKey`                 | string  | ""                     | OpenAI API key           |
| `dish-ai-commit.providers.mimo.apiKey`                   | string  | ""                     | Xiaomi MiMo API key      |
| `dish-ai-commit.providers.ollama.baseUrl`                | string  | http://localhost:11434 | Ollama API URL           |
| `dish-ai-commit.features.commitFormat.enableEmoji`       | boolean | true                   | Use emoji in commits     |
| `dish-ai-commit.features.commitFormat.enableBody`        | boolean | true                   | Include commit body      |
| `dish-ai-commit.features.commitFormat.enableMergeCommit` | boolean | false                  | Merge multiple files     |
| `dish-ai-commit.features.codeIndex.enabled`              | boolean | false                  | Enable semantic indexing |
| `dish-ai-commit.features.codeIndex.provider`             | string  | ollama                 | Embedding provider       |
| `dish-ai-commit.features.codeIndex.qdrantUrl`            | string  | http://localhost:6333  | Qdrant URL               |

### Available Commands

| Command ID                             | Title                  | Description                  |
| -------------------------------------- | ---------------------- | ---------------------------- |
| `dish-ai-commit.selectModel`           | Select AI Model        | Choose provider and model    |
| `dish-ai-commit.generateCommitMessage` | Generate Commit        | Generate commit from changes |
| `dish-ai-commit.generateBranchName`    | Generate Branch Name   | Create standardized branch   |
| `dish-ai-commit.generateWeeklyReport`  | Generate Weekly Report | AI-powered work summary      |
| `dish-ai-commit.generatePRSummary`     | Generate PR Summary    | PR title and description     |
| `dish-ai-commit.reviewCode`            | Code Review            | AI-assisted code review      |

## 📋 Configuration Examples

### 1. OpenAI Configuration

```json
{
  "dish-ai-commit.base.provider": "openai",
  "dish-ai-commit.providers.openai.apiKey": "sk-...",
  "dish-ai-commit.providers.openai.baseUrl": "https://api.openai.com/v1"
}
```

### 2. Xiaomi MiMo Configuration

```json
{
  "dish-ai-commit.base.provider": "mimo",
  "dish-ai-commit.providers.mimo.apiKey": "your-mimo-key"
}
```

### 3. Ollama Local Configuration

```json
{
  "dish-ai-commit.base.provider": "ollama",
  "dish-ai-commit.providers.ollama.baseUrl": "http://localhost:11434"
}
```

### 4. GitHub Copilot Configuration

```json
{
  "dish-ai-commit.base.provider": "vscode"
}
```

## 🚀 Quick Start

### Installation

1. Search "Dish AI Commit" in VS Code Extension Marketplace
2. Click Install
3. Restart VS Code
4. Configure your preferred AI provider

### Basic Usage

#### Generate Commit Message

1. Open Source Control view (Git or SVN)
2. Select files to commit
3. Click "Dish AI Commit" icon in SCM title bar
4. Or use Command Palette: `Dish AI Commit: Generate Commit Message`
5. AI generates commit message automatically

#### Generate Branch Name

1. Use Command Palette: `Dish AI Commit: Generate Branch Name`
2. Choose mode:
   - **From Description**: Enter feature description
   - **From Changes**: Use current code changes
3. Select from suggested branch names
4. Branch is created automatically

#### Interactive Chat

1. Open Command Palette: `Dish AI Commit: Open Chat Interface`
2. Type your requirements in natural language
3. Use commands: `/help`, `/template`, `/style`, `/language`
4. Get real-time commit suggestions

## 📚 Documentation

### Core Modules

- **[Project Structure](src/README.md)** - Complete architecture overview
- **[AI Model Registry](src/ai/model-registry/README.md)** - Model management system
- **[Generate Commit](src/commands/generate-commit/README.md)** - Commit generation architecture
- **[Generate Branch Name](src/commands/generate-branch-name/README.md)** - Branch generation architecture
- **[SVN SCM](src/scm/svn/README.md)** - SVN support with graceful degradation
- **[WebView UI](webview-ui/README.md)** - Modern React-based interface
- **[Commit Chat](webview-ui/src/components/commit-chat/README.md)** - Interactive chat features

### Architecture Deep Dive

- **Modular Design**: All core commands follow SOLID principles
- **Graceful Degradation**: Multi-level fallback mechanisms
- **Performance**: LRU caching, incremental indexing, smart context management
- **Security**: Secret storage, input validation, error handling

## 🛠️ Development

### Prerequisites

- Node.js 18.20.8+
- pnpm 10.0.0+
- VS Code 1.80.0+

### Setup

```bash
# Clone repository
git clone https://github.com/littleCareless/dish-ai-commit
cd dish-ai-commit

# Install dependencies
pnpm install

# Start development
pnpm dev

# Build extension
pnpm build

# Package extension
pnpm package
```

### Project Structure

```
src/
├── ai/                    # AI providers and model registry
├── commands/              # Feature commands (commit, branch, etc.)
├── scm/                   # Git/SVN integration
├── services/              # Business services (cache, notification)
├── config/                # Configuration schema
├── core/                  # Core extension logic
├── utils/                 # Utility functions
├── i18n/                  # Internationalization
├── prompt/                # AI prompt templates
└── extension.ts           # Extension entry point

webview-ui/
├── src/                   # React frontend
│   ├── components/        # UI components
│   ├── services/          # Webview services
│   └── hooks/             # React hooks
└── package.json           # Frontend dependencies
```

### Code Quality Standards

- ✅ Single file < 500 lines (core classes < 200 lines)
- ✅ Clear separation of concerns
- ✅ Comprehensive TypeScript types
- ✅ Unit tests for critical paths
- ✅ Documentation for public APIs

## 🤝 Contributing

We welcome all contributions!

### How to Contribute

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Contribution Guidelines

- Follow existing code style and patterns
- Add tests for new functionality
- Update documentation
- Ensure all checks pass
- Reference related issues

### Development Workflow

```bash
# Install dependencies
pnpm install

# Start development mode
pnpm dev

# Run tests
pnpm test

# Check types
pnpm check-types

# Lint code
pnpm lint

# Format code
pnpm format
```

## 📊 Project Statistics

### Code Metrics

- **Total Files**: 100+ TypeScript files
- **Core Commands**: 2 main commands (refactored to < 400 lines total)
- **AI Providers**: 20+ supported
- **Languages**: 18 supported languages
- **Test Coverage**: Comprehensive unit tests

### Refactoring Achievements

- **GenerateCommit**: 636 lines → 222 lines (65% reduction)
- **GenerateBranchName**: 674 lines → 146 lines (78% reduction)
- **Architecture**: Monolithic → Modular (SOLID principles)

## 🙏 Acknowledgments

This project is inspired by and references these excellent open source projects:

- [svn-scm](https://github.com/JohnstonCode/svn-scm) - SVN source control management
- [vscode](https://github.com/microsoft/vscode) - VS Code editor and API
- [vscode-gitlens](https://github.com/gitkraken/vscode-gitlens) - Git supercharged
- [ai-commit](https://github.com/Sitoi/ai-commit) - AI commit generation
- [vscode-copilot-chat](https://github.com/microsoft/vscode-copilot-chat) - AI chat features

## 📄 License

This project is [MIT](./LICENSE) licensed.

---

**Version**: v0.56.1
**Last Updated**: December 2024
**Architecture**: SOLID Principles
**Status**: ✅ Production Ready

[github-issues-link]: https://github.com/littleCareless/dish-ai-commit/issues
[github-contributors-link]: https://github.com/littleCareless/dish-ai-commit/graphs/contributors
[github-forks-link]: https://github.com/littleCareless/dish-ai-commit/network/members
[github-stars-link]: https://github.com/littleCareless/dish-ai-commit/network/stargazers
[vscode-marketplace-link]: https://marketplace.visualstudio.com/items?itemName=littleCareless.dish-ai-commit
[github-license-link]: https://github.com/littleCareless/dish-ai-commit/blob/main/LICENSE
[github-contributors-shield]: https://img.shields.io/github/contributors/littleCareless/dish-ai-commit?color=c4f042&labelColor=black&style=flat-square
[github-forks-shield]: https://img.shields.io/github/forks/littleCareless/dish-ai-commit?color=8ae8ff&labelColor=black&style=flat-square
[github-stars-shield]: https://img.shields.io/github/stars/littleCareless/dish-ai-commit?color=ffcb47&labelColor=black&style=flat-square
[github-issues-shield]: https://img.shields.io/github/issues/littleCareless/dish-ai-commit?color=ff80eb&labelColor=black&style=flat-square
[vscode-marketplace-shield]: https://img.shields.io/vscode-marketplace/v/littleCareless.dish-ai-commit.svg?label=vscode%20marketplace&color=blue&labelColor=black&style=flat-square
[total-installs-shield]: https://img.shields.io/vscode-marketplace/d/littleCareless.dish-ai-commit.svg?&color=greeen&labelColor=black&style=flat-square
[avarage-rating-shield]: https://img.shields.io/vscode-marketplace/r/littleCareless.dish-ai-commit.svg?&color=green&labelColor=black&style=flat-square
[github-license-shield]: https://img.shields.io/github/license/littleCareless/dish-ai-commit?color=white&labelColor=black&style=flat-square
