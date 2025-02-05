# Diff 格式化工具

用于处理和简化 Git/SVN 差异对比(diff)输出的工具模块。支持将 diff 内容分块处理，并可根据配置进行简化。

## 接口定义

### DiffChunk

表示一个差异块的接口:

```typescript
interface DiffChunk {
  filename: string; // 文件名
  content: string; // 差异内容
}
```

### DiffConfig

配置选项接口:

```typescript
interface DiffConfig {
  enabled: boolean; // 是否启用差异简化，默认 false
  contextLines: number; // 保留的上下文行数，默认 3
  maxLineLength: number; // 单行最大长度，默认 120
}
```

## 配置说明

在 VSCode 中可通过 `dish-ai-commit` 配置项进行设置，例如：

```json
{
  "dish-ai-commit.enableDiffSimplification": true,
  "dish-ai-commit.diffSimplification.contextLines": 3,
  "dish-ai-commit.diffSimplification.maxLineLength": 120
}
```

或者在代码中获取配置：

```typescript
import { getDiffConfig } from "./DiffFormatter";

const config = getDiffConfig();
```

## 使用示例

### Git Diff 分块

将 Git diff 输出按文件分块:

```typescript
import { splitGitDiff } from "./DiffFormatter";

const gitDiff = `diff --git a/src/app.ts b/src/app.ts
index 123..456 789
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,3 +1,3 @@
-console.log("old");
+console.log("new");`;

const chunks = splitGitDiff(gitDiff);
// chunks 示例：
// [{
//   filename: "src/app.ts",
//   content: "完整的 diff 内容"
// }]
```

### SVN Diff 分块

处理 SVN diff 输出:

```typescript
import { splitSvnDiff } from "./DiffFormatter";

const svnDiff = `Index: src/app.ts
===================================================================
--- src/app.ts    (revision 123)
+++ src/app.ts    (revision 124)
@@ -1,3 +1,3 @@
...`;

const chunks = splitSvnDiff(svnDiff);
// 返回格式与 Git diff 相同
```

### Diff 简化

根据配置简化 diff 内容:

```typescript
import { simplifyDiff, getDiffConfig } from "./DiffFormatter";

const config = getDiffConfig();
const rawDiff = `--- test.ts
+++ test.ts
@@ -1,6 +1,6 @@
-const oldVar = 123;
+const newVar = 456;
 console.log("test");`;

const simplified = simplifyDiff(rawDiff, config);
// 根据配置简化 diff 内容输出
```

## Diff 简化示例

下面是一个使用 DiffSimplifier 模块进行 diff 简化处理的示例：

### 示例描述

假设有一段原始的 diff 内容，通过 DiffSimplifier.simplify 方法根据配置文件进行简化：

- 首先，调用 DiffSimplifier.getConfig() 获取当前配置；
- 然后传入原始 diff 字符串，输出经过上下文行数与最大行长度处理后的文本。

### 示例代码

```typescript
// filepath: /data/svn-commit-gen/src/utils/diff/diff.md
// 导入 DiffSimplifier 模块
import { DiffSimplifier } from "./DiffSimplifier";

// 示例 diff 内容
const rawDiff = `--- test.ts
+++ test.ts
@@ -1,6 +1,6 @@
-const oldValue = 12345678901234567890;
+const newValue = 98765432109876543210;
 console.log("diff test");`;

// 获取当前配置（此处配置会根据 VSCode 设置获取，若未开启简化则直接返回原 diff）
const config = DiffSimplifier.getConfig();

// 调用简化方法
const simplifiedDiff = DiffSimplifier.simplify(rawDiff);

console.log("原始 diff：");
console.log(rawDiff);
console.log("简化后的 diff：");
console.log(simplifiedDiff);
```

### 示例解释

1. 该示例首先导入 DiffSimplifier 模块；
2. 定义一段包含修改行和上下文行的原始 diff 文本；
3. 获取当前配置，并通过 DiffSimplifier.simplify 进行简化；
4. 输出原始 diff 与简化后的 diff 结果，便于观察效果。

## 高级使用示例

以下示例展示如何结合使用 DiffSplitter 和 DiffSimplifier 处理完整的 diff 文本，便于后续在文档或其他地方进行功能扩展和展示。

### 示例 1：处理 Git Diff

假设有一个包含多个文件差异的 Git diff 输出，首先使用 DiffSplitter 将其拆分为独立文件的差异块，然后调用 DiffSimplifier 对每个文件内容进行精简处理：

