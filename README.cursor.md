项目结构总览
这是一个 VSCode 扩展项目，主要用于 AI 辅助的代码提交信息生成、周报生成和代码审查。项目采用 TypeScript + React 技术栈开发。


.
├── CHANGELOG.md
├── CHANGELOG.zh-CN.md
├── commitlint.config.mjs
├── dish-ai-commit-0.6.1.vsix
├── dish-ai-commit-0.6.2.vsix
├── eslint.config.mjs
├── i18n
│   ├── en.json
│   └── zh-cn.json
├── images
│   ├── icon.svg
│   └── logo.png
├── license
├── package.json
├── package-lock.json
├── pnpm-lock.yaml
├── README.cursor.md
├── README.md
├── README.zh-CN.md
├── src
│   ├── ai
│   │   ├── AIProviderFactory.ts
│   │   ├── providers
│   │   │   ├── BaseOpenAIProvider.ts
│   │   │   ├── DashScopeProvider.ts
│   │   │   ├── DeepseekAIProvider.ts
│   │   │   ├── DoubaoProvider.ts
│   │   │   ├── GeminiAIProvider.ts
│   │   │   ├── OllamaProvider.ts
│   │   │   ├── OpenAIProvider.ts
│   │   │   ├── VscodeProvider.ts
│   │   │   └── ZhipuAIProvider.ts
│   │   ├── types.ts
│   │   └── utils
│   │       └── generateHelper.ts
│   ├── commands
│   │   ├── BaseCommand.ts
│   │   ├── GenerateCommitCommand.ts
│   │   ├── GenerateWeeklyReportCommand.ts
│   │   ├── ReviewCodeCommand.ts
│   │   └── SelectModelCommand.ts
│   ├── commands.ts
│   ├── config
│   │   ├── ConfigGenerator.ts
│   │   ├── ConfigSchema.ts
│   │   ├── ConfigurationManager.ts
│   │   ├── DefaultConfig.ts
│   │   ├── generated
│   │   │   └── configKeys.ts
│   │   └── types.ts
│   ├── constants.ts
│   ├── extension.ts
│   ├── prompt
│   │   ├── codeReview.ts
│   │   ├── prompt.ts
│   │   └── weeklyReport.ts
│   ├── scm
│   │   ├── AuthorService.ts
│   │   ├── CommitLogStrategy.ts
│   │   ├── GitProvider.ts
│   │   ├── SCMProvider.ts
│   │   ├── SvnProvider.ts
│   │   └── SvnUtils.ts
│   ├── scripts
│   │   └── updateConfig.ts
│   ├── services
│   │   ├── ModelPickerService.ts
│   │   └── weeklyReport.ts
│   ├── types
│   │   └── weeklyReport.ts
│   ├── utils
│   │   ├── date
│   │   │   ├── date.md
│   │   │   ├── DateUtils.ts
│   │   │   └── index.ts
│   │   ├── diff
│   │   │   ├── DiffFormatter.ts
│   │   │   ├── diff.md
│   │   │   ├── DiffSimplifier.ts
│   │   │   ├── DiffSplitter.ts
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── i18n
│   │   │   ├── i18n.md
│   │   │   ├── index.ts
│   │   │   └── LocalizationManager.ts
│   │   ├── index.ts
│   │   ├── notification
│   │   │   ├── index.ts
│   │   │   ├── NotificationManager.ts
│   │   │   ├── notification.md
│   │   │   ├── NotificationTypes.ts
│   │   │   └── ProgressHandler.ts
│   │   ├── review
│   │   │   ├── CodeReviewReportGenerator.ts
│   │   │   ├── index.ts
│   │   │   └── review.md
│   │   └── webview
│   │       ├── index.ts
│   │       ├── webview.md
│   │       └── webview.ts
│   ├── webview
│   │   ├── config
│   │   │   └── ModelConfigurationManager.ts
│   │   ├── handlers
│   │   │   └── WeeklyReportMessageHandler.ts
│   │   ├── providers
│   │   │   └── WeeklyReportViewProvider.ts
│   │   ├── services
│   │   │   └── WeeklyReportGenerator.ts
│   │   └── WeeklyReportPanel.ts
│   └── webview-ui
│       ├── components.json
│       ├── eslint.config.js
│       ├── index.html
│       ├── package.json
│       ├── pnpm-lock.yaml
│       ├── postcss.config.js
│       ├── src
│       │   ├── App.css
│       │   ├── App.tsx
│       │   ├── components
│       │   │   ├── DateRangeSelector.tsx
│       │   │   ├── Editor.tsx
│       │   │   └── ui
│       │   │       ├── accordion.tsx
│       │   │       ├── alert-dialog.tsx
│       │   │       ├── alert.tsx
│       │   │       ├── aspect-ratio.tsx
│       │   │       ├── avatar.tsx
│       │   │       ├── badge.tsx
│       │   │       ├── breadcrumb.tsx
│       │   │       ├── button.tsx
│       │   │       ├── calendar.tsx
│       │   │       ├── card.tsx
│       │   │       ├── carousel.tsx
│       │   │       ├── chart.tsx
│       │   │       ├── checkbox.tsx
│       │   │       ├── collapsible.tsx
│       │   │       ├── command.tsx
│       │   │       ├── context-menu.tsx
│       │   │       ├── dialog.tsx
│       │   │       ├── drawer.tsx
│       │   │       ├── dropdown-menu.tsx
│       │   │       ├── form.tsx
│       │   │       ├── hover-card.tsx
│       │   │       ├── input-otp.tsx
│       │   │       ├── input.tsx
│       │   │       ├── label.tsx
│       │   │       ├── menubar.tsx
│       │   │       ├── navigation-menu.tsx
│       │   │       ├── pagination.tsx
│       │   │       ├── popover.tsx
│       │   │       ├── progress.tsx
│       │   │       ├── radio-group.tsx
│       │   │       ├── resizable.tsx
│       │   │       ├── scroll-area.tsx
│       │   │       ├── select.tsx
│       │   │       ├── separator.tsx
│       │   │       ├── sheet.tsx
│       │   │       ├── skeleton.tsx
│       │   │       ├── slider.tsx
│       │   │       ├── sonner.tsx
│       │   │       ├── switch.tsx
│       │   │       ├── table.tsx
│       │   │       ├── tabs.tsx
│       │   │       ├── textarea.tsx
│       │   │       ├── toaster.tsx
│       │   │       ├── toast.tsx
│       │   │       ├── toggle-group.tsx
│       │   │       ├── toggle.tsx
│       │   │       └── tooltip.tsx
│       │   ├── constants.ts
│       │   ├── contexts
│       │   │   └── ExtensionContext.tsx
│       │   ├── hooks
│       │   │   └── use-toast.ts
│       │   ├── index.css
│       │   ├── lib
│       │   │   ├── constants.ts
│       │   │   ├── utils.ts
│       │   │   └── vscode.ts
│       │   ├── main.tsx
│       │   ├── types
│       │   │   └── vscode.d.ts
│       │   └── vite-env.d.ts
│       ├── tailwind.config.js
│       ├── tsconfig.app.json
│       ├── tsconfig.app.tsbuildinfo
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       ├── tsconfig.node.tsbuildinfo
│       └── vite.config.ts
├── tsconfig.json
├── vsc-extension-quickstart.md
└── webview-ui-dist
    ├── index.css
    ├── index.html
    └── index.js

