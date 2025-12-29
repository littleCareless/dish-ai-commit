# Shared Types

这个目录包含项目中共享的 TypeScript 类型定义。

## 目录结构

```
shared/
├── types/              # 类型定义文件
│   ├── messages.ts     # 消息类型定义
│   ├── model-custom.ts # 自定义模型类型
│   └── ...
├── tsconfig.json       # TypeScript 配置
├── turbo.json          # Turbo 构建配置
├── package.json        # 包配置
└── README.md           # 本文件
```

## 编译流程

### 手动编译

```bash
# 编译 shared 目录
cd shared
pnpm run compile

# 或使用 turbo (推荐)
pnpm turbo run compile --filter=@dish-ai-commit/shared
```

### 自动编译

当运行以下命令时，shared 目录会自动编译：

```bash
# 编译整个项目
pnpm turbo run compile

# 编译 src 目录 (会自动先编译 shared)
cd src
pnpm run compile

# 检查类型
pnpm turbo run check-types
```

## 依赖关系

- `src/` 依赖 `shared/`
- `webview-ui/` 依赖 `shared/`

Turbo 会自动处理这些依赖关系，确保 shared 在其他包之前编译。

## 输出

编译后的文件输出到 `../out/shared/` 目录：

- `*.d.ts` - 类型定义文件
- `*.js` - JavaScript 文件
- `*.js.map` - Source maps

## 开发工作流

1. 修改 `shared/types/` 中的类型定义
2. 运行 `pnpm turbo run check-types` 验证类型
3. 运行 `pnpm turbo run compile` 编译所有包
4. 使用编译后的类型进行开发

## 相关文档

- [主项目 README](../README.md)
- [Turbo 配置](../turbo.json)
- [TypeScript 配置](./tsconfig.json)