```typescript
// filepath: /data/svn-commit-gen/src/utils/diff/diff.md
import { DiffSplitter } from "./DiffSplitter";
import { DiffSimplifier } from "./DiffSimplifier";

const gitDiff = `diff --git a/src/app.ts b/src/app.ts
index 123..456 789
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,3 +1,3 @@
-console.log("old line");
+console.log("new line");
diff --git a/src/utils/helper.ts b/src/utils/helper.ts
index abc..def 012
--- a/src/utils/helper.ts
+++ b/src/utils/helper.ts
@@ -5,7 +5,7 @@
-function helper() {
-  // old implementation
-}
+function helper() {
+  // new implementation
+}`;

// 拆分 Git diff 为多个文件差异块
const chunks = DiffSplitter.splitGitDiff(gitDiff);

chunks.forEach((chunk) => {
  // 对每个文件的差异内容进行简化处理
  const simplifiedContent = DiffSimplifier.simplify(chunk.content);
  console.log(`文件: ${chunk.filename}`);
  console.log("简化后的差异内容：");
  console.log(simplifiedContent);
});
```

### 示例 2：处理 SVN Diff

对于 SVN diff 输出，同样先利用 DiffSplitter 拆分文件差异，再结合 DiffSimplifier 进行简化处理：

```typescript
// filepath: /data/svn-commit-gen/src/utils/diff/diff.md
import { DiffSplitter } from "./DiffSplitter";
import { DiffSimplifier } from "./DiffSimplifier";

const svnDiff = `Index: src/app.ts
===================================================================
--- src/app.ts    (revision 123)
+++ src/app.ts    (revision 124)
@@ -1,4 +1,4 @@
-console.log("old version");
+console.log("updated version");
Index: src/components/component.ts
===================================================================
--- src/components/component.ts    (revision 101)
+++ src/components/component.ts    (revision 102)
@@ -10,5 +10,5 @@
-return "old component";
+return "new component";`;

// 拆分 SVN diff 为多个文件差异块
const svnChunks = DiffSplitter.splitSvnDiff(svnDiff);

svnChunks.forEach((chunk) => {
  const simplified = DiffSimplifier.simplify(chunk.content);
  console.log(`文件: ${chunk.filename}`);
  console.log("简化后的 SVN 差异：");
  console.log(simplified);
});
```

## 详细使用示例

以下示例展示一个完整的应用流程：

1. 读取原始 diff 文本（支持 Git 或 SVN 格式）。
2. 利用 DiffSplitter 拆分为各个文件的 diff 块。
3. 根据 VSCode 配置获取 DiffConfig 配置。
4. 调用 DiffSimplifier 对每个 diff 块进行简化处理，输出格式化结果。
5. 演示如何在其他地方继续扩展使用该示例结果。

### 示例：完整流程演示

```typescript
// filepath: /data/svn-commit-gen/src/utils/diff/diff.md
import { DiffSplitter } from "./DiffSplitter";
import { DiffSimplifier } from "./DiffSimplifier";
import { getDiffConfig } from "./DiffFormatter";

// 假定这是一个包含 Git diff 内容的原始字符串
const rawGitDiff = `diff --git a/src/app.ts b/src/app.ts
index 123..456 789
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,3 +1,3 @@
-console.log("old version");
+console.log("new version");
diff --git a/src/utils/helper.ts b/src/utils/helper.ts
index abc..def 012
--- a/src/utils/helper.ts
+++ b/src/utils/helper.ts
@@ -5,7 +5,7 @@
-function helper() {
-  // old logic
-}
+function helper() {
+  // updated logic
+}`;

// 步骤1：拆分 diff 为多个文件块
const fileChunks = DiffSplitter.splitGitDiff(rawGitDiff);

// 步骤2：获取当前配置，方便后续简化处理
const config = getDiffConfig();

// 步骤3：遍历各文件块，对 diff 内容进行简化
fileChunks.forEach((chunk) => {
  const simplified = DiffSimplifier.simplify(chunk.content);
  // 输出文件名和简化后的 diff 内容
  console.log(`文件: ${chunk.filename}`);
  console.log("简化后的 diff：");
  console.log(simplified);
});

// 此示例演示了如何利用各模块完成 diff 信息从拆分到格式化的全流程。
// 其他模块或 UI 组件可基于以上结果进行进一步扩展处理。
```

> 注：对于 SVN 格式的 diff，调用方式与上述示例基本一致，直接替换原始 diff 数据即可。

## 注意事项

- 如果 diff 内容为空，会返回空数组或原内容。
- 配置参数未获取到时，采用默认值。
- 处理 diff 时注意保留必要上下文行以便调试。
