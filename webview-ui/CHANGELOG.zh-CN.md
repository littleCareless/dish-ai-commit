## 0.59.0 (2026-03-25)

### ✨ Features

- **commit**: improve generation resilience and prompt-aware cache ([79f57a1](https://github.com/littleCareless/dish-ai-commit/commit/79f57a1))
- **settings**: add features settings management ([636425a](https://github.com/littleCareless/dish-ai-commit/commit/636425a))
- **ai**: add model registry and catalog sync services ([14f5bc0](https://github.com/littleCareless/dish-ai-commit/commit/14f5bc0))

### 🐛 Bug Fixes

- **webview**: prevent message dedupe drops on page re-entry ([456066f](https://github.com/littleCareless/dish-ai-commit/commit/456066f))
- **commit**: align layered generation config and diff snapshots ([07f9f8a](https://github.com/littleCareless/dish-ai-commit/commit/07f9f8a))

### ♻️ Code Refactoring

- **commands**: return structured execution status ([dc447b7](https://github.com/littleCareless/dish-ai-commit/commit/dc447b7))
- **commit**: remove unused target resources path ([1794064](https://github.com/littleCareless/dish-ai-commit/commit/1794064))
- **ai**: standardize provider logging and runtime diagnostics ([ea17db8](https://github.com/littleCareless/dish-ai-commit/commit/ea17db8))
- **commit**: orchestrate generation flow and unify diff targeting ([58c0c59](https://github.com/littleCareless/dish-ai-commit/commit/58c0c59))
- **core**: remove disconnected orchestration scaffolds ([92cc037](https://github.com/littleCareless/dish-ai-commit/commit/92cc037))
- **core**: remove duplicate services and orphan command implementations ([3ede345](https://github.com/littleCareless/dish-ai-commit/commit/3ede345))

### 🔧 Chores

- **scm**: harden multi-repo boundaries and provider routing ([41459a6](https://github.com/littleCareless/dish-ai-commit/commit/41459a6))
- **fix**: isolate git/svn cache keys for prompts and commit cache ([beb63fa](https://github.com/littleCareless/dish-ai-commit/commit/beb63fa))
- **chore**: checkpoint current changes ([f2bd596](https://github.com/littleCareless/dish-ai-commit/commit/f2bd596))
- **commit**: complete generation result typing ([197cb45](https://github.com/littleCareless/dish-ai-commit/commit/197cb45))
- **protocol**: add audit workflow and align webview messaging ([54f0cc8](https://github.com/littleCareless/dish-ai-commit/commit/54f0cc8))
- **scm**: unify critical-path logging/menu and publish verification artifacts ([dc2bb3b](https://github.com/littleCareless/dish-ai-commit/commit/dc2bb3b))
- **commit**: dedup generation pipeline and enable cross-repo routing ([b9704d9](https://github.com/littleCareless/dish-ai-commit/commit/b9704d9))
- **ui**: resolve TypeScript errors in settings components ([6b773d8](https://github.com/littleCareless/dish-ai-commit/commit/6b773d8))
- **ui**: unify command palette and welcome page ([2904def](https://github.com/littleCareless/dish-ai-commit/commit/2904def))
- **style**: 添加最小宽度以防止内容被压缩 ([0d398ac](https://github.com/littleCareless/dish-ai-commit/commit/0d398ac))
- v0.58.2 ([1976014](https://github.com/littleCareless/dish-ai-commit/commit/1976014))
- **ci**: improve release workflow changelog parsing and URL output ([2bc78ea](https://github.com/littleCareless/dish-ai-commit/commit/2bc78ea))
