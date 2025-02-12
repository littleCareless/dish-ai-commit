# Diff 工具模块

该模块提供了一系列工具，用于处理和简化 Git 和 SVN 的差异（diff）输出。它包括差异内容的分块处理，以及根据配置进行简化。

## 接口定义

### DiffChunk

`DiffChunk` 接口用于表示一个差异块，包含文件名和差异内容：

```typescript
interface DiffChunk {
  filename: string; // 文件名
  content: string; // 差异内容
}
```

### DiffConfig

`DiffConfig` 接口定义了差异简化的配置选项：

```typescript
interface DiffConfig {
  enabled: boolean; // 是否启用差异简化
  contextLines: number; // 保留的上下文行数
  maxLineLength: number; // 单行最大长度
}
```

可以使用 `getDiffConfig` 函数从 VSCode 配置中获取 `DiffConfig`：

```typescript
import { getDiffConfig } from "./index";

const config = getDiffConfig();
```

## DiffSplitter

`DiffSplitter` 类用于将完整的 diff 文本分割成独立的文件差异块。

### `splitGitDiff(diff: string): DiffChunk[]`

将 Git diff 输出拆分为独立的文件差异块。

**参数：**

- `diff`: 完整的 Git diff 文本输出。

**返回值：**

- `DiffChunk[]`: 包含各文件差异信息的数组。

**示例：**

```typescript
import { DiffSplitter } from "./index";

const gitDiff = `diff --git a/src/app.ts b/src/app.ts
index 1234567..890abcd 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,2 +1,2 @@
-console.log("Hello, world!");
+console.log("Hello, dish-ai-commit!");`;

const chunks = DiffSplitter.splitGitDiff(gitDiff);
console.log(chunks);
// 输出:
// [
//   {
//     filename: "src/app.ts",
//     content: "index 1234567..890abcd 100644\\n--- a/src/app.ts\\n+++ b/src/app.ts\\n@@ -1,2 +1,2 @@\\n-console.log(\"Hello, world!\");\\n+console.log(\"Hello, dish-ai-commit!\");"
//   }
// ]
```

### `splitSvnDiff(diff: string): DiffChunk[]`

将 SVN diff 输出拆分为独立的文件差异块。

**参数：**

- `diff`: 完整的 SVN diff 文本输出。

**返回值：**

- `DiffChunk[]`: 包含各文件差异信息的数组。

**示例：**

```typescript
import { DiffSplitter } from "./index";

const svnDiff = `Index: src/app.ts
--- src/app.ts\t(revision 1)
+++ src/app.ts\t(revision 2)

@@ -1,2 +1,2 @@
-console.log("Hello, world!");
+console.log("Hello, dish-ai-commit!");`;

const chunks = DiffSplitter.splitSvnDiff(svnDiff);
console.log(chunks);
// 输出:
// [
//   {
//     filename: "src/app.ts",
//     content: "--- src/app.ts\\t(revision 1)\\n+++ src/app.ts\\t(revision 2)\\n\\n@@ -1,2 +1,2 @@\\n-console.log(\"Hello, world!\");\\n+console.log(\"Hello, dish-ai-commit!\");"
//   }
// ]
```

## DiffSimplifier

`DiffSimplifier` 类用于简化和格式化差异文本，可以配置上下文行数和最大行长度。

### 配置

可以通过 VSCode 的配置项 `dish-ai-commit` 进行配置：

```json
{
  "dish-ai-commit.enableDiffSimplification": true,
  "dish-ai-commit.diffSimplification.contextLines": 3,
  "dish-ai-commit.diffSimplification.maxLineLength": 120
}
```

也可以在代码中获取和清除配置：

```typescript
import { DiffSimplifier } from "./index";

// 获取配置
const config = DiffSimplifier.getConfig();

// 清除配置缓存
DiffSimplifier.clearConfigCache();
```

### `simplify(diff: string): string`

简化差异文本，根据配置处理上下文行数和行长度。

**参数：**

- `diff`: 原始差异文本。

**返回值：**

- `string`: 简化后的差异文本。

**示例：**

```typescript
import { DiffSimplifier } from "./index";

const rawDiff = `--- a/src/test.ts
+++ b/src/test.ts
@@ -1,5 +1,5 @@
-const a = 1;
+const a = 2;
 console.log("test");
 console.log("test2");
 console.log("test3");`;

const simplifiedDiff = DiffSimplifier.simplify(rawDiff);
console.log(simplifiedDiff);
// 输出 (假设启用了简化，contextLines=3, maxLineLength=120):
// --- a/src/test.ts
// +++ b/src/test.ts
// @@ -1,5 +1,5 @@
// -const a = 1;
// +const a = 2;
// console.log("test");
// console.log("test2");
// console.log("test3");
```

### 详细使用示例

以下示例展示如何结合使用 `DiffSplitter` 和 `DiffSimplifier` 处理完整的 diff 文本。

```typescript
import { DiffSplitter, DiffSimplifier, getDiffConfig } from "./index";

const rawGitDiff = `diff --git a/src/app.ts b/src/app.ts
index 1234567..890abcd 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,2 +1,2 @@
-console.log("Hello, world!");
+console.log("Hello, dish-ai-commit!");
diff --git a/src/utils.ts b/src/utils.ts
index 1234567..890abcd 100644
--- a/src/utils.ts
+++ b/src/utils.ts
@@ -1,2 +1,2 @@
-console.log("Hello, world!");
+console.log("Hello, dish-ai-commit!");`;

// 1. 拆分 diff
const fileChunks = DiffSplitter.splitGitDiff(rawGitDiff);

// 2. 获取配置
const config = getDiffConfig();

// 3. 遍历并简化
fileChunks.forEach(chunk => {
  const simplified = DiffSimplifier.simplify(chunk.content);
  console.log(\`File: \${chunk.filename}\`);
  console.log(simplified);
});
```

## 注意事项

- 如果未启用差异简化，`DiffSimplifier.simplify` 方法将直接返回原始 diff 文本。
- 配置参数未获取到时，会使用默认值。
- 处理 diff 时，建议保留必要的上下文行，以便于调试和理解变更。
