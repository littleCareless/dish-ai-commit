<div align="center">

<h1>Dish AI Commit Gen</h1>

A VSCode extension for generating standardized Git/SVN commit messages using AI

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

A VSCode extension for generating standardized Git/SVN commit messages using AI. Supports OpenAI, Ollama, VSCode built-in AI services, Zhipu AI, DashScope, Gemini AI, and Doubao AI.

### 🆓 Free AI Model Support

- Zhipu AI (GLM-4-Flash)

  - Free Quota: Fixed monthly free quota per account ([Rate limiting guidelines](https://open.bigmodel.cn/dev/howuse/rate-limits))
  - [Get Zhipu API Key here](https://open.bigmodel.cn/usercenter/apikeys)

- Gemini AI (gemini-2.0-flash-exp)
  - Free Quota: 10 RPM 1500 req/day
  - [Get Gemini API Key here](https://makersuite.google.com/app/apikey)

## Features

### 🤖 Multi-Platform AI Support

- OpenAI API

  - Suitable for scenarios requiring high-quality generation results
  - Supports multiple models including GPT-3.5/GPT-4
  - Requires API Key, charged based on usage

- Ollama

  - Local deployment, no internet required
  - Supports multiple open-source models
  - Ideal for scenarios with data privacy requirements

- VSCode Built-in AI

  - Uses VSCode's built-in GitHub Copilot
  - Requires valid GitHub Copilot subscription
  - Configuration: Set provider to "vscode"

- Zhipu AI (GLM-4)

  - Excellent Chinese language performance
  - Fixed monthly free quota
  - Suitable for users in China

- DashScope

  - AI service provided by Alibaba Cloud
  - Supports Tongyi Qianwen series models
  - Suitable for enterprise applications

- Gemini AI
  - AI service provided by Google
  - Daily free quota: 1500 requests
  - Suitable for individual developers

### 📝 Version Control System Support

- SVN
- Git

### 📊 Weekly Report Generation

- AI-powered weekly report generation
- Automatically summarize your work progress
- Customizable report templates
- Support multiple AI providers for report generation

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
- Customizable analysis behavior via maxLineLength and contextLines

### 🔄 Merge Commit Support

By enabling the enableMergeCommit option, you can:

- Merge changes from multiple related files into a single commit message
- Automatically analyze file associations
- Generate more concise commit records

### 📝 Weekly Report Templates

Weekly report generation supports custom templates:

- Customize prompts via systemPrompt configuration
- Summarize by project/task
- Customize report format and key content

## 📋 Requirements

- VS Code 1.80.0+
- [SVN Command Line Tool](http://subversion.apache.org/packages.html)
- SVN SCM (Optional) - Install [SVN SCM v2.18.1+](https://github.com/littleCareless/svn-scm/releases/tag/v2.18.1) if you need to enter commit messages in VSCode's SCM input box
- Valid AI service configuration (OpenAI API Key or Ollama service)

### Configuration

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
| dish-ai-commit.features.codeAnalysis.simplifyDiff      | boolean | false                     | Enable diff content simplification                  |
| dish-ai-commit.features.codeAnalysis.maxLineLength     | number  | 120                       | Maximum line length after simplification            |
| dish-ai-commit.features.codeAnalysis.contextLines      | number  | 3                         | Number of context lines to preserve                 |
| dish-ai-commit.features.commitFormat.enableMergeCommit | boolean | false                     | Allow merging multiple file changes into one commit |
| dish-ai-commit.features.commitFormat.enableEmoji       | boolean | true                      | Use emoji in commit messages                        |
| dish-ai-commit.features.weeklyReport.systemPrompt      | string  | ""                        | Custom system prompt for weekly reports             |

### Commands

| Command ID                          | Category         | Title                                 | Description                                        |
| ----------------------------------- | ---------------- | ------------------------------------- | -------------------------------------------------- |
| dish-ai-commit.selectModel          | [Dish AI Commit] | Select AI Model for Commit Generation | Choose the AI model for generating commit messages |
| dish-ai-commit.generateWeeklyReport | [Dish AI Commit] | Generate Weekly Report                | Generate AI-powered weekly work report             |

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
- [SVN command line tool](http://subversion.apache.org/packages.html)
- SVN SCM (optional) - To enter commit information in the SCM input box of VSCode, please install [SVN SCM v2.18.1+](https://github.com/littleCareless/svn-scm/releases/tag/v2.18.1)
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
$ cd ai-commit
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
