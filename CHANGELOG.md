# Changelog

[English](CHANGELOG.md) | [简体中文](CHANGELOG.zh-CN.md)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

# 0.27.0 (2025-06-24)

### ✨ Features

- **embedding**: Improve embedding service and implement message internationalization ([bc90f70](https://github.com/littleCareless/dish-ai-commit/commit/bc90f70))

### 🎫 Chores

- **release**: Release 0.26.0 ([20764b6](https://github.com/littleCareless/dish-ai-commit/commit/20764b6))

# 0.26.0 (2025-06-23)

### ♻ Code Refactoring

- **embedding**: Adjust embedding function integration and remove old configuration ([5a9bec6](https://github.com/littleCareless/dish-ai-commit/commit/5a9bec6))

### ✨ Features

- **scm**: Introduce asynchronous initialization mechanism for SCM provider ([c9bcc09](https://github.com/littleCareless/dish-ai-commit/commit/c9bcc09))

- **svn**: Enhance SVN path detection logic ([14320c3](https://github.com/littleCareless/dish-ai-commit/commit/14320c3))

### 🎫 Chores

- **i18n**: Added internationalized prompt information ([1956b36](https://github.com/littleCareless/dish-ai-commit/commit/1956b36))
- **release**: Released version 0.25.0 ([f7b780c](https://github.com/littleCareless/dish-ai-commit/commit/f7b780c))

### 🐛 Bug Fixes

- **settings**: Fix index clearing logic and optimize configuration loading ([ecb710d](https://github.com/littleCareless/dish-ai-commit/commit/ecb710d))

### 💄 Styles

- **codebase**: Unify code style and refactor toast action types ([d8398be](https://github.com/littleCareless/dish-ai-commit/commit/d8398be))

# 0.25.0 (2025-06-20)

### ✨ Features

- **indexing**: Added the ability to clear indexes and re-index based on configuration changes ([d18b425](https://github.com/littleCareless/dish-ai-commit/commit/d18b425))

### 🎫 Chores

- **release**: Released version 0.24.0 ([997c323](https://github.com/littleCareless/dish-ai-commit/commit/997c323))

# 0.24.0 (2025-06-20)

### ✨ Features

- **indexing**: Improve indexing service initialization, error handling, and configuration update mechanism ([da37075](https://github.com/littleCareless/dish-ai-commit/commit/da37075))

### 🎫 Chores

- **release**: Release 0.23.1 ([ee1eda6](https://github.com/littleCareless/dish-ai-commit/commit/ee1eda6))

## 0.23.1 (2025-06-19)

### ♻ Code Refactoring

- **logging**: Optimize the format of model loading log warnings ([31091a6](https://github.com/littleCareless/dish-ai-commit/commit/31091a6))

### 🎫 Chores

- **release**: Prepare for 0.23.0 release ([3a0a01f](https://github.com/littleCareless/dish-ai-commit/commit/3a0a01f))

### 💄 Styles

- **icon**: Update menu and view icons ([1de232a](https://github.com/littleCareless/dish-ai-commit/commit/1de232a))

### 📝 Documentation

- **readme**: Update content and add internationalization support ([212f58a](https://github.com/littleCareless/dish-ai-commit/commit/212f58a))

# 0.23.0 (2025-06-18)

### ✨ Features

- **indexing**: Enhance embedding service and improve error handling ([6652b5d](https://github.com/littleCareless/dish-ai-commit/commit/6652b5d))

- **setting**: Improve indexing error handling and display ([7f4e558](https://github.com/littleCareless/dish-ai-commit/commit/7f4e558))

- **settings**: Enhance settings page save prompt and update menu label ([a7a9002](https://github.com/littleCareless/dish-ai-commit/commit/a7a9002))

### 🎫 Chores

- **release**: Prepare for 0.22.0 release ([19df93a](https://github.com/littleCareless/dish-ai-commit/commit/19df93a))

### 🐛 Bug Fixes

- **indexing**: Enhanced indexing error handling and reporting ([8227100](https://github.com/littleCareless/dish-ai-commit/commit/8227100))

# 0.22.0 (2025-06-17)

### ♻ Code Refactoring

- **commands**: Adjust embed context logic in commands ([f67fd95](https://github.com/littleCareless/dish-ai-commit/commit/f67fd95))

- **utils**: Remove unused config module ([f67eb75](https://github.com/littleCareless/dish-ai-commit/commit/f67eb75))

- **webview/settings**: Refactor settings view to separate concerns and improve configuration management ([3edd1d2](https://github.com/littleCareless/dish-ai-commit/commit/3edd1d2))

### ✨ Features

- **ai**: Integrate embed services to provide similar code context ([a4a011e](https://github.com/littleCareless/dish-ai-commit/commit/a4a011e))
- **branding**: Update plugin title and icon ([cbeaf6e](https://github.com/littleCareless/dish-ai-commit/commit/cbeaf6e))
- **code-index**: Implement configurable embedding service and enhance index stability ([7323665](https://github.com/littleCareless/dish-ai-commit/commit/7323665))
- **config**: Introduce embedding function and update related configuration ([8e88ddb](https://github.com/littleCareless/dish-ai-commit/commit/8e88ddb))
- **core, ai**: Integrate embedding service and add setting view ([c5b3bab](https://github.com/littleCareless/dish-ai-commit/commit/c5b3bab))
- **core**: Added multiple core tool functions ([9dd8ad1](https://github.com/littleCareless/dish-ai-commit/commit/9dd8ad1))
- **core**: Introduced code parsing and vector storage dependencies ([8d5bcf7](https://github.com/littleCareless/dish-ai-commit/commit/8d5bcf7))
- **glob**: Implemented file and directory ignoring logic ([72ac425](https://github.com/littleCareless/dish-ai-commit/commit/72ac425))
- **indexing**: Integrate EmbeddingServiceManager and add Qdrant related configuration ([0a91691](https://github.com/littleCareless/dish-ai-commit/commit/0a91691))
- **indexing**: Integrate Ollama, improve code parsing and segmentation, and increase indexing progress ([437c76b](https://github.com/littleCareless/dish-ai-commit/commit/437c76b))
- **indexing**: Added EmbeddingService manager ([3279a92](https://github.com/littleCareless/dish-ai-commit/commit/3279a92))
- **indexing**: Introduced code semantic indexing and search functions ([981841f](https://github.com/littleCareless/dish-ai-commit/commit/981841f))
- **setting**: Added setting page UI to support code index configuration ([1ef3c28](https://github.com/littleCareless/dish-ai-commit/commit/1ef3c28))
- **settings**: Add service connection test and refactor code index setting UI ([b2706ee](https://github.com/littleCareless/dish-ai-commit/commit/b2706ee))
- **tree-sitter**: Implement multi-language parsing and query functions based on WASM ([8841069](https://github.com/littleCareless/dish-ai-commit/commit/8841069))
- **ui, core**: Add settings interface and upgrade code parsing library ([5aaae4f](https://github.com/littleCareless/dish-ai-commit/commit/5aaae4f))
- **webview-ui**: Introduce multi-view support and add settings page ([4e41e02](https://github.com/littleCareless/dish-ai-commit/commit/4e41e02))
- **webview**: Implement plugin settings view provider ([2727a5e](https://github.com/littleCareless/dish-ai-commit/commit/2727a5e))
- **webview**: Add settings and weekly report pages, and update project identifier ([773e017](https://github.com/littleCareless/dish-ai-commit/commit/773e017))

### 🎫 Chores

- **config**: Add workspace configuration mode ([dc6a621](https://github.com/littleCareless/dish-ai-commit/commit/dc6a621))
- **constants**: Add core constant definitions ([5194e01](https://github.com/littleCareless/dish-ai-commit/commit/5194e01))
- **deps**: Update dependencies and adjust typescript dependency types ([ce22e8b](https://github.com/littleCareless/dish-ai-commit/commit/ce22e8b))
- **release**: Release 0.21.1 ([1f59412](https://github.com/littleCareless/dish-ai-commit/commit/1f59412))

### 🐛 Bug Fixes

- **build**: Fix the issue where the build script did not copy WASM files ([6aa39de](https://github.com/littleCareless/dish-ai-commit/commit/6aa39de))

## 0.21.1 (2025-06-13)

### ♻ Code Refactoring

- **ai-provider**: Refactor AI provider streaming request parameter processing ([1544c46](https://github.com/littleCareless/dish-ai-commit/commit/1544c46))

- **progress**: Optimize command progress display and user feedback ([1c098fa](https://github.com/littleCareless/dish-ai-commit/commit/1c098fa))

### 🎫 Chores

- **i18n**: Added internationalized text related to PR summary generation progress ([e437a0c](https://github.com/littleCareless/dish-ai-commit/commit/e437a0c))

- **release**: Release 0.21.0 Version ([f79a70c](https://github.com/littleCareless/dish-ai-commit/commit/f79a70c))

# 0.21.0 (2025-06-13)

### ✨ Features

- **ai-provider**: Implement PR summary generation for AI provider ([c0c9d48](https://github.com/littleCareless/dish-ai-commit/commit/c0c9d48))
- **config**: Add PR summary config option ([d933c69](https://github.com/littleCareless/dish-ai-commit/commit/d933c69))
- **extension**: Add PR summary generation ([d9b1d21](https://github.com/littleCareless/dish-ai-commit/commit/d9b1d21))
- **pr-summary**: Add PR summary generation ([5867855](https://github.com/littleCareless/dish-ai-commit/commit/5867855))
- **pr-summary**: Added the function of generating PR summary ([78c92c1](https://github.com/littleCareless/dish-ai-commit/commit/78c92c1))
- **scm**: Added the function of obtaining commit log and branch list ([be86233](https://github.com/littleCareless/dish-ai-commit/commit/be86233))

### 🎫 Chores

- **i18n**: Updated internationalization files to support new features such as PR summary ([9a29abb](https://github.com/littleCareless/dish-ai-commit/commit/9a29abb))
- **release**: Release 0.20.2 version ([08a3d09](https://github.com/littleCareless/dish-ai-commit/commit/08a3d09))

## 0.20.2 (2025-06-12)

### 🎫 Chores

- **vscode**: Add images/demo.gif to ignore list ([e0938ba](https://github.com/littleCareless/dish-ai-commit/commit/e0938ba))

### 🐛 Bug Fixes

- **build**: Fix dependency and Node engine compatibility issues ([d1f8daa](https://github.com/littleCareless/dish-ai-commit/commit/d1f8daa))

- **core**: Improve command usability and update to 0.20.1 version ([de573b0](https://github.com/littleCareless/dish-ai-commit/commit/de573b0))

## 0.20.1 (2025-06-11)

### ♻ Code Refactoring

- **gemini**: Refactor Gemini AI provider ([8469266](https://github.com/littleCareless/dish-ai-commit/commit/8469266))

- **zhipu**: Remove obsolete models ([483bf38](https://github.com/littleCareless/dish-ai-commit/commit/483bf38))

### 🎫 Chores

- **deps**: Downgrade vscode engine and type definition version ([75bb17d](https://github.com/littleCareless/dish-ai-commit/commit/75bb17d))

- **deps**: Update dependencies and remove package-lock.json ([7e5c9e8](https://github.com/littleCareless/dish-ai-commit/commit/7e5c9e8))
- **model-picker**: Add annotations to model selection logic ([2ec10db](https://github.com/littleCareless/dish-ai-commit/commit/2ec10db))
- **release**: Release 0.20.0 ([f276e47](https://github.com/littleCareless/dish-ai-commit/commit/f276e47))

### 🐛 Bug Fixes

- **openai**: Fix model acquisition failure log ([887bbeb](https://github.com/littleCareless/dish-ai-commit/commit/887bbeb))

# 0.20.0 (2025-06-10)

### ✨ Features

- **command**: Integrate AI Terms of Service confirmation and support streaming task cancellation ([276f709](https://github.com/littleCareless/dish-ai-commit/commit/276f709))
- **images**: Add demo GIF images ([33ab53c](https://github.com/littleCareless/dish-ai-commit/commit/33ab53c))
- **state**: Introduce state management module ([48dd04f](https://github.com/littleCareless/dish-ai-commit/commit/48dd04f))

### 🎫 Chores

- **i18n**: Add localized entries related to AI Terms of Service and user cancellation operations ([ad38e39](https://github.com/littleCareless/dish-ai-commit/commit/ad38e39))
- **release**: Upgrade version to 0.19.0 and update change log ([1711136](https://github.com/littleCareless/dish-ai-commit/commit/1711136))

### 🐛 Bug Fixes

- **scm**: Fix special character escape of author name in Git log query ([924a7b7](https://github.com/littleCareless/dish-ai-commit/commit/924a7b7))

# 0.19.0 (2025-06-04)

### ♻ Code Refactoring

- **generatecommitcommand**: Refactor the commit generation command and remove the old execution logic ([342d3a0](https://github.com/littleCareless/dish-ai-commit/commit/342d3a0))

### ✨ Features

- **ai-providers**: Implement AI provider streaming request and update Zhipu configuration ([31c5899](https://github.com/littleCareless/dish-ai-commit/commit/31c5899))

- **ai**: Add streaming generation of commit information function ([663ac26](https://github.com/littleCareless/dish-ai-commit/commit/663ac26))
- **generate-commit-command**: Implement streaming generation of commit information ([4ef52fa](https://github.com/littleCareless/dish-ai-commit/commit/4ef52fa))
- **scm**: Add streaming input support for SCM providers ([de1f6b2](https://github.com/littleCareless/dish-ai-commit/commit/de1f6b2))

### 🎫 Chores

- **i18n**: Added internationalization text related to streaming generation ([49a2b90](https://github.com/littleCareless/dish-ai-commit/commit/49a2b90))
- **version**: Upgraded version to 0.18.0 ([bf5dbf2](https://github.com/littleCareless/dish-ai-commit/commit/bf5dbf2))

### 📝 Documentation

- **changelog**: Updated changelog to version 0.18.0 ([6bb864d](https://github.com/littleCareless/dish-ai-commit/commit/6bb864d))

# 0.18.0 (2025-06-03)

### ✨ Features

- **ai**: Add optional users parameter to support team member reporting ([91bb290](https://github.com/littleCareless/dish-ai-commit/commit/91bb290))

- **generate-branch-name-command**: Optimize the generate branch name command ([edba80f](https://github.com/littleCareless/dish-ai-commit/commit/edba80f))

### 🎫 Chores

- **i18n**: Update internationalization files ([16fc868](https://github.com/littleCareless/dish-ai-commit/commit/16fc868))

- **release**: Release 0.17.0 ([d3d2c51](https://github.com/littleCareless/dish-ai-commit/commit/d3d2c51))

# 0.17.0 (2025-05-28)

### ✨ Features

- **editor**: Enhance the editor, synchronize format status and improve the style ([4c6499d](https://github.com/littleCareless/dish-ai-commit/commit/4c6499d))

- **prompt**: Enhance the weekly report prompt, add prohibited operations and HTML output instructions ([d8ff7ad](https://github.com/littleCareless/dish-ai-commit/commit/d8ff7ad))

### 👷 Build System

- **deps**: Upgrade the version to 0.16.0 and introduce @typescript/native-preview ([9e92ca0](https://github.com/littleCareless/dish-ai-commit/commit/9e92ca0))

# 0.16.0 (2025-05-23)

### ✨ Features

- **gemini**: Add new version Gemini 2.5 model support ([ac6bdca](https://github.com/littleCareless/dish-ai-commit/commit/ac6bdca))

### 🐛 Bug Fixes

- **package**: Fix VCS conditional expression format ([cd1cb34](https://github.com/littleCareless/dish-ai-commit/commit/cd1cb34))

### 📝 Documentation

- **changelog**: Update changelog and version number to 0.15.2 ([24f0d4a](https://github.com/littleCareless/dish-ai-commit/commit/24f0d4a))

## 0.15.2 (2025-05-22)

### 🐛 Bug Fixes

- **package**: Optimize command display conditional logic ([3cf6755](https://github.com/littleCareless/dish-ai-commit/commit/3cf6755))

### 👷 Build System

- **version**: Release v0.15.0 ([64a92a3](https://github.com/littleCareless/dish-ai-commit/commit/64a92a3))

# 0.15.0 (2025-05-09)

### ✨ Features

- **config**: Add commit message body switch configuration item ([e2011f0](https://github.com/littleCareless/dish-ai-commit/commit/e2011f0))

- **prompt**: Refactor commit message generation logic ([0d5da20](https://github.com/littleCareless/dish-ai-commit/commit/0d5da20))

### 👷 Build System

- **version**: Release v0.14.2 version ([e3b8c78](https://github.com/littleCareless/dish-ai-commit/commit/e3b8c78))

## 0.14.2 (2025-05-07)

### 🎫 Chores

- **build**: Update build configuration and AI provider implementation ([f9e057b](https://github.com/littleCareless/dish-ai-commit/commit/f9e057b))

### 👷 Build System

- **version**: Release v0.14.0 ([813446d](https://github.com/littleCareless/dish-ai-commit/commit/813446d))

# 0.14.0 (2025-04-22)

### ✨ Features

- **log**: Enhanced version control log extraction function ([1b2dcf8](https://github.com/littleCareless/dish-ai-commit/commit/1b2dcf8))

### 🎫 Chores

- **config**: Adjust system configuration and weekly report generation prompter ([b63b18a](https://github.com/littleCareless/dish-ai-commit/commit/b63b18a))

### 👷 Build System

- **version**: Released v0.13.3 version ([6dc6bfc](https://github.com/littleCareless/dish-ai-commit/commit/6dc6bfc))

## 0.13.3 (2025-04-18)

### 🎫 Chores

- **config**: Optimize plugin configuration and build scripts ([f71ea75](https://github.com/littleCareless/dish-ai-commit/commit/f71ea75))

### 👷 Build System

- **version**: Release v0.13.2 ([1d1f40b](https://github.com/littleCareless/dish-ai-commit/commit/1d1f40b))

## 0.13.2 (2025-04-18)

### 🐛 Bug Fixes

- **package**: Fix menu command order error ([070fd6c](https://github.com/littleCareless/dish-ai-commit/commit/070fd6c))

### 👷 Build System

- **version**: Release v0.13.1 ([2e41c7f](https://github.com/littleCareless/dish-ai-commit/commit/2e41c7f))

### 💄 Styles

- Ignore .DS_Store files ([c8fa89a](https://github.com/littleCareless/dish-ai-commit/commit/c8fa89a))

## 0.13.1 (2025-04-18)

### 🎫 Chores

- **release**: Release v0.13.0 ([0f45fcc](https://github.com/littleCareless/dish-ai-commit/commit/0f45fcc))

### 🐛 Bug Fixes

- **git**: Optimize the generated commit information content processing ([8e8a528](https://github.com/littleCareless/dish-ai-commit/commit/8e8a528))

# 0.13.0 (2025-04-18)

### ♻ Code Refactoring

- **ai**: Optimize the temperature configuration parameters of AI service providers ([cf82e72](https://github.com/littleCareless/dish-ai-commit/commit/cf82e72))

### ✨ Features

- **gemini**: Fully update the Gemini series model and refactor the service provider ([48d9ea4](https://github.com/littleCareless/dish-ai-commit/commit/48d9ea4))

- **model**: Refactor the AI ​​model recognition mechanism ([65bfa2a](https://github.com/littleCareless/dish-ai-commit/commit/65bfa2a))

### 🎫 Chores

- **ai**: Adjust AI provider configuration and error handling ([be7debd](https://github.com/littleCareless/dish-ai-commit/commit/be7debd))
- **config**: Fix emoji display issues ([eb9c48d](https://github.com/littleCareless/dish-ai-commit/commit/eb9c48d))
- **locale**: Add translations for build failure and model selection ([1cce980](https://github.com/littleCareless/dish-ai-commit/commit/1cce980))
- **version**: Update project version to 0.12.5 ([884e2ff](https://github.com/littleCareless/dish-ai-commit/commit/884e2ff))

### 👷 Build System

- **deps**: Add @google/genai dependency package ([cceb650](https://github.com/littleCareless/dish-ai-commit/commit/cceb650))

## 0.12.5 (2025-04-17)

### 🎫 Chores

- **version**: Update the project version to 0.12.4 ([28d5d8e](https://github.com/littleCareless/dish-ai-commit/commit/28d5d8e))

### 🐛 Bug Fixes

- **misc**: Optimize the commit information and branch name generation function ([78530f3](https://github.com/littleCareless/dish-ai-commit/commit/78530f3))

## 0.12.4 (2025-04-17)

### 📝 Documentation

- **version**: Updated version number to 0.12.3 ([bba3f9d](https://github.com/littleCareless/dish-ai-commit/commit/bba3f9d))

## 0.12.3 (2025-04-16)

### 🎫 Chores

- **build**: Optimize VSCode plugin packaging configuration ([bfe8766](https://github.com/littleCareless/dish-ai-commit/commit/bfe8766))

- **vscode**: Update VSCode configuration file ([178e4d3](https://github.com/littleCareless/dish-ai-commit/commit/178e4d3))

### 👷 Build System

- **bundle**: Add esbuild packaging support ([bcc989f](https://github.com/littleCareless/dish-ai-commit/commit/bcc989f))

### 📝 Documentation

- **changelog**: Update version to 0.12.2 ([d7cf90d](https://github.com/littleCareless/dish-ai-commit/commit/d7cf90d))

## 0.12.2 (2025-04-16)

### 🐛 Bug Fixes

- **scm**: Optimize sub-directory Git repository detection logic ([7a478af](https://github.com/littleCareless/dish-ai-commit/commit/7a478af))

### 👷 Build System

- **release**: Release version v0.12.1 ([4567997](https://github.com/littleCareless/dish-ai-commit/commit/4567997))

## 0.12.1 (2025-04-15)

### ♻ Code Refactoring

- **config**: Adjust the default values ​​and formats of configuration items ([82d6f70](https://github.com/littleCareless/dish-ai-commit/commit/82d6f70))

### 🎫 Chores

- **ci**: Add pnpm environment configuration ([aa361d8](https://github.com/littleCareless/dish-ai-commit/commit/aa361d8))

- **deps**: Switch build scripts from pnpm to npm ([e06bda5](https://github.com/littleCareless/dish-ai-commit/commit/e06bda5))

### 👷 Build System

- **version**: Upgraded the project version to 0.12.0 ([4c86577](https://github.com/littleCareless/dish-ai-commit/commit/4c86577))

# 0.12.0 (2025-04-14)

### ✨ Features

- **ai**: Enhance AI interface parameters and prompt word processing capabilities ([ee04aa8](https://github.com/littleCareless/dish-ai-commit/commit/ee04aa8))

- **deps**: Add vsce as a development dependency ([5e782fe](https://github.com/littleCareless/dish-ai-commit/commit/5e782fe))

### 👷 Build System

- **version**: Update project version to 0.11.4 ([e80dab0](https://github.com/littleCareless/dish-ai-commit/commit/e80dab0))

## 0.11.4 (2025-04-14)

### ♻ Code Refactoring

- **ai**: Rename generateResponse method to generateCommit ([92383ab](https://github.com/littleCareless/dish-ai-commit/commit/92383ab))

### 🎫 Chores

- **types**: Fix date picker type definition ([20dce25](https://github.com/littleCareless/dish-ai-commit/commit/20dce25))

### 📝 Documentation

- **changelog**: Update project version to 0.11.3 ([64ea845](https://github.com/littleCareless/dish-ai-commit/commit/64ea845))

### 🔧 Continuous Integration

- **workflow**: Add GitHub Actions release workflow ([8914a22](https://github.com/littleCareless/dish-ai-commit/commit/8914a22))

## 0.11.3 (2025-04-14)

### ♻ Code Refactoring

- **ai**: Refactor the weekly report generation and code review function prompt ([96a10fa](https://github.com/littleCareless/dish-ai-commit/commit/96a10fa))

### 📝 Documentation

- **changelog**: Update v0.11.2 version documentation ([c5177cc](https://github.com/littleCareless/dish-ai-commit/commit/c5177cc))

## 0.11.2 (2025-04-11)

### ♻ Code Refactoring

- **config**: Optimize configuration structure ([eb1755f](https://github.com/littleCareless/dish-ai-commit/commit/eb1755f))

- **prompt**: Improve prompt word generation logic ([2ff9e59](https://github.com/littleCareless/dish-ai-commit/commit/2ff9e59))

### 📝 Documentation

- **changelog**: Update v0.11.1 version change log ([ebb559c](https://github.com/littleCareless/dish-ai-commit/commit/ebb559c))

## 0.11.1 (2025-04-11)

### ♻ Code Refactoring

- **prompt**: Refactor the prompt module directory structure ([5826aa2](https://github.com/littleCareless/dish-ai-commit/commit/5826aa2))

- **provider**: Refactor the AI ​​provider execution logic to add a retry mechanism ([154cba2](https://github.com/littleCareless/dish-ai-commit/commit/154cba2))

- **providers**: Unify the AI ​​provider file naming convention ([0aa9db5](https://github.com/littleCareless/dish-ai-commit/commit/0aa9db5))

### 🎫 Chores

- **config**: Add hierarchical commit message function and refactor AI provider ([0f53a45](https://github.com/littleCareless/dish-ai-commit/commit/0f53a45))

### 📝 Documentation

- **changelog**: Update v0.11.0 version change log ([dc2b855](https://github.com/littleCareless/dish-ai-commit/commit/dc2b855))
- **readme**: Update document support for multi-platform AI services and new features ([f89b8e1](https://github.com/littleCareless/dish-ai-commit/commit/f89b8e1))

# 0.11.0 (2025-04-10)

### ✨ Features

- **branch**: Add branch name generation function ([ab9be01](https://github.com/littleCareless/dish-ai-commit/commit/ab9be01))

### 🎫 Chores

- **deps**: Update VSCode engine support version and build dependencies ([d6305d8](https://github.com/littleCareless/dish-ai-commit/commit/d6305d8))

- **deps**: Update dependency configuration requirements ([fa808d9](https://github.com/littleCareless/dish-ai-commit/commit/fa808d9))

### 📝 Documentation

- **version**: Update version to 0.10.3 and synchronize change log ([b8525c1](https://github.com/littleCareless/dish-ai-commit/commit/b8525c1))

### 🔧 Continuous Integration

- **workflows**: Add VS Code plugin release process ([b005f76](https://github.com/littleCareless/dish-ai-commit/commit/b005f76))

## 0.10.3 (2025-04-09)

### ♻ Code Refactoring

- **config**: Refactor the configuration manager to adopt the service split mode ([01750b8](https://github.com/littleCareless/dish-ai-commit/commit/01750b8))

- **config**: Refactor the configuration module split tool function ([150e80a](https://github.com/littleCareless/dish-ai-commit/commit/150e80a))

### 👷 Build System

- **deps**: Upgrade the dependency package version ([88a216e](https://github.com/littleCareless/dish-ai-commit/commit/88a216e))

### 📝 Documentation

- **misc**: Update the version to 0.10.2 ([3362f3f](https://github.com/littleCareless/dish-ai-commit/commit/3362f3f))

## 0.10.2 (2025-04-09)

### 🎫 Chores

- **ui**: Adjust the display order and conditions of the command menu ([10ba90d](https://github.com/littleCareless/dish-ai-commit/commit/10ba90d))

### 📝 Documentation

- **changelog**: Update the version to 0.10.1 ([e49f6b2](https://github.com/littleCareless/dish-ai-commit/commit/e49f6b2))

## 0.10.1 (2025-04-09)

### ♻ Code Refactoring

- **commands**: Refactor code selection file processing logic ([3545cea](https://github.com/littleCareless/dish-ai-commit/commit/3545cea))

- **scm**: Rename SCM service provider file name ([e018086](https://github.com/littleCareless/dish-ai-commit/commit/e018086))

### 🎫 Chores

- **command**: Optimize plugin command configuration ([9e4356a](https://github.com/littleCareless/dish-ai-commit/commit/9e4356a))

- **config**: Adjust the order of menu items and add weekly report generation function ([566384b](https://github.com/littleCareless/dish-ai-commit/commit/566384b))

### 💄 Styles

- **components**: Adjust component file naming conventions ([0a65ab7](https://github.com/littleCareless/dish-ai-commit/commit/0a65ab7))

### 📝 Documentation

- **changelog**: Release 0.10.0 version ([4eee872](https://github.com/littleCareless/dish-ai-commit/commit/4eee872))

# 0.10.0 (2025-04-07)

### ♻ Code Refactoring

- **scm**: Refactor the architecture design and error handling of SVN-related services ([9bc67b7](https://github.com/littleCareless/dish-ai-commit/commit/9bc67b7))

- Refactor file naming conventions and project structure ([214fcfc](https://github.com/littleCareless/dish-ai-commit/commit/214fcfc))

### ✨ Features

- **git**: Optimize Git difference comparison function ([220f047](https://github.com/littleCareless/dish-ai-commit/commit/220f047))

- **provider**: Add Deepseek AI provider support ([f8843be](https://github.com/littleCareless/dish-ai-commit/commit/f8843be))

### 🎫 Chores

- **config**: Optimize configuration and support new AI providers ([5dc41ad](https://github.com/littleCareless/dish-ai-commit/commit/5dc41ad))
- **deps**: Fully upgrade dependency versions ([f592f44](https://github.com/littleCareless/dish-ai-commit/commit/f592f44))
- **deps**: Add packaged dependency configuration ([e00ac04](https://github.com/littleCareless/dish-ai-commit/commit/e00ac04))
- **diff**: Simplify difference handling configuration and remove outdated tools ([f82c7a2](https://github.com/littleCareless/dish-ai-commit/commit/f82c7a2))
- **release**: Release v0.7.1 ([da38bd0](https://github.com/littleCareless/dish-ai-commit/commit/da38bd0))
- **release**: Release v0.8.0 ([ab60b51](https://github.com/littleCareless/dish-ai-commit/commit/ab60b51))

### 👷 Build System

- **deps**: Update the front-end dependency library version ([b884ae1](https://github.com/littleCareless/dish-ai-commit/commit/b884ae1))

### 💄 Styles

- **utils**: Unify file naming conventions to dash style ([4b8d2de](https://github.com/littleCareless/dish-ai-commit/commit/4b8d2de))
- Unify and optimize component styles ([0548121](https://github.com/littleCareless/dish-ai-commit/commit/0548121))

### 📝 Documentation

- **diff**: Refactor the documentation and implementation of the difference processing module ([def11fe](https://github.com/littleCareless/dish-ai-commit/commit/def11fe))

# 0.9.0 (2025-03-21)

### ✨ Features

- **git**: Optimize Git difference comparison function ([220f047](https://github.com/littleCareless/dish-ai-commit/commit/220f047))

### 🎫 Chores

- **release**: Release v0.8.0 ([ab60b51](https://github.com/littleCareless/dish-ai-commit/commit/ab60b51))

### 👷 Build System

- **deps**: Update the front-end dependency library version ([b884ae1](https://github.com/littleCareless/dish-ai-commit/commit/b884ae1))

### 💄 Styles

- Unify and optimize component styles ([0548121](https://github.com/littleCareless/dish-ai-commit/commit/0548121))

# 0.8.0 (2025-03-14)

### ♻ Code Refactoring

- **scm**: Refactor the architecture design and error handling of SVN related services ([9bc67b7](https://github.com/littleCareless/dish-ai-commit/commit/9bc67b7))

### ✨ Features

- **provider**: Add Deepseek AI provider support ([f8843be](https://github.com/littleCareless/dish-ai-commit/commit/f8843be))

### 🎫 Chores

- **config**: Optimize configuration and support new AI providers ([5dc41ad](https://github.com/littleCareless/dish-ai-commit/commit/5dc41ad))

- **deps**: Add package dependency configuration ([e00ac04](https://github.com/littleCareless/dish-ai-commit/commit/e00ac04))
- **diff**: Simplify the difference processing configuration and remove obsolete tools ([f82c7a2](https://github.com/littleCareless/dish-ai-commit/commit/f82c7a2))
- **release**: Release v0.7.1 ([da38bd0](https://github.com/littleCareless/dish-ai-commit/commit/da38bd0))

### 📝 Documentation

- **diff**: Refactor the difference processing module documentation and implementation ([def11fe](https://github.com/littleCareless/dish-ai-commit/commit/def11fe))

## 0.7.1 (2025-02-12)

### 🎫 Chores

- **build**: Add package release script and update configuration file ([10e2211](https://github.com/littleCareless/dish-ai-commit/commit/10e2211))
- **release**: Release v0.7.0 ([fe25433](https://github.com/littleCareless/dish-ai-commit/commit/fe25433))

# 0.7.0 (2025-02-11)

### ♻ Code Refactoring

- **ai**: Refactor model validation and selection logic ([c660a2d](https://github.com/littleCareless/dish-ai-commit/commit/c660a2d))
- **ai**: Refactor model validation and selection logic ([4bd0e55](https://github.com/littleCareless/dish-ai-commit/commit/4bd0e55))
- **deepseek**: Adjust model configuration and type definition ([2b231df](https://github.com/littleCareless/dish-ai-commit/commit/2b231df))
- **deepseek**: Adjust model configuration and type definition ([1f08e97](https://github.com/littleCareless/dish-ai-commit/commit/1f08e97))
- **utils**: Refactor notification, localization and tool class structure ([b8550cd](https://github.com/littleCareless/dish-ai-commit/commit/b8550cd))
- **utils**: Refactor notification, localization and tool class structure ([9a2b4cf](https://github.com/littleCareless/dish-ai-commit/commit/9a2b4cf))

### ✨ Features

- **model**: Optimize model service provision ([ff9c098](https://github.com/littleCareless/dish-ai-commit/commit/ff9c098))
- **svn**: Enhance the path detection and log management of the SVN plug-in ([c90a69d](https://github.com/littleCareless/dish-ai-commit/commit/c90a69d))

### 🎫 Chores

- **error**: Add SVN related error prompts ([4972c4b](https://github.com/littleCareless/dish-ai-commit/commit/4972c4b))

- **locale**: Optimize the prompt for the completion of the weekly report generation ([efebbe3](https://github.com/littleCareless/dish-ai-commit/commit/efebbe3))

- **release**: Release v0.6.3 ([db6ff67](https://github.com/littleCareless/dish-ai-commit/commit/db6ff67))

### 🐛 Bug Fixes

- **provider**: Optimize VSCode provider error message handling ([9ccb51a](https://github.com/littleCareless/dish-ai-commit/commit/9ccb51a))

## 0.6.3 (2025-02-06)

### 🎫 Chores

- **scm**: Optimize version control system detection and commit message processing ([d92553e](https://github.com/littleCareless/dish-ai-commit/commit/d92553e))

## 0.6.2 (2025-02-03)

### 🎫 Chores

- **release**: Release v0.6.2 ([ed75871](https://github.com/littleCareless/dish-ai-commit/commit/ed75871))

### 🐛 Bug Fixes

- **core**: Fix file selection and internationalization issues ([4bd85f6](https://github.com/littleCareless/dish-ai-commit/commit/4bd85f6))

## 0.6.1 (2025-01-22)

### 🐛 Bug Fixes

- **i18n**: Optimize the logic of obtaining localization manager instances ([7e52052](https://github.com/littleCareless/dish-ai-commit/commit/7e52052))

### 📝 Documentation

- **changelog**: Update version to 0.6.0 ([4810b27](https://github.com/littleCareless/dish-ai-commit/commit/4810b27))

# 0.6.0 (2025-01-22)

### ♻ Code Refactoring

- **commands**: Refactor the command class system and add code documentation ([bd1443f](https://github.com/littleCareless/dish-ai-commit/commit/bd1443f))

### ✨ Features

- **utils**: Add code review report generator and optimization tool class ([d9da1b3](https://github.com/littleCareless/dish-ai-commit/commit/d9da1b3))

### 🎫 Chores

- **config**: Enhance configuration management system documentation and type definition ([2e70f09](https://github.com/littleCareless/dish-ai-commit/commit/2e70f09))

- **features**: Add code review feature ([af250fd](https://github.com/littleCareless/dish-ai-commit/commit/af250fd))
- **i18n**: Update internationalized strings and optimize localization logic ([76f57d7](https://github.com/littleCareless/dish-ai-commit/commit/76f57d7))
- **review**: Add internationalized text related to code review ([6c72cf8](https://github.com/littleCareless/dish-ai-commit/commit/6c72cf8))

### 📝 Documentation

- **ai**: Add complete comment documentation for AI service provider related classes ([2989f03](https://github.com/littleCareless/dish-ai-commit/commit/2989f03))
- **changelog**: Updated version to 0.5.3 ([e09e3bc](https://github.com/littleCareless/dish-ai-commit/commit/e09e3bc))
- **github**: Added GitHub Copilot assistant configuration instructions ([c9fe402](https://github.com/littleCareless/dish-ai-commit/commit/c9fe402))
- **scm**: Added source code management module detailed comments and type definitions ([79801c4](https://github.com/littleCareless/dish-ai-commit/commit/79801c4))
- **ts**: Optimized code documentation and comments ([cc32d54](https://github.com/littleCareless/dish-ai-commit/commit/cc32d54))
- **typescript**: Optimized code comments and type declarations ([35cbe88](https://github.com/littleCareless/dish-ai-commit/commit/35cbe88))

## 0.5.3 (2025-01-06)

### 🎫 Chores

- **build**: Optimize build configuration and dependency management ([9a7cc25](https://github.com/littleCareless/dish-ai-commit/commit/9a7cc25)

## 0.5.2 (2025-01-06)

### 🎫 Chores

- **build**: Optimize webview build path and resource loading ([c7f3872](https://github.com/littleCareless/dish-ai-commit/commit/c7f3872))

## 0.5.1 (2025-01-03)

### 🎫 Chores

- **config**: Update eslint config and remove package-lock.json ([d95e6b3](https://github.com/littleCareless/dish-ai-commit/commit/d95e6b3))

### 📝 Documentation

- Update version to 0.5.0 and update documentation simultaneously ([ed6b512](https://github.com/littleCareless/dish-ai-commit/commit/ed6b512))

# 0.5.0 (2025-01-03)

### ✨ Features

- **Weekly**: Update the weekly report page using vite react rendering ([15bee62](https://github.com/littleCareless/dish-ai-commit/commit/15bee62))

### 🎫 Chores

- **config**: Optimize project configuration and dependency management ([01e53ed](https://github.com/littleCareless/dish-ai-commit/commit/01e53ed))

- **package**: Update dependencies ([e005364](https://github.com/littleCareless/dish-ai-commit/commit/e005364))

- **webview**: Refactor WebView communication and interface logic ([01f5f93](https://github.com/littleCareless/dish-ai-commit/commit/01f5f93))

### 📝 Documentation

- **config**: Update configuration item structure and description ([0eacdaf](https://github.com/littleCareless/dish-ai-commit/commit/0eacdaf))

- **package**: Update application description and classification information ([b5e6c27](https://github.com/littleCareless/dish-ai-commit/commit/b5e6c27))

- **readme**: Optimize README file, add command list and configuration instructions ([b80993c](https://github.com/littleCareless/dish-ai-commit/commit/b80993c))

- **version**: Update project version to 0.4.3 ([9d8ed6d](https://github.com/littleCareless/dish-ai-commit/commit/9d8ed6d))
- **version**: Updated project version to 0.4.4 ([9ebfc88](https://github.com/littleCareless/dish-ai-commit/commit/9ebfc88))
- Updated document content and configuration instructions ([618dd56](https://github.com/littleCareless/dish-ai-commit/commit/618dd56))

## 0.4.4 (2024-12-19)

### 🎫 Chores

- **config**: Modify the naming of Zhipu AI related configurations ([3773623](https://github.com/littleCareless/dish-ai-commit/commit/3773623))

### 📝 Documentation

- **config**: Update the configuration item structure and description ([0eacdaf](https://github.com/littleCareless/dish-ai-commit/commit/0eacdaf))

- **version**: Update the project version to 0.4.2 ([7967df6](https://github.com/littleCareless/dish-ai-commit/commit/7967df6))

- **version**: Update the project version to 0.4.3 ([9d8ed6d](https://github.com/littleCareless/dish-ai-commit/commit/9d8ed6d))

## 0.4.3 (2024-12-16)

### 🎫 Chores

- **config**: Modify the naming of Zhipu AI related configurations ([3773623](https://github.com/littleCareless/dish-ai-commit/commit/3773623))

### 📝 Documentation

- **version**: Update the project version to 0.4.2 ([7967df6](https://github.com/littleCareless/dish-ai-commit/commit/7967df6))

## 0.4.2 (2024-12-13)

### 📝 Documentation

- **version**: Updated to 0.4.1 ([56c5c29](https://github.com/littleCareless/dish-ai-commit/commit/56c5c29))
- Added free AI model support instructions and new feature introduction ([a7ff464](https://github.com/littleCareless/dish-ai-commit/commit/a7ff464))

## 0.4.1 (2024-12-13)

### 🎫 Chores

- **providers**: Optimized AI provider configuration and error handling ([4dde116](https://github.com/littleCareless/dish-ai-commit/commit/4dde116))

### 📝 Documentation

- **changelog**: Released 0.4.0 version and updated configuration files ([911ed64](https://github.com/littleCareless/dish-ai-commit/commit/911ed64))

# 0.4.0 (2024-12-13)

### ✨ Features

- **Weekly Report**: Add weekly report generation function configuration and internationalization support ([7471d2c](https://github.com/littleCareless/dish-ai-commit/commit/7471d2c))

### 📝 Documentation

- **changelog**: Release 0.3.0 version and update documentation ([cd0f05e](https://github.com/littleCareless/dish-ai-commit/commit/cd0f05e))

# 0.3.0 (2024-12-13)

### ✨ Features

- **weekly**: 添加 AI 生成周报功能 ([b557c7a](https://github.com/littleCareless/dish-ai-commit/commit/b557c7a))
- **weeklyReport**: 添加生成周报的功能 ([04e999e](https://github.com/littleCareless/dish-ai-commit/commit/04e999e))

### 🎫 Chores

- **config**: 重构周报功能并添加 Gemini AI 支持 ([02b00fc](https://github.com/littleCareless/dish-ai-commit/commit/02b00fc))
- **release**: 发布 0.2.0 版本 ([29e89ce](https://github.com/littleCareless/dish-ai-commit/commit/29e89ce))

# 0.2.0 (2024-12-12)

### ♻ Code Refactoring

- **ai**: 优化 AI 提供程序和参数配置 ([238d03a](https://github.com/littleCareless/dish-ai-commit/commit/238d03a))
- **commands**: 重构命令处理类的代码结构和类型 ([d9cebd5](https://github.com/littleCareless/dish-ai-commit/commit/d9cebd5))
- **config**: 重构配置管理系统架构 ([664d6d4](https://github.com/littleCareless/dish-ai-commit/commit/664d6d4))
- **config**: 重构配置系统和 AI 提供商配置结构 ([480f7d0](https://github.com/littleCareless/dish-ai-commit/commit/480f7d0))
- **config**: 重构配置系统架构 ([7eb3ff2](https://github.com/littleCareless/dish-ai-commit/commit/7eb3ff2))
- **localization**: 统一配置项命名风格 ([74ae537](https://github.com/littleCareless/dish-ai-commit/commit/74ae537))
- **prompt**: 重构提交消息生成器功能 ([791cb75](https://github.com/littleCareless/dish-ai-commit/commit/791cb75))
- **providers**: 优化配置管理器的类型推断 ([9e97e1c](https://github.com/littleCareless/dish-ai-commit/commit/9e97e1c))

### ✨ Features

- **app**: 升级版本至 0.2.0 ([fbae238](https://github.com/littleCareless/dish-ai-commit/commit/fbae238))
- **commands**: 增强命令执行和错误处理功能 ([cf8654b](https://github.com/littleCareless/dish-ai-commit/commit/cf8654b))
- **scm**: 添加获取提交信息输入框内容功能 ([e670326](https://github.com/littleCareless/dish-ai-commit/commit/e670326))
- **scripts**: 添加配置更新脚本功能 ([96fa854](https://github.com/littleCareless/dish-ai-commit/commit/96fa854))

### 🎫 Chores

- **config**: 重构配置系统架构 ([36ba4d7](https://github.com/littleCareless/dish-ai-commit/commit/36ba4d7))
- **config**: 重构配置项结构并增强功能 ([27848c2](https://github.com/littleCareless/dish-ai-commit/commit/27848c2))
- **deps**: 添加依赖和配置相关更新 ([2bd795a](https://github.com/littleCareless/dish-ai-commit/commit/2bd795a))
- **extension**: 移除配置验证并优化错误处理格式 ([28662ab](https://github.com/littleCareless/dish-ai-commit/commit/28662ab))
- **release**: 发布 0.1.0 版本 ([9a39771](https://github.com/littleCareless/dish-ai-commit/commit/9a39771))

### 💄 Styles

- **git**: 优化代码格式和错误处理逻辑 ([b413151](https://github.com/littleCareless/dish-ai-commit/commit/b413151))

### 📝 Documentation

- **readme**: 更新 README 文件以包含更多 AI 服务支持 ([79eda9d](https://github.com/littleCareless/dish-ai-commit/commit/79eda9d))

# 0.1.0 (2024-12-10)

### ♻ Code Refactoring

- **commands**: 重构命令处理逻辑并优化错误处理 ([d708190](https://github.com/littleCareless/dish-ai-commit/commit/d708190))
- **core**: 重构命令管理和错误处理 ([cad5b4e](https://github.com/littleCareless/dish-ai-commit/commit/cad5b4e))
- **scm**: 优化源代码管理部分 ([5e5d791](https://github.com/littleCareless/dish-ai-commit/commit/5e5d791))
- **utils**: 优化工具类的错误处理和性能 ([73dfaf4](https://github.com/littleCareless/dish-ai-commit/commit/73dfaf4))
- Reorganize AI provider and SCM integration ([968e9aa](https://github.com/littleCareless/dish-ai-commit/commit/968e9aa))

### ✨ Features

- **ai**: 添加 AI 工具类和模型选择服务 ([5603b08](https://github.com/littleCareless/dish-ai-commit/commit/5603b08))
- **config**: 新增多个 AI 服务提供商的配置支持 ([fa072f1](https://github.com/littleCareless/dish-ai-commit/commit/fa072f1))
- **docs**: 添加多语言支持链接到更新日志和 README 文件 ([fd16226](https://github.com/littleCareless/dish-ai-commit/commit/fd16226))
- **locale**: 更新国际化语言文案 ([54d806f](https://github.com/littleCareless/dish-ai-commit/commit/54d806f))
- **rebranding**: 重新命名并增强 AI 提交信息扩展 ([9f41dc1](https://github.com/littleCareless/dish-ai-commit/commit/9f41dc1))

### 🎫 Chores

- **ai**: 增强 AI 提供商管理系统 ([1b36a48](https://github.com/littleCareless/dish-ai-commit/commit/1b36a48))
- **commitlint**: 简化提交消息类型配置 ([0dad6c2](https://github.com/littleCareless/dish-ai-commit/commit/0dad6c2))
- **config**: 完善项目配置文件 ([f9bd1e2](https://github.com/littleCareless/dish-ai-commit/commit/f9bd1e2))
- 更新配置和项目结构 ([ae2507b](https://github.com/littleCareless/dish-ai-commit/commit/ae2507b))

### 🐛 Bug Fixes

- **api**: Normalize openai provider enum and improve logging ([451f284](https://github.com/littleCareless/dish-ai-commit/commit/451f284))
- **scm**: 修复 GitProvider 和 SvnProvider 中的错误处理逻辑 ([b2854e2](https://github.com/littleCareless/dish-ai-commit/commit/b2854e2))

### 💄 Styles

- **assets**: Update icon and logo with modern ai design ([870326e](https://github.com/littleCareless/dish-ai-commit/commit/870326e))
- **assets**: Update visual assets ([811bb8c](https://github.com/littleCareless/dish-ai-commit/commit/811bb8c))

### 📝 Documentation

- Update README and README.zh-CN files ([2e3c5b4](https://github.com/littleCareless/dish-ai-commit/commit/2e3c5b4))
