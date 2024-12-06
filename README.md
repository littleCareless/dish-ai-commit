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

A VSCode extension for generating standardized Git/SVN commit messages using AI. Supports OpenAI, Ollama, and VSCode built-in AI services.

## Features

### 🤖 Multi-Platform AI Support

- OpenAI API support (GPT-3.5/GPT-4/Other)
- Ollama local model support
- VSCode built-in AI support

### 📝 Version Control System Support

- SVN
- Git

### 🌍 Multi-language Commit Message Generation:

Supports 19 languages including:
- English
- Simplified Chinese
- Traditional Chinese
- Japanese
- Korean

### 🎨 Conventional Commits Compliant

### 😄 Automatic Emoji Addition

## 📋 Requirements

- VS Code 1.80.0+
- [SVN Command Line Tool](http://subversion.apache.org/packages.html)
- SVN SCM (Optional) - Install [SVN SCM v2.18.1+](https://github.com/littleCareless/svn-scm/releases/tag/v2.18.1) if you need to enter commit messages in VSCode's SCM input box
- Valid AI service configuration (OpenAI API Key or Ollama service)

### Configuration

| Configuration | Type | Default | Required |
|--------------|------|---------|-----------|
| dish-ai-commit.AI_COMMIT_LANGUAGE | string | Simplified Chinese | Yes |
| dish-ai-commit.AI_COMMIT_SYSTEM_PROMPT | string | "" | No |
| dish-ai-commit.provider | string | OpenAI | Yes |
| dish-ai-commit.model | string | gpt-3.5-turbo | Yes |
| dish-ai-commit.openai.apiKey | string | - | Yes |
| dish-ai-commit.openai.baseUrl | string | https://api.openai.com/v1 | No |
| dish-ai-commit.ollama.baseUrl | string | http://localhost:11434 | No |

### Commands

- `Generate Commit Message`: Generate commit message based on current changes
- `Select AI Model`: Choose the AI model to use

## Configuration Guide

1. OpenAI Configuration

## 🛠️ Local Development

You can follow these steps for local development:

1. Clone the repository

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
