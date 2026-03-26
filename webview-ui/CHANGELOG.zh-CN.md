## 0.60.0 (2026-03-26)

### ✨ Features

- **commit**: improve generation resilience and prompt-aware cache ([79f57a1](https://github.com/littleCareless/dish-ai-commit/commit/79f57a1))
- **settings**: add features settings management ([636425a](https://github.com/littleCareless/dish-ai-commit/commit/636425a))
- **ai**: add model registry and catalog sync services ([14f5bc0](https://github.com/littleCareless/dish-ai-commit/commit/14f5bc0))
- **commit-chat**: add real-time model streaming in webview chat ([2ead424](https://github.com/littleCareless/dish-ai-commit/commit/2ead424))

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

- **commit**: add semantic grouped staged commit workflow ([b856099](https://github.com/littleCareless/dish-ai-commit/commit/b856099))
- **settings**: add semantic grouping toggle and schema compatibility ([9f3b9d1](https://github.com/littleCareless/dish-ai-commit/commit/9f3b9d1))
- 提升提交生成与多仓库能力，新增模型注册/设置管理并修复 UI 与消息链路稳定性 ([5bead7c](https://github.com/littleCareless/dish-ai-commit/commit/5bead7c))
- **webview-ui**: resolve react-hooks lint errors in settings flows ([464630d](https://github.com/littleCareless/dish-ai-commit/commit/464630d))
- remote-tracking branch 'origin/develop' into codex/unify-model-registry-table-ui ([f528b58](https://github.com/littleCareless/dish-ai-commit/commit/f528b58))
- **deps**: update dependency versions ([b742813](https://github.com/littleCareless/dish-ai-commit/commit/b742813))
- v0.59.0 ([d0057ca](https://github.com/littleCareless/dish-ai-commit/commit/d0057ca))
- **scm**: harden multi-repo boundaries and provider routing ([41459a6](https://github.com/littleCareless/dish-ai-commit/commit/41459a6))
- **fix**: isolate git/svn cache keys for prompts and commit cache ([beb63fa](https://github.com/littleCareless/dish-ai-commit/commit/beb63fa))
- **chore**: checkpoint current changes ([f2bd596](https://github.com/littleCareless/dish-ai-commit/commit/f2bd596))
- **commit**: complete generation result typing ([197cb45](https://github.com/littleCareless/dish-ai-commit/commit/197cb45))
- **protocol**: add audit workflow and align webview messaging ([54f0cc8](https://github.com/littleCareless/dish-ai-commit/commit/54f0cc8))
- **scm**: unify critical-path logging/menu and publish verification artifacts ([dc2bb3b](https://github.com/littleCareless/dish-ai-commit/commit/dc2bb3b))
- **commit**: dedup generation pipeline and enable cross-repo routing ([b9704d9](https://github.com/littleCareless/dish-ai-commit/commit/b9704d9))
- v0.59.0 ([01c60ea](https://github.com/littleCareless/dish-ai-commit/commit/01c60ea))
- branch 'feat-commit-chat-real-streaming' into develop ([6b5467a](https://github.com/littleCareless/dish-ai-commit/commit/6b5467a))
- branch 'chore/save-current-changes-20260301' into develop ([f6e1bc1](https://github.com/littleCareless/dish-ai-commit/commit/f6e1bc1))
- **ui**: resolve TypeScript errors in settings components ([6b773d8](https://github.com/littleCareless/dish-ai-commit/commit/6b773d8))
- **ui**: unify command palette and welcome page ([2904def](https://github.com/littleCareless/dish-ai-commit/commit/2904def))
- **chore**: save current local changes ([804ae6a](https://github.com/littleCareless/dish-ai-commit/commit/804ae6a))
- **commit-chat**: type input handlers for strict ts checks ([446e3c7](https://github.com/littleCareless/dish-ai-commit/commit/446e3c7))
- **style**: 添加最小宽度以防止内容被压缩 ([0d398ac](https://github.com/littleCareless/dish-ai-commit/commit/0d398ac))
