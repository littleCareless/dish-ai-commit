# Changelog

[English](CHANGELOG.md) | [简体中文](CHANGELOG.zh-CN.md)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

## 0.32.1 (2025-07-24)

### 🎫 Chores

- **release**: 发布 0.32.0 版本 ([603ae47](https://github.com/littleCareless/dish-ai-commit/commit/603ae47))

### 👷 Build System

- **publish**: 添加对 Open VSX 仓库的发布支持 ([8db6498](https://github.com/littleCareless/dish-ai-commit/commit/8db6498))

### 💄 Styles

- **ui**: 为命令添加独立的图标以增强可识别性 ([7eabf3e](https://github.com/littleCareless/dish-ai-commit/commit/7eabf3e))

### 🔧 Continuous Integration

- **workflow**: 添加扩展自动部署工作流 ([0b8de9e](https://github.com/littleCareless/dish-ai-commit/commit/0b8de9e))

# 0.32.0 (2025-07-16)

### ♻ Code Refactoring

- **settings**: 重构代码索引的 Embedding 设置并支持 OpenAI 兼容模式 ([69d850e](https://github.com/littleCareless/dish-ai-commit/commit/69d850e))

### ✨ Features

- **ai**: 为 AI 提供者和模型添加嵌入式模型支持 ([2ca264a](https://github.com/littleCareless/dish-ai-commit/commit/2ca264a))
- **core**: 引入项目文档、编码规范和 AI 规则系统 ([428d7bb](https://github.com/littleCareless/dish-ai-commit/commit/428d7bb))
- **embedding**: 实现对嵌入式模型的支持和发现 ([93860eb](https://github.com/littleCareless/dish-ai-commit/commit/93860eb))
- **git**: 重构 getDiff 方法并增强差异简化功能 ([c60de5c](https://github.com/littleCareless/dish-ai-commit/commit/c60de5c))
- **indexing**: 支持 OpenAI 兼容的嵌入服务 ([732e759](https://github.com/littleCareless/dish-ai-commit/commit/732e759))
- **provider**: 新增 SiliconFlow 提供商并重构模型类型系统 ([0a85dbf](https://github.com/littleCareless/dish-ai-commit/commit/0a85dbf))

### 🎫 Chores

- **release**: 发布 0.31.0 版本 ([73fa73b](https://github.com/littleCareless/dish-ai-commit/commit/73fa73b))

# 0.31.0 (2025-07-06)

### ♻ Code Refactoring

- **core**: 移除调试日志并添加 AI 规则文件 ([3066909](https://github.com/littleCareless/dish-ai-commit/commit/3066909))

### ✨ Features

- **prompt**: 实现动态提交信息提示词生成器 ([40974a0](https://github.com/littleCareless/dish-ai-commit/commit/40974a0))
- **provider**: 新增支持多种 AI 服务提供商 ([6477aa9](https://github.com/littleCareless/dish-ai-commit/commit/6477aa9))
- **providers**: 新增对多个主流 AI 服务提供商的支持 ([d335d11](https://github.com/littleCareless/dish-ai-commit/commit/d335d11))

### 🎫 Chores

- **release**: 发布 0.30.0 版本 ([724a3a4](https://github.com/littleCareless/dish-ai-commit/commit/724a3a4))

### 🐛 Bug Fixes

- **menu**: 调整 SCM 资源文件夹上下文菜单的顺序 ([3b3d281](https://github.com/littleCareless/dish-ai-commit/commit/3b3d281))

# 0.30.0 (2025-07-02)

### ♻ Code Refactoring

- **ai/provider**: 重构 AI 提供程序以使用标准化的消息结构 ([f648afe](https://github.com/littleCareless/dish-ai-commit/commit/f648afe))

### ✨ Features

- **config**: 新增 “使用最近提交作为参考” 配置项 ([4dee82c](https://github.com/littleCareless/dish-ai-commit/commit/4dee82c))
- **context**: 引入最近提交和高级差异处理以优化 AI 上下文 ([013f923](https://github.com/littleCareless/dish-ai-commit/commit/013f923))
- **prompt**: 重构提示词结构并引入近期提交参考功能 ([8da8117](https://github.com/littleCareless/dish-ai-commit/commit/8da8117))
- **scm**: 添加获取最近提交记录功能并重构 diff 逻辑 ([c212d72](https://github.com/littleCareless/dish-ai-commit/commit/c212d72))

### 🎫 Chores

- **release**: 发布 0.29.0 版本 ([f0e1bc1](https://github.com/littleCareless/dish-ai-commit/commit/f0e1bc1))

# 0.29.0 (2025-06-29)

### ♻ Code Refactoring

- **prompt**: 优化 AI 提示词和上下文处理逻辑 ([816a9c0](https://github.com/littleCareless/dish-ai-commit/commit/816a9c0))

### ✨ Features

- **commit-generation**: 显示提示词长度和模型限制 ([37108b9](https://github.com/littleCareless/dish-ai-commit/commit/37108b9))

### 🎫 Chores

- **release**: 发布 0.28.0 版本 ([9747dbf](https://github.com/littleCareless/dish-ai-commit/commit/9747dbf))

### 📝 Documentation

- **readme**: 更新文档以反映新功能和配置 ([07b910a](https://github.com/littleCareless/dish-ai-commit/commit/07b910a))

# 0.28.0 (2025-06-25)

### ✨ Features

- **ai**: 实现通过函数调用生成提交信息 ([768aa19](https://github.com/littleCareless/dish-ai-commit/commit/768aa19))
- **config**: 增强配置系统，支持工作区配置及实验特性 ([b616881](https://github.com/littleCareless/dish-ai-commit/commit/b616881))
- **settings**: 重构设置系统，实现动态 UI 及功能说明 ([65c4b4a](https://github.com/littleCareless/dish-ai-commit/commit/65c4b4a))

### 🎫 Chores

- **i18n**: 添加函数调用相关的国际化文案 ([31aec06](https://github.com/littleCareless/dish-ai-commit/commit/31aec06))
- **release**: 发布 0.27.0 版本 ([d18e397](https://github.com/littleCareless/dish-ai-commit/commit/d18e397))

# 0.27.0 (2025-06-24)

### ✨ Features

- **embedding**: 改进嵌入服务并实现消息国际化 ([bc90f70](https://github.com/littleCareless/dish-ai-commit/commit/bc90f70))

### 🎫 Chores

- **release**: 发布 0.26.0 版本 ([20764b6](https://github.com/littleCareless/dish-ai-commit/commit/20764b6))

# 0.26.0 (2025-06-23)

### ♻ Code Refactoring

- **embedding**: 调整 embedding 功能集成并移除旧配置 ([5a9bec6](https://github.com/littleCareless/dish-ai-commit/commit/5a9bec6))

### ✨ Features

- **scm**: 为 SCM 提供程序引入异步初始化机制 ([c9bcc09](https://github.com/littleCareless/dish-ai-commit/commit/c9bcc09))
- **svn**: 增强 SVN 路径检测逻辑 ([14320c3](https://github.com/littleCareless/dish-ai-commit/commit/14320c3))

### 🎫 Chores

- **i18n**: 新增国际化提示信息 ([1956b36](https://github.com/littleCareless/dish-ai-commit/commit/1956b36))
- **release**: 发布 0.25.0 版本 ([f7b780c](https://github.com/littleCareless/dish-ai-commit/commit/f7b780c))

### 🐛 Bug Fixes

- **settings**: 修复索引清除逻辑并优化配置加载 ([ecb710d](https://github.com/littleCareless/dish-ai-commit/commit/ecb710d))

### 💄 Styles

- **codebase**: 统一代码风格并重构 toast 操作类型 ([d8398be](https://github.com/littleCareless/dish-ai-commit/commit/d8398be))

# 0.25.0 (2025-06-20)

### ✨ Features

- **indexing**: 新增清除索引及根据配置变更重新索引功能 ([d18b425](https://github.com/littleCareless/dish-ai-commit/commit/d18b425))

### 🎫 Chores

- **release**: 发布 0.24.0 版本 ([997c323](https://github.com/littleCareless/dish-ai-commit/commit/997c323))

# 0.24.0 (2025-06-20)

### ✨ Features

- **indexing**: 改进索引服务初始化、错误处理及配置更新机制 ([da37075](https://github.com/littleCareless/dish-ai-commit/commit/da37075))

### 🎫 Chores

- **release**: 发布 0.23.1 版本 ([ee1eda6](https://github.com/littleCareless/dish-ai-commit/commit/ee1eda6))

## 0.23.1 (2025-06-19)

### ♻ Code Refactoring

- **logging**: 优化模型加载日志警告的格式 ([31091a6](https://github.com/littleCareless/dish-ai-commit/commit/31091a6))

### 🎫 Chores

- **release**: 准备 0.23.0 版本发布 ([3a0a01f](https://github.com/littleCareless/dish-ai-commit/commit/3a0a01f))

### 💄 Styles

- **icon**: 更新菜单和视图图标 ([1de232a](https://github.com/littleCareless/dish-ai-commit/commit/1de232a))

### 📝 Documentation

- **readme**: 更新内容并添加国际化支持 ([212f58a](https://github.com/littleCareless/dish-ai-commit/commit/212f58a))

# 0.23.0 (2025-06-18)

### ✨ Features

- **indexing**: 增强嵌入服务并改进错误处理 ([6652b5d](https://github.com/littleCareless/dish-ai-commit/commit/6652b5d))
- **setting**: 改进索引错误处理与显示 ([7f4e558](https://github.com/littleCareless/dish-ai-commit/commit/7f4e558))
- **settings**: 增强设置页面保存提示并更新菜单标签 ([a7a9002](https://github.com/littleCareless/dish-ai-commit/commit/a7a9002))

### 🎫 Chores

- **release**: 准备 0.22.0 版本发布 ([19df93a](https://github.com/littleCareless/dish-ai-commit/commit/19df93a))

### 🐛 Bug Fixes

- **indexing**: 增强索引错误处理与报告 ([8227100](https://github.com/littleCareless/dish-ai-commit/commit/8227100))

# 0.22.0 (2025-06-17)

### ♻ Code Refactoring

- **commands**: 调整命令中的嵌入上下文逻辑 ([f67fd95](https://github.com/littleCareless/dish-ai-commit/commit/f67fd95))
- **utils**: 移除不再使用的配置模块 ([f67eb75](https://github.com/littleCareless/dish-ai-commit/commit/f67eb75))
- **webview/settings**: 重构设置视图，分离关注点并改进配置管理 ([3edd1d2](https://github.com/littleCareless/dish-ai-commit/commit/3edd1d2))

### ✨ Features

- **ai**: 集成嵌入服务以提供相似代码上下文 ([a4a011e](https://github.com/littleCareless/dish-ai-commit/commit/a4a011e))
- **branding**: 更新插件标题和图标 ([cbeaf6e](https://github.com/littleCareless/dish-ai-commit/commit/cbeaf6e))
- **code-index**: 实现可配置的 embedding 服务并增强索引稳定性 ([7323665](https://github.com/littleCareless/dish-ai-commit/commit/7323665))
- **config**: 引入 embedding 功能并更新相关配置 ([8e88ddb](https://github.com/littleCareless/dish-ai-commit/commit/8e88ddb))
- **core, ai**: 集成嵌入服务并添加设置视图 ([c5b3bab](https://github.com/littleCareless/dish-ai-commit/commit/c5b3bab))
- **core**: 新增多个核心工具函数 ([9dd8ad1](https://github.com/littleCareless/dish-ai-commit/commit/9dd8ad1))
- **core**: 引入代码解析与向量存储依赖 ([8d5bcf7](https://github.com/littleCareless/dish-ai-commit/commit/8d5bcf7))
- **glob**: 实现文件和目录忽略逻辑 ([72ac425](https://github.com/littleCareless/dish-ai-commit/commit/72ac425))
- **indexing**: 集成 EmbeddingServiceManager 并添加 Qdrant 相关配置 ([0a91691](https://github.com/littleCareless/dish-ai-commit/commit/0a91691))
- **indexing**: 集成 Ollama，改进代码解析与分块，增加索引进度 ([437c76b](https://github.com/littleCareless/dish-ai-commit/commit/437c76b))
- **indexing**: 新增 EmbeddingService 管理器 ([3279a92](https://github.com/littleCareless/dish-ai-commit/commit/3279a92))
- **indexing**: 引入代码语义索引和搜索功能 ([981841f](https://github.com/littleCareless/dish-ai-commit/commit/981841f))
- **setting**: 新增设置页面 UI，支持代码索引配置 ([1ef3c28](https://github.com/littleCareless/dish-ai-commit/commit/1ef3c28))
- **settings**: 添加服务连接测试并重构代码索引设置 UI ([b2706ee](https://github.com/littleCareless/dish-ai-commit/commit/b2706ee))
- **tree-sitter**: 实现基于 WASM 的多语言解析和查询功能 ([8841069](https://github.com/littleCareless/dish-ai-commit/commit/8841069))
- **ui, core**: 新增设置界面并升级代码解析库 ([5aaae4f](https://github.com/littleCareless/dish-ai-commit/commit/5aaae4f))
- **webview-ui**: 引入多视图支持并添加设置页面 ([4e41e02](https://github.com/littleCareless/dish-ai-commit/commit/4e41e02))
- **webview**: 实现插件设置视图提供程序 ([2727a5e](https://github.com/littleCareless/dish-ai-commit/commit/2727a5e))
- **webview**: 新增设置与周报页面，并更新项目标识符 ([773e017](https://github.com/littleCareless/dish-ai-commit/commit/773e017))

### 🎫 Chores

- **config**: 添加工作区配置模式 ([dc6a621](https://github.com/littleCareless/dish-ai-commit/commit/dc6a621))
- **constants**: 添加核心常量定义 ([5194e01](https://github.com/littleCareless/dish-ai-commit/commit/5194e01))
- **deps**: 更新依赖项并调整 typescript 依赖类型 ([ce22e8b](https://github.com/littleCareless/dish-ai-commit/commit/ce22e8b))
- **release**: 发布 0.21.1 版本 ([1f59412](https://github.com/littleCareless/dish-ai-commit/commit/1f59412))

### 🐛 Bug Fixes

- **build**: 修复构建脚本未复制 WASM 文件的问题 ([6aa39de](https://github.com/littleCareless/dish-ai-commit/commit/6aa39de))

## 0.21.1 (2025-06-13)

### ♻ Code Refactoring

- **ai-provider**: 重构 AI 提供程序流式请求参数处理 ([1544c46](https://github.com/littleCareless/dish-ai-commit/commit/1544c46))
- **progress**: 优化命令进度显示与用户反馈 ([1c098fa](https://github.com/littleCareless/dish-ai-commit/commit/1c098fa))

### 🎫 Chores

- **i18n**: 新增 PR 摘要生成进度相关的国际化文案 ([e437a0c](https://github.com/littleCareless/dish-ai-commit/commit/e437a0c))
- **release**: 发布 0.21.0 版本 ([f79a70c](https://github.com/littleCareless/dish-ai-commit/commit/f79a70c))

# 0.21.0 (2025-06-13)

### ✨ Features

- **ai-provider**: 为 AI 提供程序实现 PR 摘要生成功能 ([c0c9d48](https://github.com/littleCareless/dish-ai-commit/commit/c0c9d48))
- **config**: 添加 PR 摘要配置选项 ([d933c69](https://github.com/littleCareless/dish-ai-commit/commit/d933c69))
- **extension**: 添加生成 PR 摘要功能 ([d9b1d21](https://github.com/littleCareless/dish-ai-commit/commit/d9b1d21))
- **pr-summary**: 添加生成 PR 摘要功能 ([5867855](https://github.com/littleCareless/dish-ai-commit/commit/5867855))
- **pr-summary**: 添加生成 PR 摘要功能 ([78c92c1](https://github.com/littleCareless/dish-ai-commit/commit/78c92c1))
- **scm**: 新增获取提交日志与分支列表功能 ([be86233](https://github.com/littleCareless/dish-ai-commit/commit/be86233))

### 🎫 Chores

- **i18n**: 更新国际化文件，支持 PR 摘要等新功能 ([9a29abb](https://github.com/littleCareless/dish-ai-commit/commit/9a29abb))
- **release**: 发布 0.20.2 版本 ([08a3d09](https://github.com/littleCareless/dish-ai-commit/commit/08a3d09))

## 0.20.2 (2025-06-12)

### 🎫 Chores

- **vscode**: 将 images/demo.gif 添加到忽略列表 ([e0938ba](https://github.com/littleCareless/dish-ai-commit/commit/e0938ba))

### 🐛 Bug Fixes

- **build**: 修复依赖和 Node 引擎兼容性问题 ([d1f8daa](https://github.com/littleCareless/dish-ai-commit/commit/d1f8daa))
- **core**: 改进命令可用性并更新至 0.20.1 版本 ([de573b0](https://github.com/littleCareless/dish-ai-commit/commit/de573b0))

## 0.20.1 (2025-06-11)

### ♻ Code Refactoring

- **gemini**: 重构 Gemini AI 提供者 ([8469266](https://github.com/littleCareless/dish-ai-commit/commit/8469266))
- **zhipu**: 移除过时模型 ([483bf38](https://github.com/littleCareless/dish-ai-commit/commit/483bf38))

### 🎫 Chores

- **deps**: 降级 vscode 引擎及类型定义版本 ([75bb17d](https://github.com/littleCareless/dish-ai-commit/commit/75bb17d))
- **deps**: 更新依赖项并删除 package-lock.json ([7e5c9e8](https://github.com/littleCareless/dish-ai-commit/commit/7e5c9e8))
- **model-picker**: 为模型选择逻辑添加注释 ([2ec10db](https://github.com/littleCareless/dish-ai-commit/commit/2ec10db))
- **release**: 发布 0.20.0 版本 ([f276e47](https://github.com/littleCareless/dish-ai-commit/commit/f276e47))

### 🐛 Bug Fixes

- **openai**: 修复模型获取失败的日志 ([887bbeb](https://github.com/littleCareless/dish-ai-commit/commit/887bbeb))

# 0.20.0 (2025-06-10)

### ✨ Features

- **command**: 集成 AI 服务条款确认并支持流式任务取消 ([276f709](https://github.com/littleCareless/dish-ai-commit/commit/276f709))
- **images**: 新增演示 GIF 图像 ([33ab53c](https://github.com/littleCareless/dish-ai-commit/commit/33ab53c))
- **state**: 引入状态管理模块 ([48dd04f](https://github.com/littleCareless/dish-ai-commit/commit/48dd04f))

### 🎫 Chores

- **i18n**: 添加 AI 服务条款与用户取消操作相关的本地化条目 ([ad38e39](https://github.com/littleCareless/dish-ai-commit/commit/ad38e39))
- **release**: 升级版本至 0.19.0 并更新变更日志 ([1711136](https://github.com/littleCareless/dish-ai-commit/commit/1711136))

### 🐛 Bug Fixes

- **scm**: 修复 Git 日志查询中作者名特殊字符转义 ([924a7b7](https://github.com/littleCareless/dish-ai-commit/commit/924a7b7))

# 0.19.0 (2025-06-04)

### ♻ Code Refactoring

- **generatecommitcommand**: 重构提交生成命令，移除旧版执行逻辑 ([342d3a0](https://github.com/littleCareless/dish-ai-commit/commit/342d3a0))

### ✨ Features

- **ai-providers**: 实现 AI 提供程序流式请求并更新智谱配置 ([31c5899](https://github.com/littleCareless/dish-ai-commit/commit/31c5899))
- **ai**: 增加流式生成提交信息功能 ([663ac26](https://github.com/littleCareless/dish-ai-commit/commit/663ac26))
- **generate-commit-command**: 实现流式生成提交信息功能 ([4ef52fa](https://github.com/littleCareless/dish-ai-commit/commit/4ef52fa))
- **scm**: 为 SCM 提供程序添加流式输入支持 ([de1f6b2](https://github.com/littleCareless/dish-ai-commit/commit/de1f6b2))

### 🎫 Chores

- **i18n**: 新增流式生成相关的国际化文案 ([49a2b90](https://github.com/littleCareless/dish-ai-commit/commit/49a2b90))
- **version**: 升级版本至 0.18.0 ([bf5dbf2](https://github.com/littleCareless/dish-ai-commit/commit/bf5dbf2))

### 📝 Documentation

- **changelog**: 更新变更日志至 0.18.0 版本 ([6bb864d](https://github.com/littleCareless/dish-ai-commit/commit/6bb864d))

# 0.18.0 (2025-06-03)

### ✨ Features

- **ai**: 新增可选的 users 参数以支持团队成员报告 ([91bb290](https://github.com/littleCareless/dish-ai-commit/commit/91bb290))
- **generate-branch-name-command**: 优化生成分支名称命令 ([edba80f](https://github.com/littleCareless/dish-ai-commit/commit/edba80f))

### 🎫 Chores

- **i18n**: 更新国际化文件 ([16fc868](https://github.com/littleCareless/dish-ai-commit/commit/16fc868))
- **release**: 发布 0.17.0 版本 ([d3d2c51](https://github.com/littleCareless/dish-ai-commit/commit/d3d2c51))

# 0.17.0 (2025-05-28)

### ✨ Features

- **editor**: 增强编辑器，同步格式状态并改进样式 ([4c6499d](https://github.com/littleCareless/dish-ai-commit/commit/4c6499d))
- **prompt**: 增强周报提示，增加禁止操作和 HTML 输出说明 ([d8ff7ad](https://github.com/littleCareless/dish-ai-commit/commit/d8ff7ad))

### 👷 Build System

- **deps**: 升级版本至 0.16.0 并引入 @typescript/native-preview ([9e92ca0](https://github.com/littleCareless/dish-ai-commit/commit/9e92ca0))

# 0.16.0 (2025-05-23)

### ✨ Features

- **gemini**: 添加新版本 Gemini 2.5 模型支持 ([ac6bdca](https://github.com/littleCareless/dish-ai-commit/commit/ac6bdca))

### 🐛 Bug Fixes

- **package**: 修复版本控制系统条件表达式格式 ([cd1cb34](https://github.com/littleCareless/dish-ai-commit/commit/cd1cb34))

### 📝 Documentation

- **changelog**: 更新变更日志和版本号至 0.15.2 ([24f0d4a](https://github.com/littleCareless/dish-ai-commit/commit/24f0d4a))

## 0.15.2 (2025-05-22)

### 🐛 Bug Fixes

- **package**: 优化命令显示条件逻辑 ([3cf6755](https://github.com/littleCareless/dish-ai-commit/commit/3cf6755))

### 👷 Build System

- **version**: 发布 v0.15.0 版本 ([64a92a3](https://github.com/littleCareless/dish-ai-commit/commit/64a92a3))

# 0.15.0 (2025-05-09)

### ✨ Features

- **config**: 添加提交信息正文开关配置项 ([e2011f0](https://github.com/littleCareless/dish-ai-commit/commit/e2011f0))
- **prompt**: 重构提交消息生成逻辑 ([0d5da20](https://github.com/littleCareless/dish-ai-commit/commit/0d5da20))

### 👷 Build System

- **version**: 发布 v0.14.2 版本 ([e3b8c78](https://github.com/littleCareless/dish-ai-commit/commit/e3b8c78))

## 0.14.2 (2025-05-07)

### 🎫 Chores

- **build**: 更新构建配置和 AI 提供器实现 ([f9e057b](https://github.com/littleCareless/dish-ai-commit/commit/f9e057b))

### 👷 Build System

- **version**: 发布 v0.14.0 版本 ([813446d](https://github.com/littleCareless/dish-ai-commit/commit/813446d))

# 0.14.0 (2025-04-22)

### ✨ Features

- **log**: 增强版本控制日志提取功能 ([1b2dcf8](https://github.com/littleCareless/dish-ai-commit/commit/1b2dcf8))

### 🎫 Chores

- **config**: 调整系统配置及周报生成提示器 ([b63b18a](https://github.com/littleCareless/dish-ai-commit/commit/b63b18a))

### 👷 Build System

- **version**: 发布 v0.13.3 版本 ([6dc6bfc](https://github.com/littleCareless/dish-ai-commit/commit/6dc6bfc))

## 0.13.3 (2025-04-18)

### 🎫 Chores

- **config**: 优化插件配置和构建脚本 ([f71ea75](https://github.com/littleCareless/dish-ai-commit/commit/f71ea75))

### 👷 Build System

- **version**: 发布 v0.13.2 版本 ([1d1f40b](https://github.com/littleCareless/dish-ai-commit/commit/1d1f40b))

## 0.13.2 (2025-04-18)

### 🐛 Bug Fixes

- **package**: 修复菜单命令顺序错误 ([070fd6c](https://github.com/littleCareless/dish-ai-commit/commit/070fd6c))

### 👷 Build System

- **version**: 发布 v0.13.1 版本 ([2e41c7f](https://github.com/littleCareless/dish-ai-commit/commit/2e41c7f))

### 💄 Styles

- 忽略.DS_Store 文件 ([c8fa89a](https://github.com/littleCareless/dish-ai-commit/commit/c8fa89a))

## 0.13.1 (2025-04-18)

### 🎫 Chores

- **release**: 发布 v0.13.0 版本 ([0f45fcc](https://github.com/littleCareless/dish-ai-commit/commit/0f45fcc))

### 🐛 Bug Fixes

- **git**: 优化生成的提交信息内容处理 ([8e8a528](https://github.com/littleCareless/dish-ai-commit/commit/8e8a528))

# 0.13.0 (2025-04-18)

### ♻ Code Refactoring

- **ai**: 优化 AI 服务提供商的温度配置参数 ([cf82e72](https://github.com/littleCareless/dish-ai-commit/commit/cf82e72))

### ✨ Features

- **gemini**: 全面更新 Gemini 系列模型并重构服务提供者 ([48d9ea4](https://github.com/littleCareless/dish-ai-commit/commit/48d9ea4))
- **model**: 重构 AI 模型识别机制 ([65bfa2a](https://github.com/littleCareless/dish-ai-commit/commit/65bfa2a))

### 🎫 Chores

- **ai**: 调整 AI 提供者配置和错误处理 ([be7debd](https://github.com/littleCareless/dish-ai-commit/commit/be7debd))
- **config**: 修复表情符号显示问题 ([eb9c48d](https://github.com/littleCareless/dish-ai-commit/commit/eb9c48d))
- **locale**: 添加生成失败和模型选择相关的翻译 ([1cce980](https://github.com/littleCareless/dish-ai-commit/commit/1cce980))
- **version**: 更新项目版本至 0.12.5 ([884e2ff](https://github.com/littleCareless/dish-ai-commit/commit/884e2ff))

### 👷 Build System

- **deps**: 添加 @google/genai 依赖包 ([cceb650](https://github.com/littleCareless/dish-ai-commit/commit/cceb650))

## 0.12.5 (2025-04-17)

### 🎫 Chores

- **version**: 更新项目版本至 0.12.4 ([28d5d8e](https://github.com/littleCareless/dish-ai-commit/commit/28d5d8e))

### 🐛 Bug Fixes

- **misc**: 优化提交信息与分支名生成功能 ([78530f3](https://github.com/littleCareless/dish-ai-commit/commit/78530f3))

## 0.12.4 (2025-04-17)

### 📝 Documentation

- **version**: 更新版本号至 0.12.3 ([bba3f9d](https://github.com/littleCareless/dish-ai-commit/commit/bba3f9d))

## 0.12.3 (2025-04-16)

### 🎫 Chores

- **build**: 优化 VSCode 插件打包配置 ([bfe8766](https://github.com/littleCareless/dish-ai-commit/commit/bfe8766))
- **vscode**: 更新 VSCode 配置文件 ([178e4d3](https://github.com/littleCareless/dish-ai-commit/commit/178e4d3))

### 👷 Build System

- **bundle**: 添加 esbuild 打包支持 ([bcc989f](https://github.com/littleCareless/dish-ai-commit/commit/bcc989f))

### 📝 Documentation

- **changelog**: 更新版本至 0.12.2 ([d7cf90d](https://github.com/littleCareless/dish-ai-commit/commit/d7cf90d))

## 0.12.2 (2025-04-16)

### 🐛 Bug Fixes

- **scm**: 优化子目录 Git 仓库检测逻辑 ([7a478af](https://github.com/littleCareless/dish-ai-commit/commit/7a478af))

### 👷 Build System

- **release**: 发布版本 v0.12.1 ([4567997](https://github.com/littleCareless/dish-ai-commit/commit/4567997))

## 0.12.1 (2025-04-15)

### ♻ Code Refactoring

- **config**: 调整配置项的默认值和格式 ([82d6f70](https://github.com/littleCareless/dish-ai-commit/commit/82d6f70))

### 🎫 Chores

- **ci**: 添加 pnpm 环境配置 ([aa361d8](https://github.com/littleCareless/dish-ai-commit/commit/aa361d8))
- **deps**: 将构建脚本从 pnpm 切换至 npm ([e06bda5](https://github.com/littleCareless/dish-ai-commit/commit/e06bda5))

### 👷 Build System

- **version**: 升级项目版本至 0.12.0 ([4c86577](https://github.com/littleCareless/dish-ai-commit/commit/4c86577))

# 0.12.0 (2025-04-14)

### ✨ Features

- **ai**: 增强 AI 接口参数和提示词处理能力 ([ee04aa8](https://github.com/littleCareless/dish-ai-commit/commit/ee04aa8))
- **deps**: 添加 vsce 作为开发依赖 ([5e782fe](https://github.com/littleCareless/dish-ai-commit/commit/5e782fe))

### 👷 Build System

- **version**: 更新项目版本至 0.11.4 ([e80dab0](https://github.com/littleCareless/dish-ai-commit/commit/e80dab0))

## 0.11.4 (2025-04-14)

### ♻ Code Refactoring

- **ai**: 重命名 generateResponse 方法为 generateCommit ([92383ab](https://github.com/littleCareless/dish-ai-commit/commit/92383ab))

### 🎫 Chores

- **types**: 修复日期选择器类型定义 ([20dce25](https://github.com/littleCareless/dish-ai-commit/commit/20dce25))

### 📝 Documentation

- **changelog**: 更新项目版本至 0.11.3 ([64ea845](https://github.com/littleCareless/dish-ai-commit/commit/64ea845))

### 🔧 Continuous Integration

- **workflow**: 添加 GitHub Actions 发布流程 ([8914a22](https://github.com/littleCareless/dish-ai-commit/commit/8914a22))

## 0.11.3 (2025-04-14)

### ♻ Code Refactoring

- **ai**: 重构生成周报和代码评审功能 Prompt ([96a10fa](https://github.com/littleCareless/dish-ai-commit/commit/96a10fa))

### 📝 Documentation

- **changelog**: 更新 v0.11.2 版本文档 ([c5177cc](https://github.com/littleCareless/dish-ai-commit/commit/c5177cc))

## 0.11.2 (2025-04-11)

### ♻ Code Refactoring

- **config**: 优化配置结构 ([eb1755f](https://github.com/littleCareless/dish-ai-commit/commit/eb1755f))
- **prompt**: 完善提示词生成逻辑 ([2ff9e59](https://github.com/littleCareless/dish-ai-commit/commit/2ff9e59))

### 📝 Documentation

- **changelog**: 更新 v0.11.1 版本变更记录 ([ebb559c](https://github.com/littleCareless/dish-ai-commit/commit/ebb559c))

## 0.11.1 (2025-04-11)

### ♻ Code Refactoring

- **prompt**: 重构提示词模块目录结构 ([5826aa2](https://github.com/littleCareless/dish-ai-commit/commit/5826aa2))
- **provider**: 重构 AI 提供者执行逻辑添加重试机制 ([154cba2](https://github.com/littleCareless/dish-ai-commit/commit/154cba2))
- **providers**: 统一 AI 提供者文件命名规范 ([0aa9db5](https://github.com/littleCareless/dish-ai-commit/commit/0aa9db5))

### 🎫 Chores

- **config**: 添加分层提交消息功能及重构 AI 提供者 ([0f53a45](https://github.com/littleCareless/dish-ai-commit/commit/0f53a45))

### 📝 Documentation

- **changelog**: 更新 v0.11.0 版本变更日志 ([dc2b855](https://github.com/littleCareless/dish-ai-commit/commit/dc2b855))
- **readme**: 更新文档支持多平台 AI 服务和新功能说明 ([f89b8e1](https://github.com/littleCareless/dish-ai-commit/commit/f89b8e1))

# 0.11.0 (2025-04-10)

### ✨ Features

- **branch**: 添加分支名称生成功能 ([ab9be01](https://github.com/littleCareless/dish-ai-commit/commit/ab9be01))

### 🎫 Chores

- **deps**: 更新 VSCode 引擎支持版本和构建依赖 ([d6305d8](https://github.com/littleCareless/dish-ai-commit/commit/d6305d8))
- **deps**: 更新依赖配置要求 ([fa808d9](https://github.com/littleCareless/dish-ai-commit/commit/fa808d9))

### 📝 Documentation

- **version**: 更新版本至 0.10.3 并同步更新日志 ([b8525c1](https://github.com/littleCareless/dish-ai-commit/commit/b8525c1))

### 🔧 Continuous Integration

- **workflows**: 添加 VS Code 插件发布流程 ([b005f76](https://github.com/littleCareless/dish-ai-commit/commit/b005f76))

## 0.10.3 (2025-04-09)

### ♻ Code Refactoring

- **config**: 重构配置管理器，采用服务拆分模式 ([01750b8](https://github.com/littleCareless/dish-ai-commit/commit/01750b8))
- **config**: 重构配置模块拆分工具函数 ([150e80a](https://github.com/littleCareless/dish-ai-commit/commit/150e80a))

### 👷 Build System

- **deps**: 升级依赖包版本 ([88a216e](https://github.com/littleCareless/dish-ai-commit/commit/88a216e))

### 📝 Documentation

- **misc**: 更新版本至 0.10.2 ([3362f3f](https://github.com/littleCareless/dish-ai-commit/commit/3362f3f))

## 0.10.2 (2025-04-09)

### 🎫 Chores

- **ui**: 调整命令菜单的显示顺序与条件 ([10ba90d](https://github.com/littleCareless/dish-ai-commit/commit/10ba90d))

### 📝 Documentation

- **changelog**: 更新版本至 0.10.1 ([e49f6b2](https://github.com/littleCareless/dish-ai-commit/commit/e49f6b2))

## 0.10.1 (2025-04-09)

### ♻ Code Refactoring

- **commands**: 重构代码选中文件处理逻辑 ([3545cea](https://github.com/littleCareless/dish-ai-commit/commit/3545cea))
- **scm**: 重命名 SCM 服务提供者文件名 ([e018086](https://github.com/littleCareless/dish-ai-commit/commit/e018086))

### 🎫 Chores

- **command**: 优化插件命令配置 ([9e4356a](https://github.com/littleCareless/dish-ai-commit/commit/9e4356a))
- **config**: 调整菜单项顺序并新增周报生成功能 ([566384b](https://github.com/littleCareless/dish-ai-commit/commit/566384b))

### 💄 Styles

- **components**: 调整组件文件命名规范 ([0a65ab7](https://github.com/littleCareless/dish-ai-commit/commit/0a65ab7))

### 📝 Documentation

- **changelog**: 发布 0.10.0 版本 ([4eee872](https://github.com/littleCareless/dish-ai-commit/commit/4eee872))

# 0.10.0 (2025-04-07)

### ♻ Code Refactoring

- **scm**: 重构 SVN 相关服务的架构设计与错误处理 ([9bc67b7](https://github.com/littleCareless/dish-ai-commit/commit/9bc67b7))
- 重构文件命名规范及项目结构 ([214fcfc](https://github.com/littleCareless/dish-ai-commit/commit/214fcfc))

### ✨ Features

- **git**: 优化 Git 差异比较功能 ([220f047](https://github.com/littleCareless/dish-ai-commit/commit/220f047))
- **provider**: 添加 Deepseek AI 提供商支持 ([f8843be](https://github.com/littleCareless/dish-ai-commit/commit/f8843be))

### 🎫 Chores

- **config**: 优化配置和支持新的 AI 提供商 ([5dc41ad](https://github.com/littleCareless/dish-ai-commit/commit/5dc41ad))
- **deps**: 全面升级依赖项版本 ([f592f44](https://github.com/littleCareless/dish-ai-commit/commit/f592f44))
- **deps**: 添加打包依赖配置 ([e00ac04](https://github.com/littleCareless/dish-ai-commit/commit/e00ac04))
- **diff**: 简化差异处理配置并移除过时工具 ([f82c7a2](https://github.com/littleCareless/dish-ai-commit/commit/f82c7a2))
- **release**: 发布 v0.7.1 版本 ([da38bd0](https://github.com/littleCareless/dish-ai-commit/commit/da38bd0))
- **release**: 发布 v0.8.0 版本 ([ab60b51](https://github.com/littleCareless/dish-ai-commit/commit/ab60b51))

### 👷 Build System

- **deps**: 更新前端依赖库版本 ([b884ae1](https://github.com/littleCareless/dish-ai-commit/commit/b884ae1))

### 💄 Styles

- **utils**: 统一文件命名规范为短横线风格 ([4b8d2de](https://github.com/littleCareless/dish-ai-commit/commit/4b8d2de))
- 统一优化组件样式 ([0548121](https://github.com/littleCareless/dish-ai-commit/commit/0548121))

### 📝 Documentation

- **diff**: 重构差异处理模块文档和实现 ([def11fe](https://github.com/littleCareless/dish-ai-commit/commit/def11fe))

# 0.9.0 (2025-03-21)

### ✨ Features

- **git**: 优化 Git 差异比较功能 ([220f047](https://github.com/littleCareless/dish-ai-commit/commit/220f047))

### 🎫 Chores

- **release**: 发布 v0.8.0 版本 ([ab60b51](https://github.com/littleCareless/dish-ai-commit/commit/ab60b51))

### 👷 Build System

- **deps**: 更新前端依赖库版本 ([b884ae1](https://github.com/littleCareless/dish-ai-commit/commit/b884ae1))

### 💄 Styles

- 统一优化组件样式 ([0548121](https://github.com/littleCareless/dish-ai-commit/commit/0548121))

# 0.8.0 (2025-03-14)

### ♻ Code Refactoring

- **scm**: 重构 SVN 相关服务的架构设计与错误处理 ([9bc67b7](https://github.com/littleCareless/dish-ai-commit/commit/9bc67b7))

### ✨ Features

- **provider**: 添加 Deepseek AI 提供商支持 ([f8843be](https://github.com/littleCareless/dish-ai-commit/commit/f8843be))

### 🎫 Chores

- **config**: 优化配置和支持新的 AI 提供商 ([5dc41ad](https://github.com/littleCareless/dish-ai-commit/commit/5dc41ad))
- **deps**: 添加打包依赖配置 ([e00ac04](https://github.com/littleCareless/dish-ai-commit/commit/e00ac04))
- **diff**: 简化差异处理配置并移除过时工具 ([f82c7a2](https://github.com/littleCareless/dish-ai-commit/commit/f82c7a2))
- **release**: 发布 v0.7.1 版本 ([da38bd0](https://github.com/littleCareless/dish-ai-commit/commit/da38bd0))

### 📝 Documentation

- **diff**: 重构差异处理模块文档和实现 ([def11fe](https://github.com/littleCareless/dish-ai-commit/commit/def11fe))

## 0.7.1 (2025-02-12)

### 🎫 Chores

- **build**: 添加打包发布脚本并更新配置文件 ([10e2211](https://github.com/littleCareless/dish-ai-commit/commit/10e2211))
- **release**: 发布 v0.7.0 版本 ([fe25433](https://github.com/littleCareless/dish-ai-commit/commit/fe25433))

# 0.7.0 (2025-02-11)

### ♻ Code Refactoring

- **ai**: 重构模型验证和选择逻辑 ([c660a2d](https://github.com/littleCareless/dish-ai-commit/commit/c660a2d))
- **ai**: 重构模型验证和选择逻辑 ([4bd0e55](https://github.com/littleCareless/dish-ai-commit/commit/4bd0e55))
- **deepseek**: 调整模型配置和类型定义 ([2b231df](https://github.com/littleCareless/dish-ai-commit/commit/2b231df))
- **deepseek**: 调整模型配置和类型定义 ([1f08e97](https://github.com/littleCareless/dish-ai-commit/commit/1f08e97))
- **utils**: 重构通知、本地化和工具类结构 ([b8550cd](https://github.com/littleCareless/dish-ai-commit/commit/b8550cd))
- **utils**: 重构通知、本地化和工具类结构 ([9a2b4cf](https://github.com/littleCareless/dish-ai-commit/commit/9a2b4cf))

### ✨ Features

- **model**: 优化模型提供服务 ([ff9c098](https://github.com/littleCareless/dish-ai-commit/commit/ff9c098))
- **svn**: 增强 SVN 插件的路径检测与日志管理 ([c90a69d](https://github.com/littleCareless/dish-ai-commit/commit/c90a69d))

### 🎫 Chores

- **error**: 添加 SVN 相关错误提示文案 ([4972c4b](https://github.com/littleCareless/dish-ai-commit/commit/4972c4b))
- **locale**: 优化周报生成完成的提示语 ([efebbe3](https://github.com/littleCareless/dish-ai-commit/commit/efebbe3))
- **release**: 发布 v0.6.3 版本 ([db6ff67](https://github.com/littleCareless/dish-ai-commit/commit/db6ff67))

### 🐛 Bug Fixes

- **provider**: 优化 VSCode 提供器错误信息处理 ([9ccb51a](https://github.com/littleCareless/dish-ai-commit/commit/9ccb51a))

## 0.6.3 (2025-02-06)

### 🎫 Chores

- **scm**: 优化版本控制系统检测和提交消息处理 ([d92553e](https://github.com/littleCareless/dish-ai-commit/commit/d92553e))

## 0.6.2 (2025-02-03)

### 🎫 Chores

- **release**: 发布 v0.6.2 版本 ([ed75871](https://github.com/littleCareless/dish-ai-commit/commit/ed75871))

### 🐛 Bug Fixes

- **core**: 修复文件选择和国际化问题 ([4bd85f6](https://github.com/littleCareless/dish-ai-commit/commit/4bd85f6))

## 0.6.1 (2025-01-22)

### 🐛 Bug Fixes

- **i18n**: 优化本地化管理器实例获取逻辑 ([7e52052](https://github.com/littleCareless/dish-ai-commit/commit/7e52052))

### 📝 Documentation

- **changelog**: 更新版本至 0.6.0 ([4810b27](https://github.com/littleCareless/dish-ai-commit/commit/4810b27))

# 0.6.0 (2025-01-22)

### ♻ Code Refactoring

- **commands**: 重构命令类系统并增加代码文档 ([bd1443f](https://github.com/littleCareless/dish-ai-commit/commit/bd1443f))

### ✨ Features

- **utils**: 添加代码审查报告生成器和优化工具类 ([d9da1b3](https://github.com/littleCareless/dish-ai-commit/commit/d9da1b3))

### 🎫 Chores

- **config**: 增强配置管理系统文档和类型定义 ([2e70f09](https://github.com/littleCareless/dish-ai-commit/commit/2e70f09))
- **features**: 添加代码评审功能 ([af250fd](https://github.com/littleCareless/dish-ai-commit/commit/af250fd))
- **i18n**: 更新国际化字符串并优化本地化逻辑 ([76f57d7](https://github.com/littleCareless/dish-ai-commit/commit/76f57d7))
- **review**: 添加代码评审相关的国际化文案 ([6c72cf8](https://github.com/littleCareless/dish-ai-commit/commit/6c72cf8))

### 📝 Documentation

- **ai**: 为 AI 服务提供者相关类添加完整注释文档 ([2989f03](https://github.com/littleCareless/dish-ai-commit/commit/2989f03))
- **changelog**: 更新版本至 0.5.3 ([e09e3bc](https://github.com/littleCareless/dish-ai-commit/commit/e09e3bc))
- **github**: 新增 GitHub Copilot 助手配置说明 ([c9fe402](https://github.com/littleCareless/dish-ai-commit/commit/c9fe402))
- **scm**: 添加源代码管理模块详细注释和类型定义 ([79801c4](https://github.com/littleCareless/dish-ai-commit/commit/79801c4))
- **ts**: 优化代码文档和注释 ([cc32d54](https://github.com/littleCareless/dish-ai-commit/commit/cc32d54))
- **typescript**: 优化代码注释和类型声明 ([35cbe88](https://github.com/littleCareless/dish-ai-commit/commit/35cbe88))

## 0.5.3 (2025-01-06)

### 🎫 Chores

- **build**: 优化构建配置和依赖管理 ([9a7cc25](https://github.com/littleCareless/dish-ai-commit/commit/9a7cc25))

## 0.5.2 (2025-01-06)

### 🎫 Chores

- **build**: 优化 webview 构建路径和资源加载 ([c7f3872](https://github.com/littleCareless/dish-ai-commit/commit/c7f3872))

## 0.5.1 (2025-01-03)

### 🎫 Chores

- **config**: 更新 eslint 配置并移除 package-lock.json ([d95e6b3](https://github.com/littleCareless/dish-ai-commit/commit/d95e6b3))

### 📝 Documentation

- 更新版本至 0.5.0 并同步更新文档 ([ed6b512](https://github.com/littleCareless/dish-ai-commit/commit/ed6b512))

# 0.5.0 (2025-01-03)

### ✨ Features

- **周报**: 周报页面更新 使用 vite react 渲染 ([15bee62](https://github.com/littleCareless/dish-ai-commit/commit/15bee62))

### 🎫 Chores

- **config**: 优化项目配置和依赖管理 ([01e53ed](https://github.com/littleCareless/dish-ai-commit/commit/01e53ed))
- **package**: 更新依赖项 ([e005364](https://github.com/littleCareless/dish-ai-commit/commit/e005364))
- **webview**: 重构 WebView 通信和界面逻辑 ([01f5f93](https://github.com/littleCareless/dish-ai-commit/commit/01f5f93))

### 📝 Documentation

- **config**: 更新配置项结构和描述 ([0eacdaf](https://github.com/littleCareless/dish-ai-commit/commit/0eacdaf))
- **package**: 更新应用描述和分类信息 ([b5e6c27](https://github.com/littleCareless/dish-ai-commit/commit/b5e6c27))
- **readme**: 优化 README 文件，添加命令列表和配置说明 ([b80993c](https://github.com/littleCareless/dish-ai-commit/commit/b80993c))
- **version**: 更新项目版本至 0.4.3 ([9d8ed6d](https://github.com/littleCareless/dish-ai-commit/commit/9d8ed6d))
- **version**: 更新项目版本至 0.4.4 ([9ebfc88](https://github.com/littleCareless/dish-ai-commit/commit/9ebfc88))
- 更新文档内容和配置说明 ([618dd56](https://github.com/littleCareless/dish-ai-commit/commit/618dd56))

## 0.4.4 (2024-12-19)

### 🎫 Chores

- **config**: 修改智谱 AI 相关配置命名 ([3773623](https://github.com/littleCareless/dish-ai-commit/commit/3773623))

### 📝 Documentation

- **config**: 更新配置项结构和描述 ([0eacdaf](https://github.com/littleCareless/dish-ai-commit/commit/0eacdaf))
- **version**: 更新项目版本至 0.4.2 ([7967df6](https://github.com/littleCareless/dish-ai-commit/commit/7967df6))
- **version**: 更新项目版本至 0.4.3 ([9d8ed6d](https://github.com/littleCareless/dish-ai-commit/commit/9d8ed6d))

## 0.4.3 (2024-12-16)

### 🎫 Chores

- **config**: 修改智谱 AI 相关配置命名 ([3773623](https://github.com/littleCareless/dish-ai-commit/commit/3773623))

### 📝 Documentation

- **version**: 更新项目版本至 0.4.2 ([7967df6](https://github.com/littleCareless/dish-ai-commit/commit/7967df6))

## 0.4.2 (2024-12-13)

### 📝 Documentation

- **version**: 更新版本至 0.4.1 ([56c5c29](https://github.com/littleCareless/dish-ai-commit/commit/56c5c29))
- 添加免费 AI 模型支持说明及新功能介绍 ([a7ff464](https://github.com/littleCareless/dish-ai-commit/commit/a7ff464))

## 0.4.1 (2024-12-13)

### 🎫 Chores

- **providers**: 优化 AI 服务商配置和错误处理 ([4dde116](https://github.com/littleCareless/dish-ai-commit/commit/4dde116))

### 📝 Documentation

- **changelog**: 发布 0.4.0 版本并更新配置文件 ([911ed64](https://github.com/littleCareless/dish-ai-commit/commit/911ed64))

# 0.4.0 (2024-12-13)

### ✨ Features

- **周报**: 添加周报生成功能配置和国际化支持 ([7471d2c](https://github.com/littleCareless/dish-ai-commit/commit/7471d2c))

### 📝 Documentation

- **changelog**: 发布 0.3.0 版本并更新文档 ([cd0f05e](https://github.com/littleCareless/dish-ai-commit/commit/cd0f05e))

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
