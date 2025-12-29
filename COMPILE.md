# 编译流程说明

本项目使用 **pnpm workspace** + **Turbo** 管理多包编译流程。

## 项目结构

```
svn-commit-gen/
├── shared/                 # 共享类型定义包
│   ├── types/             # TypeScript 类型定义
│   ├── package.json       # 包配置 (@dish-ai-commit/shared)
│   ├── turbo.json         # Turbo 配置
│   └── tsconfig.json      # TypeScript 配置
├── src/                   # VSCode 扩展主包
│   ├── package.json       # 包配置 (dish-ai-commit)
│   ├── turbo.json         # Turbo 配置
│   ├── tsconfig.json      # TypeScript 配置
│   └── dist/              # 编译输出
├── webview-ui/            # Webview UI 包
│   ├── package.json       # 包配置 (@dish-ai-commit/webview-ui)
│   ├── turbo.json         # Turbo 配置
│   ├── tsconfig.json      # TypeScript 配置
│   └── dist/              # 编译输出
├── pnpm-workspace.yaml    # Pnpm Workspace 配置
└── turbo.json             # 根 Turbo 配置
```

## 依赖关系

```
shared (类型定义)
    ↓ 被依赖
src (扩展主包) ← webview-ui (UI 包)
```

## 编译命令

### 1. 完整编译整个项目

```bash
# 从根目录执行
pnpm turbo run compile

# 或使用 pnpm (自动处理 workspace)
pnpm --filter "dish-ai-commit" run compile
```

**执行顺序**:

1. `shared` 编译 (生成 `out/shared/*.d.ts`)
2. `webview-ui` 编译 (依赖 shared)
3. `src` 编译 (依赖 shared)

### 2. 仅编译特定包

```bash
# 编译 shared
cd shared && pnpm run compile
# 或
pnpm --filter "@dish-ai-commit/shared" run compile

# 编译 webview-ui
cd webview-ui && pnpm run compile
# 或
pnpm --filter "@dish-ai-commit/webview-ui" run compile

# 编译 src
cd src && pnpm run compile
# 或
pnpm --filter "dish-ai-commit" run compile
```

### 3. 类型检查

```bash
# 检查所有包
pnpm turbo run check-types

# 检查特定包
pnpm --filter "dish-ai-commit" run check-types
```

### 4. 完整构建 (包含打包)

```bash
# 构建所有包并打包
pnpm turbo run build

# 生成 vsix 文件
pnpm turbo run vsix
```

### 5. 开发模式

```bash
# 监听模式编译
pnpm turbo run watch

# 仅监听 webview
cd webview-ui && pnpm run watch

# 仅监听 src
cd src && pnpm run watch:tsc
```

## Turbo 配置说明

### 根目录 turbo.json

```json
{
  "tasks": {
    "compile": {
      "dependsOn": ["^compile"], // 先编译依赖包
      "outputs": ["out/**", "dist/**"]
    }
  }
}
```

`^compile` 表示先执行所有依赖包的 compile 任务。

### 包级 turbo.json

**shared/turbo.json**:

```json
{
  "tasks": {
    "compile": {
      "outputs": ["../out/shared/**"]
    }
  }
}
```

**src/turbo.json**:

```json
{
  "tasks": {
    "compile": {
      "dependsOn": ["@dish-ai-commit/shared#compile"], // 显式依赖 shared
      "outputs": ["out/**"]
    }
  }
}
```

**webview-ui/turbo.json**:

```json
{
  "tasks": {
    "compile": {
      "dependsOn": ["@dish-ai-commit/shared#compile"], // 显式依赖 shared
      "outputs": ["dist/**"]
    }
  }
}
```

## TypeScript 配置

### shared/tsconfig.json

```json
{
  "compilerOptions": {
    "outDir": "../out/shared", // 输出到根目录的 out/shared
    "declaration": true, // 生成 .d.ts 文件
    "composite": true // 支持项目引用
  }
}
```

### src/tsconfig.json

```json
{
  "compilerOptions": {
    "outDir": "../out", // 输出到根目录的 out
    "paths": {
      "@shared/*": ["../shared/*"] // 路径映射
    }
  },
  "references": [{ "path": "../shared" }] // 项目引用
}
```

### webview-ui/tsconfig.json

```json
{
  "references": [{ "path": "../shared" }] // 项目引用
}
```

## 工作流示例

### 日常开发

```bash
# 1. 修改 shared 类型
cd shared
vim types/model-custom.ts

# 2. 编译 shared
pnpm run compile

# 3. 编译并测试 src
cd ../src
pnpm run compile
pnpm run check-types

# 4. 编译 webview-ui
cd ../webview-ui
pnpm run compile
```

### 使用 Turbo 一键处理

```bash
# 从根目录
pnpm turbo run compile --force  # 强制重新编译
pnpm turbo run check-types      # 类型检查
pnpm turbo run build            # 完整构建
```

### 清理缓存

```bash
# 清理所有包
pnpm turbo run clean

# 或手动清理
pnpm -r exec rimraf out dist .turbo
```

## 常见问题

### Q: 编译时提示找不到 shared 类型？

**A**: 确保先编译 shared：

```bash
cd shared && pnpm run compile
```

### Q: 如何调试编译依赖？

**A**: 使用 verbose 模式：

```bash
pnpm turbo run compile --verbose
```

### Q: 修改了 shared 类型，但 src 没有更新？

**A**: 清理缓存并重新编译：

```bash
pnpm turbo run clean
pnpm turbo run compile
```

## 相关文件

- `pnpm-workspace.yaml` - Workspace 包定义
- `turbo.json` - 根级构建配置
- `shared/turbo.json` - shared 包构建配置
- `src/turbo.json` - src 包构建配置
- `webview-ui/turbo.json` - webview-ui 包构建配置
