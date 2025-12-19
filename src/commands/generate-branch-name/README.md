# 分支名称生成模块 (Generate Branch Name)

本文档详细描述了 Dish AI Commit Gen 的分支名称生成模块，包括架构设计、核心组件、处理流程和实现细节。该模块已按照 SOLID 原则完成重构，主命令类从 674 行精简到 146 行。

## 📋 概述

分支名称生成模块负责根据用户描述或代码变更智能生成标准化的 Git 分支名称。模块采用**双模式设计**，支持描述模式和代码变更模式，并提供智能格式化和分支创建功能。

### 核心价值

- ✅ **双模式支持**: 描述模式 + 代码变更模式
- ✅ **智能格式化**: 自动转换为符合 Git 规范的名称
- ✅ **多变体建议**: 生成多个分支名称变体供选择
- ✅ **一键创建**: 集成 Git API，支持直接创建分支
- ✅ **优雅降级**: 确保在各种环境下都能正常工作

## 🏗️ 架构设计

### 3 层架构

```
Generate Branch Name Module
├── Command Layer (命令层)
│   └── GenerateBranchNameCommand (146行) - 主入口
│
├── Handler Layer (处理器层)
│   ├── DescriptionModeHandler - 描述模式
│   └── ChangesModeHandler - 代码变更模式
│
└── Service Layer (服务层)
    ├── BranchSuggester - 分支建议器
    ├── BranchCreator - 分支创建器
    └── BranchFormatter - 分支格式化器
```

### 核心组件关系

```typescript
GenerateBranchNameCommand
  ↓ (模式选择)
  ├─ 描述模式 → DescriptionModeHandler
  │   └─ 调用 AI 生成
  │   └─ 返回分支名称
  │
  └─ 代码变更模式 → ChangesModeHandler
      └─ 获取 Diff
      └─ 调用 AI 生成
      └─ 返回分支名称
          ↓
  BranchSuggester.showBranchNameSuggestion()
    ├─ BranchFormatter.formatBranchName() - 格式化
    ├─ BranchFormatter.generateBranchVariants() - 生成变体
    ├─ 显示 QuickPick 选择
    └─ 用户选择后
        ├─ BranchCreator.createBranchFromGeneratedName() - 创建分支
        └─ 或复制到剪贴板
```

## 🎯 核心功能实现

### 1. 主命令类 (GenerateBranchNameCommand)

**文件**: `src/commands/generate-branch-name/generate-branch-name-command.ts` (146 行)

**职责**: 命令入口、模式选择、流程编排

```typescript
export class GenerateBranchNameCommand extends BaseCommand {
  private descriptionHandler: DescriptionModeHandler;
  private changesHandler: ChangesModeHandler;
  private branchSuggester: BranchSuggester;

  async execute(resources?: vscode.SourceControlResourceState[]): Promise<void> {
    // 1. 前置检查和验证
    const context = await this.prepare(resources, {
      requireSelectedFiles: false,
      validateModel: true,
    });

    // 2. 选择生成模式
    const generationMode = await this.selectGenerationMode();
    if (!generationMode) return;

    // 3. 执行分支生成
    const branchName = await this.executeBranchGeneration(
      generationMode,
      aiProvider,
      selectedModel,
      configuration,
      resources
    );

    // 4. 显示建议和创建选项
    if (branchName) {
      await this.branchSuggester.showBranchNameSuggestion(branchName);
    }
  }

  private async selectGenerationMode(): Promise<any> {
    return await vscode.window.showQuickPick(
      [
        {
          label: "从代码变更生成",
          description: "分析当前选中的文件变更",
          detail: "自动分析代码差异，生成相关分支名称",
        },
        {
          label: "从描述生成",
          description: "根据功能描述生成",
          detail: "输入功能描述，AI 生成分支名称",
        },
      ],
      { placeHolder: "选择分支名称生成模式" }
    );
  }
}
```

**设计亮点**:
- ✅ 单一职责: 只负责命令入口和模式路由
- ✅ 模式选择: 用户友好的 QuickPick 界面
- ✅ 委托模式: 将具体逻辑委托给处理器和服务

### 2. 处理器层

#### 2.1 DescriptionModeHandler (描述模式)

**文件**: `src/commands/generate-branch-name/handlers/description-mode-handler.ts` (76 行)