36 directories, 164 files
首先看顶层目录的组织方式:
1. 基础配置文件 - package.json, tsconfig.json 等用于项目配置
2. 文档文件 - README.md 及其国际化版本
3. src/ - 主要源代码目录
4. webview-ui-dist/ - 编译后的 WebView UI 文件
5. i18n/ - 国际化资源文件

项目采用 TypeScript 开发,使用了现代前端工具链。从目录结构可以看出这是一个功能完整的 VS Code 扩展,包含:
- AI 辅助功能 (src/ai/)
- 命令系统 (src/commands/)
- 配置管理 (src/config/)
- 源代码管理集成 (src/scm/)
- WebView UI (src/webview-ui/)
顶级目录重要文件:
package.json: 项目的 NPM 配置文件,定义了项目依赖和 VS Code 扩展配置
tsconfig.json: TypeScript 编译配置
README.md/README.zh-CN.md: 项目文档及其中文版本
CHANGELOG.md/CHANGELOG.zh-CN.md: 版本变更记录
i18n: 国际化资源文件目录
src 目录 - 主要源代码:
ai/: AI 相关实现

providers/: 不同 AI 服务提供商的实现
AIProviderFactory.ts: AI 提供商工厂类
types.ts: AI 相关类型定义
commands/: VS Code 命令实现

BaseCommand.ts: 基础命令类
GenerateCommitCommand.ts: 生成提交信息命令
GenerateWeeklyReportCommand.ts: 生成周报命令
ReviewCodeCommand.ts: 代码审查命令
SelectModelCommand.ts: 选择 AI 模型命令
config/: 配置管理

ConfigSchema.ts: 配置模式定义
ConfigurationManager.ts: 配置管理器
generated/configKeys.ts: 生成的配置键常量
scm/: 源代码管理集成

GitProvider.ts: Git 集成
SvnProvider.ts: SVN 集成
SCMProvider.ts: SCM 提供商接口
utils/: 工具函数

date/: 日期处理
diff/: 差异比较
i18n: 国际化
notification/: 通知管理
review/: 代码审查
webview/: WebView 相关
webview-ui/ 目录 - WebView UI 实现:
使用 React + TypeScript 构建
包含多个UI组件
使用 Tailwind CSS 进行样式管理
完整的构建配置
项目特点:
完善的国际化支持
模块化的架构设计
丰富的工具函数支持
规范的代码组织
完整的构建和发布流程

3. 主要功能模块
3.1 AI 集成模块 (src/ai/)
支持多种 AI 提供商：OpenAI、Gemini、DashScope、DeepSeek、ZhipuAI 等
使用工厂模式管理不同 AI 提供商
统一的接口定义和类型系统
3.2 命令模块 (src/commands/)
生成代码提交信息
生成周报
代码审查
AI 模型选择
3.3 源代码管理模块 (src/scm/)
支持 Git 和 SVN 两种版本控制系统
统一的 SCM 提供商接口
版本控制相关操作封装
3.4 配置管理 (src/config/)
扩展配置管理
默认配置提供
配置模式定义
3.5 WebView UI (src/webview-ui/)
基于 React + TypeScript
使用 Vite 作为构建工具
现代化 UI 组件库
支持主题切换
响应式设计
4. 技术特点
架构设计
模块化架构
工厂模式
依赖注入
面向接口编程
技术栈
TypeScript
React
Vite
Tailwind CSS
VSCode Extension API
代码质量
ESLint 代码检查
TypeScript 类型检查
统一的代码风格
国际化
支持多语言（中英文文档）
本地化管理器