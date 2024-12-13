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

## Features

### 🤖 Multi-Platform AI Support

- OpenAI API support (GPT-3.5/GPT-4/Other)
- Ollama local model support
- VSCode built-in AI support
- Zhipu AI support
- DashScope support
- Doubao AI support
- Gemini AI support

### 📝 Version Control System Support

- SVN
- Git

### 📊 Weekly Report Generation

- AI-powered weekly report generation
- Automatically summarize your work progress
- Customizable report templates
- Support multiple AI providers for report generation

### 🌍 Multi-language Commit Message Generation:

Supports 19 languages including:

- Simplified Chinese
- Traditional Chinese
- English
- Japanese
- Korean
  Others

### 🎨 Conventional Commits Compliant

### 😄 Automatic Emoji Addition

## 📋 Requirements

- VS Code 1.80.0+
- [SVN Command Line Tool](http://subversion.apache.org/packages.html)
- SVN SCM (Optional) - Install [SVN SCM v2.18.1+](https://github.com/littleCareless/svn-scm/releases/tag/v2.18.1) if you need to enter commit messages in VSCode's SCM input box
- Valid AI service configuration (OpenAI API Key or Ollama service)

### Configuration

| Configuration                                   | Type    | Default                   | Description                                         |
| ----------------------------------------------- | ------- | ------------------------- | --------------------------------------------------- |
| dish-ai-commit.commitLanguage                   | string  | Simplified Chinese        | Commit message language                             |
| dish-ai-commit.systemPrompt                     | string  | ""                        | Custom system prompt for generating commit messages |
| dish-ai-commit.provider                         | string  | OpenAI                    | Default AI provider                                 |
| dish-ai-commit.model                            | string  | gpt-3.5-turbo             | AI model selection                                  |
| dish-ai-commit.openai.apiKey                    | string  | -                         | OpenAI API key                                      |
| dish-ai-commit.openai.baseUrl                   | string  | https://api.openai.com/v1 | OpenAI API base URL                                 |
| dish-ai-commit.zhipuai.apiKey                   | string  | -                         | Zhipu AI API key                                    |
| dish-ai-commit.dashscope.apiKey                 | string  | -                         | DashScope API key                                   |
| dish-ai-commit.doubao.apiKey                    | string  | -                         | Doubao API key                                      |
| dish-ai-commit.gemini.apiKey                    | string  | -                         | Gemini API key                                      |
| dish-ai-commit.ollama.baseUrl                   | string  | http://localhost:11434    | Ollama API base URL                                 |
| dish-ai-commit.enableDiffSimplification         | boolean | false                     | Enable diff content simplification                  |
| dish-ai-commit.diffSimplification.maxLineLength | number  | 120                       | Maximum line length after simplification            |
| dish-ai-commit.diffSimplification.contextLines  | number  | 3                         | Number of context lines to preserve                 |
| dish-ai-commit.allowMergeCommits                | boolean | false                     | Allow merging multiple file changes into one commit |

### Commands

- `Generate Commit Message`: Generate commit message based on current changes
- `Select AI Model`: Choose the AI model to use
- `Generate Weekly Report`: Generate a weekly summary report of your work

## Configuration Instructions

1. OpenAI Configuration

```json
{
  "dish-ai-commit.PROVIDER": "openai",
  "dish-ai-commit.OPENAI_API_KEY": "your-api-key",
  "dish-ai-commit.OPENAI_BASE_URL": "https://api.openai.com/v1"
}
```

2. Ollama onfiguration

```json
{
  "dish-ai-commit.PROVIDER": "ollama",
  "dish-ai-commit.OLLAMA_BASE_URL": "http://localhost:11434"
}
```

3. VSCode onfiguration

```json
{
  "dish-ai-commit.PROVIDER": "vscode"
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
- [dish-ai-commit](https://github.com/Sitoi/dish-ai-commit) - AI assisted Git commit message generation

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