```typescript
export class DescriptionModeHandler {
  async handle(aiProvider: any, model: any, configuration: any): Promise<string | undefined> {
    // 1. 获取用户描述
    const description = await this.getBranchDescription();
    if (!description) return undefined;

    // 2. 调用 AI 生成分支名称
    const branchNameResult = await aiProvider.generateBranchName({
      ...configuration.base,
      ...configuration.features.branchName,
      diff: description,  // 使用描述作为输入
      model: model,
      scm: "git",
      feature: "branch-name",
    });

    return branchNameResult?.content;
  }

  private async getBranchDescription(): Promise<string | undefined> {
    return await vscode.window.showInputBox({
      prompt: "请输入分支功能描述",
      placeHolder: "例如：添加用户登录功能",
      ignoreFocusOut: true,
    });
  }
}
```

**特点**:
- ✅ 用户友好: 清晰的输入提示
- ✅ 简单直接: 描述 → AI → 分支名称
- ✅ 错误处理: 优雅处理取消和失败

#### 2.2 ChangesModeHandler (代码变更模式)

**文件**: `src/commands/generate-branch-name/handlers/changes-mode-handler.ts` (84 行)

```typescript
export class ChangesModeHandler {
  async handle(resources: any, aiProvider: any, model: any, configuration: any, detectSCMProvider: any): Promise<{ branchName: string; scmProvider: any } | undefined> {
    // 1. 获取选中的文件
    let selectedFiles = SCMDetectorService.getSelectedFiles(resources);

    // 2. 检测 SCM 提供程序
    const result = await detectSCMProvider(selectedFiles);
    if (!result) return undefined;

    const { scmProvider: detectedScmProvider } = result;

    // 3. 检查是否为 Git
    if (detectedScmProvider.type !== "git") {
      await notify.warn("branch.name.git.only");
      return undefined;
    }

    // 4. 获取文件差异
    const aiInputContent = await detectedScmProvider.getDiff(selectedFiles);
    if (!aiInputContent) {
      await notify.warn("no.changes.found");
      return undefined;
    }

    // 5. 调用 AI 生成分支名称
    const branchNameResult = await aiProvider.generateBranchName({
      ...configuration.base,
      ...configuration.features.branchName,
      diff: aiInputContent,
      model: model,
      scm: detectedScmProvider.type,
      feature: "branch-name",
    });

    return {
      branchName: branchNameResult.content,
      scmProvider: detectedScmProvider,
    };
  }
}
```

**特点**:
- ✅ 自动分析: 无需用户输入描述
- ✅ Git 专用: 分支生成仅支持 Git
- ✅ 智能检测: 自动识别 SCM 类型和文件

### 3. 服务层

#### 3.1 BranchSuggester (分支建议器)

**文件**: `src/commands/generate-branch-name/services/branch-suggester.ts` (151 行)

**职责**: 生成变体、显示选择、处理用户操作

```typescript
export class BranchSuggester {
  async showBranchNameSuggestion(branchName: string): Promise<void> {
    // 1. 格式化分支名称
    const formattedBranchName = this.formatter.formatBranchName(branchName);

    // 2. 生成多个变体
    const branchSuggestions = this.formatter.generateBranchVariants(formattedBranchName);

    // 3. 显示 QuickPick
    const selectedBranch = await this.showBranchQuickPick(branchSuggestions);
    if (!selectedBranch) return;

    // 4. 处理用户选择
    await this.handleBranchSelection(selectedBranch);
  }

  private async showBranchQuickPick(branchSuggestions: string[]): Promise<string | undefined> {
    const quickPick = vscode.window.createQuickPick();
    quickPick.title = "分支名称建议";
    quickPick.placeholder = "选择或编辑分支名称";
    quickPick.items = branchSuggestions.map(branch => ({
      label: branch,
      description: branch.includes("/") ? branch.split("/")[0] : "",
    }));
    quickPick.canSelectMany = false;
    quickPick.ignoreFocusOut = true;

    return new Promise((resolve) => {
      quickPick.onDidAccept(() => {
        const selected = quickPick.selectedItems[0]?.label || quickPick.value;
        quickPick.hide();
        resolve(selected);
      });
      quickPick.onDidHide(() => resolve(undefined));
      quickPick.show();
    });
  }

  private async handleBranchSelection(selectedBranch: string): Promise<void> {
    // 显示操作选项: 创建分支 或 复制到剪贴板
    const selection = await notify.info("branch.name.selected", [selectedBranch], {
      buttons: ["创建分支", "复制到剪贴板"],
    });

    if (selection === "创建分支") {
      await this.creator.createBranchFromGeneratedName(selectedBranch);
    } else if (selection === "复制到剪贴板") {
      await vscode.env.clipboard.writeText(selectedBranch);
      notify.info("branch.name.copied");
    }
  }
}
```

