# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dish AI Commit is a VSCode extension that generates standardized Git/SVN commit messages using AI. It supports 30+ AI providers including OpenAI, Ollama, VSCode built-in AI, Zhipu AI, DashScope, Gemini AI, Doubao AI, Deepseek AI, and more. The extension provides multi-language support (19 languages), code semantic indexing, and comprehensive SCM integration.

## Core Architecture

### High-Level Structure
- **Extension Entry Point**: `src/extension.ts` - Main activation/deactivation logic
- **AI Layer**: `src/ai/` - AI provider factory and 30+ provider implementations
- **SCM Layer**: `src/scm/` - Source control management (Git/SVN) with factory pattern
- **Commands**: `src/commands/` - VSCode command implementations
- **Configuration**: `src/config/` - Centralized configuration management
- **Webview UI**: `src/webview-ui/` - React-based settings interface

### Key Architectural Patterns
- **Factory Pattern**: Used extensively for AI providers (`AIProviderFactory`) and SCM providers (`SCMFactory`)
- **Provider Pattern**: Abstract base classes (`AbstractAIProvider`, `ISCMProvider`) with concrete implementations
- **Configuration Management**: Centralized through `ConfigurationManager` with dynamic schema generation
- **Code Indexing**: Tree-sitter based semantic analysis with vector database integration (Qdrant)

### SCM Architecture
The project uses a sophisticated SCM detection system:
- **SCMFactory**: Detects and creates appropriate SCM providers (Git/SVN)
- **Path Resolution**: `ImprovedPathUtils` for cross-platform path handling
- **Multi-workspace Support**: Handles multiple workspaces and file selections
- **Caching**: SCM providers are cached per workspace for performance

### AI Provider System
- **30+ Providers**: OpenAI, Anthropic, Ollama, Zhipu, DashScope, Gemini, etc.
- **Caching**: 30-minute TTL cache with configuration change detection
- **Model Registry**: Dynamic model fetching and validation
- **Embedding Support**: For code semantic indexing

## Development Commands

### Build and Compilation
```bash
# Development build with TypeScript compilation
npm run compile

# Production build with esbuild (includes WASM file copying)
npm run compile:esbuild

# Watch mode for development
npm run watch:esbuild

# Build webview UI separately
npm run compile:webview

# Watch webview UI in development
npm run watch:webview
```

### Testing
```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Watch mode for tests
npm run test:watch

# SCM-specific tests
npm run test:scm
npm run test:scm:unit
npm run test:scm:integration

# Coverage quality gate
npm run quality-gate
```

### Code Quality
```bash
# Lint TypeScript code
npm run lint

# Type checking without compilation
npm run check-types

# Pre-commit checks (runs automatically via husky)
npm run pretest
```

### Package Management
```bash
# Package for distribution
npm run package

# Publish to marketplace
npm run publish

# Pre-release publish
npm run publish:pre
```

## Testing Framework

Uses **Vitest** for testing with the following setup:
- Test files: `src/**/__tests__/**/*.test.ts`
- Setup file: `src/scm/__tests__/setup.ts`
- Coverage: V8 provider with HTML/LCOV reports
- Timeout: 10s for tests, 5s for hooks

## Code Style Guidelines

### TypeScript Standards (from TYPESCRIPT_BEST_PRACTICES.md)
- **Strict Mode**: Always enabled (`strict: true`)
- **Naming**: PascalCase for types/interfaces, camelCase for variables/functions
- **No `any`**: Use `unknown` with type guards instead
- **Error Handling**: Custom error classes extending `Error`
- **Async/Await**: Preferred over Promises with try/catch blocks

### ESLint Configuration
- Uses `@stylistic/eslint-plugin` for style enforcement
- Semi-colons required, curly braces enforced
- Files: `src/**/*.ts` (excludes `out/`, `dist/`, `*.d.ts`)

### Cursor Rules
The project includes comprehensive Cursor rules in `.cursor/rules/`:
- **Core rules**: `rule-generating-agent.mdc`
- **TypeScript rules**: async/await patterns, error handling, naming conventions
- **VSCode rules**: UI components, disposable management

## Commit Message Standards

Uses **Gitmoji** convention via commitlint:
- Format: `<emoji> <type>: <description>`
- Types: `✨ feat`, `🐛 fix`, `📚 docs`, `♻️ refactor`, etc.
- Max length: 108 characters
- Configuration: `commitlint.config.mjs`

## Configuration Architecture

### Dynamic Configuration System
- **Schema-driven**: Configuration is generated from schemas in `src/config/`
- **Type-safe**: Full TypeScript support with auto-generated types
- **Validation**: Provider-specific validation and error handling
- **Reactive**: Configuration changes trigger provider cache invalidation

### Key Configuration Areas
- **Base Settings**: Provider, model, language selection
- **Provider Configs**: API keys, endpoints for each AI service
- **Feature Flags**: Code analysis, commit formatting, indexing options
- **SCM Settings**: Diff targets, branch preferences

## WASM File Handling

The build system (`esbuild.ts`) includes critical WASM file copying:
- **tree-sitter.wasm**: Core tree-sitter functionality
- **tiktoken_bg.wasm**: Token counting for AI providers
- **Language WASMs**: Tree-sitter language parsers
- Copied to `dist/` during build process

## Key Dependencies
- **VSCode API**: ^1.90.0 minimum
- **AI SDKs**: OpenAI, Anthropic, Google AI, etc.
- **Tree-sitter**: Code parsing and analysis
- **Qdrant**: Vector database for semantic indexing
- **React/Vite**: Webview UI framework

## Development Workflow
1. Use `npm run watch:esbuild` for backend development
2. Use `npm run watch:webview` for UI development
3. Run `npm run lint` before commits (enforced by husky)
4. Test changes with `npm run test` or specific test suites
5. Use F5 in VSCode to launch Extension Development Host

## Multi-language Support
Supports 19 languages with i18n system:
- Files: `i18n/en.json`, `i18n/zh-cn.json`
- Implementation: `src/utils/i18n/`
- Usage: `formatMessage("key", [params])`