# Dish AI Commit Gen

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

- English
- Simplified Chinese
- Traditional Chinese
- Japanese
- Korean
  and 19 other languages

### 🎨 Conventional Commits Compliant

### 😄 Automatic Emoji Addition

### Configuration

- `dish-ai-commit.PROVIDER`: AI provider selection (openai/ollama/vscode)
- `dish-ai-commit.MODEL`: AI model to use
- `dish-ai-commit.OPENAI_API_KEY`: OpenAI API key
- `dish-ai-commit.OPENAI_BASE_URL`: OpenAI API base URL
- `dish-ai-commit.OLLAMA_BASE_URL`: Ollama API URL
- `dish-ai-commit.AI_COMMIT_LANGUAGE`: Language for generated commit messages
- `dish-ai-commit.AI_COMMIT_SYSTEM_PROMPT`: Custom system prompt

### Commands

- `Generate Commit Message`: Generate commit message based on current changes
- `Select AI Model`: Choose the AI model to use

## Configuration Guide

1. OpenAI Configuration