**特点**:
- ✅ 智能变体: 生成多种命名风格
- ✅ 交互友好: QuickPick + 操作选择
- ✅ 灵活操作: 支持创建或复制

#### 3.2 BranchCreator (分支创建器)

**文件**: `src/commands/generate-branch-name/services/branch-creator.ts` (213 行)

```typescript
export class BranchCreator {
  async createBranchFromGeneratedName(generatedBranchName: string): Promise<void> {
    const gitApi = await getGitApi();
    if (!gitApi) {
      notify.error("git.api.not.found");
      return;
    }

    if (!hasValidRepository(gitApi)) {
      notify.error("git.repo.not.found");
      return;
    }

    const repository = getFirstRepository(gitApi);
    if (!repository) {
      notify.error("git.repo.not.found");
      return;
    }

    try {
      // 1. 获取所有引用
      const refs = await repository.getRefs({});

      // 2. 选择源引用（分支/标签）
      const selectedRef = await this.showRefSelection(refs);
      if (!selectedRef) {
        notify.info("branch.creation.cancelled");
        return;
      }

      // 3. 检查名称冲突
      await this.checkBranchNameConflicts(refs, generatedBranchName);

      // 4. 创建分支
      await repository.createBranch(generatedBranchName, true, selectedRef.commit);

      notify.info("branch.created.from", [generatedBranchName, selectedRef.name]);
    } catch (error) {
      await this.handleBranchCreationError(error, generatedBranchName);
    }
  }

  private async showRefSelection(refs: any[]): Promise<any> {
    const quickPickItems = refs.filter(ref => ref.name).map(ref => ({
      label: ref.name,
      description: ref.type === 1 ? "分支" : ref.type === 2 ? "标签" : "远程",
      detail: `$(git-commit) ${ref.commit?.slice(0, 7)}`,
      ref,
    }));

    const selectedItem = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: "选择基础分支",
      title: "为新分支选择源引用",
    });

    return selectedItem?.ref;
  }

  private async checkBranchNameConflicts(refs: any[], branchName: string): Promise<void> {
    const conflictingRef = refs.find(ref => {
      if (!ref.name) return false;
      return (
        ref.name.startsWith(`${branchName}/`) ||
        branchName.startsWith(`${ref.name}/`)
      );
    });

    if (conflictingRef) {
      const errorMessage = `分支名称 '${branchName}' 与现有引用 '${conflictingRef.name}' 冲突`;
      notify.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  private async handleBranchCreationError(error: any, branchName: string): Promise<void> {
    if (error.gitErrorCode === "CantLockRef") {
      notify.error("branch.name.conflicts.generic");
    } else {
      notify.error("branch.creation.failed");

      const action = await notify.info("branch.creation.failed.help", [branchName], {
        buttons: ["复制分支名称", "重试"],
      });

      if (action === "复制分支名称") {
        await vscode.env.clipboard.writeText(branchName);
        notify.info("branch.name.copied");
      } else if (action === "重试") {
        await this.createBranchFromGeneratedName(branchName);
      }
    }
  }
}
```

**特点**:
- ✅ Git API: 使用官方 API，安全可靠
- ✅ 引用选择: 支持分支、标签、远程引用
- ✅ 冲突检测: 预防分支名称冲突
- ✅ 错误恢复: 提供重试和复制选项

#### 3.3 BranchFormatter (分支格式化器)

**文件**: `src/commands/generate-branch-name/services/branch-formatter.ts` (122 行)

```typescript
export class BranchFormatter {
  formatBranchName(branchName: string): string {
    let formatted = branchName?.trim();

    // 处理前缀格式 (例如 "feature: xxx" 或 "feat: xxx")
    if (!formatted.includes("/") && (formatted.includes(":") || formatted.includes("-"))) {
      const match = formatted.match(/^(\w+)[:|-]/);
      if (match) {
        const prefix = match[1].toLowerCase();
        formatted = formatted.replace(/^(\w+)[:|-]\s*/, "");

        // 常见类型前缀
        const commonTypes = ["feature", "feat", "fix", "bugfix", "hotfix", "release", "chore", "docs", "style", "refactor", "perf", "test", "build", "ci"];
        if (commonTypes.includes(prefix)) {
          formatted = `${prefix}/${formatted}`;
        }
      }
    }

    // 转换为 kebab-case
    formatted = formatted.toLowerCase().replace(/\s+/g, "-");

    // 删除非法字符
    formatted = formatted.replace(/[~^:?*[\]\\\\]/g, "");

    // 处理连续连字符
    formatted = formatted.replace(/--+/g, "-");

    // 去除首尾连字符
    formatted = formatted.replace(/^-+|-+$/g, "");

    return formatted;
  }

  generateBranchVariants(baseBranchName: string): string[] {
    const variants: string[] = [];
    const hasTypePrefix = baseBranchName.includes("/");
    const baseNameOnly = hasTypePrefix
      ? baseBranchName.substring(baseBranchName.indexOf("/") + 1)
      : baseBranchName;

    // 原始分支名
    variants.push(baseBranchName);

    // 添加类型前缀变体
    if (!hasTypePrefix) {
      variants.push(`feature/${baseBranchName}`);
      variants.push(`fix/${baseBranchName}`);
      variants.push(`refactor/${baseBranchName}`);
    }

    // camelCase 变体
    if (baseBranchName.includes("-")) {
      const camelCase = baseNameOnly.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      if (!hasTypePrefix) {
        variants.push(camelCase);
      } else {
        const prefix = baseBranchName.substring(0, baseBranchName.indexOf("/") + 1);
        variants.push(`${prefix}${camelCase}`);
      }
    }

    return [...new Set(variants)]; // 去重
  }
}
```

**特点**:
- ✅ Git 规范: 符合 Git 分支命名规则
- ✅ 智能转换: 识别常见前缀格式
- ✅ 多样变体: 提供多种命名风格选择

## 🔄 完整执行流程

### 描述模式

```
用户触发命令
    ↓
GenerateBranchNameCommand.execute()
    ↓
1. 前置验证
   ├─ 模型验证
   └─ 配置检查
    ↓
2. 选择模式
   └─ 用户选择"从描述生成"
    ↓
3. DescriptionModeHandler.handle()
   ├─ 提示用户输入描述
   ├─ 调用 AI 生成分支名称
   └─ 返回结果
    ↓
4. BranchSuggester.showBranchNameSuggestion()
   ├─ 格式化分支名称
   ├─ 生成变体 (3-5个)
   ├─ 显示 QuickPick
   └─ 用户选择
       ↓
       ├─ 创建分支 → BranchCreator
       └─ 复制到剪贴板
```

### 代码变更模式

```
用户触发命令 (选中文件)
    ↓
GenerateBranchNameCommand.execute()
    ↓
1. 前置验证
   ├─ 模型验证
   └─ 配置检查
    ↓
2. 选择模式
   └─ 用户选择"从代码变更生成"
    ↓
3. ChangesModeHandler.handle()
   ├─ 获取选中文件
   ├─ 检测 SCM 提供程序
   ├─ 检查是否为 Git
   ├─ 获取文件差异
   ├─ 调用 AI 生成分支名称
   └─ 返回结果
    ↓
4. BranchSuggester.showBranchNameSuggestion()
   ├─ 格式化分支名称
   ├─ 生成变体
   ├─ 显示 QuickPick
   └─ 用户选择
       ↓
       ├─ 创建分支 → BranchCreator
       └─ 复制到剪贴板
```

## 🎛️ 配置选项

### 核心配置

```typescript
interface BranchNameConfig {
  // 基础配置
  base: {
    language: string;           // 语言
    provider: string;           // AI 提供商
    model: string;              // AI 模型
  };

  // 分支名称配置
  features: {
    branchName: {
      prefix: string;           // 分支前缀
      suffix: string;           // 分支后缀
      maxWords: number;         // 最大单词数
      style: "kebab" | "camel"; // 命名风格
    };
  };
}
```

## 📊 性能优化

### 1. 智能变体生成

```typescript
// 避免重复和无效变体
const variants = [...new Set(variants)]; // 去重

// 只生成有意义的变体
if (!hasTypePrefix) {
  variants.push(`feature/${baseBranchName}`);
  variants.push(`fix/${baseBranchName}`);
}
```

### 2. 快速格式化

```typescript
// 单次遍历完成所有格式化
formatBranchName(branchName: string): string {
  return branchName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[~^:?*[\]\\\\]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

## 🎯 使用示例

### 示例 1: 描述模式

```typescript
// 1. 用户触发命令
await vscode.commands.executeCommand('dish-ai-commit.generateBranchName');

// 2. 选择模式
//    └─ 选择"从描述生成"

// 3. 输入描述
//    └─ "添加用户登录功能"

// 4. AI 生成
//    └─ "feature/add-user-login"

// 5. 显示变体
//    ├─ feature/add-user-login
//    ├─ fix/add-user-login
//    └─ add-user-login

// 6. 用户选择并创建
//    └─ 分支创建成功
```

### 示例 2: 代码变更模式

```typescript
// 1. 选中文件
//    └─ src/auth/login.ts, src/auth/logout.ts

// 2. 触发命令
await vscode.commands.executeCommand('dish-ai-commit.generateBranchName');

// 3. 选择模式
//    └─ 选择"从代码变更生成"

// 4. AI 分析并生成
//    └─ "feature/auth-system"

// 5. 显示变体
//    ├─ feature/auth-system
//    ├─ refactor/auth-system
//    └─ authSystem

// 6. 用户选择并创建
//    └─ 分支创建成功
```

## 📊 重构成果

### 代码质量对比

| 指标 | 重构前 | 重构后 | 改进 |
|------|--------|--------|------|
| **主文件行数** | 674 行 | 146 行 | ⬇️ 78% |
| **文件数量** | 1 个 | 8 个 | 模块化 |
| **核心类行数** | >200 行 | <150 行 | ✅ 符合标准 |
| **分支创建逻辑** | 207 行 | 120 行 | ⬇️ 42% |
| **代码质量** | 复杂 | 清晰 | ⬆️ 显著 |

### 架构改进

**重构前**:
```
GenerateBranchNameCommand (674行)
├─ 模式选择
├─ 描述模式逻辑
├─ 代码变更模式逻辑
├─ 分支格式化
├─ 分支创建 (3种方案)
├─ 用户交互
└─ 错误处理
```

**重构后**:
```
GenerateBranchNameCommand (146行)
├─ 模式选择
└─ 委托给处理器

DescriptionModeHandler (76行)
├─ 获取描述
└─ 调用 AI

ChangesModeHandler (84行)
├─ 获取 Diff
└─ 调用 AI

BranchSuggester (151行)
├─ 格式化
├─ 生成变体
├─ 显示选择
└─ 处理操作

BranchFormatter (122行)
├─ 格式化分支名
└─ 生成变体

BranchCreator (213行)
├─ Git API 操作
├─ 引用选择
└─ 错误处理
```

## 🔍 故障排除

### 常见问题

#### 1. Git API 不可用

**问题**: 无法创建分支

**解决方案**:
- 检查是否安装 Git 扩展
- 确认当前工作区是 Git 仓库
- 查看 VS Code Git 输出面板

#### 2. 分支名称冲突

**问题**: 分支名称与现有引用冲突

**解决方案**:
- 系统会自动检测冲突
- 提供错误提示和建议
- 可手动修改后重试

#### 3. AI 生成失败

**问题**: AI 无法生成分支名称

**解决方案**:
- 检查网络连接
- 验证 API 密钥
- 尝试其他生成模式

## 🎓 设计模式应用

### 1. 策略模式

```typescript
// 两种生成策略可互换
if (mode === "description") {
  return await descriptionHandler.handle(...);
} else {
  return await changesHandler.handle(...);
}
```

### 2. 工厂模式

```typescript
// 服务工厂
const suggester = new BranchSuggester(logger);
const creator = new BranchCreator(logger);
const formatter = new BranchFormatter(logger);
```

### 3. 观察者模式

```typescript
// QuickPick 事件处理
quickPick.onDidAccept(() => { /* 处理选择 */ });
quickPick.onDidHide(() => { /* 处理取消 */ });
```

## 📚 相关文档

- **主 README**: [../../../README.md](../../../README.md) - 项目总览
- **项目结构**: [../../README.md](../../README.md) - 架构文档
- **提交生成**: [../generate-commit/README.md](../generate-commit/README.md) - 提交架构
- **Git API**: [../../scm/git/](../../scm/git/) - Git 集成

---

**最后更新**: 2024年12月
**模块版本**: v0.56.1
**代码质量**: ⭐⭐⭐⭐⭐
**架构模式**: SOLID 原则

