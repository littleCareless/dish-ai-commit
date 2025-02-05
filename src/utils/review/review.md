# 代码审查报告生成器使用示例

本文档介绍如何使用 [CodeReviewReportGenerator](./CodeReviewReportGenerator.ts) 生成格式化的 Markdown 代码审查报告，为其他模块使用 Markdown 进行扩展提供范例。

## 示例说明

假设已有一组代码审查问题（CodeReviewIssue），生成的审查结果（CodeReviewResult）包含总体总结及各个文件的问题列表。通过 `CodeReviewReportGenerator.generateMarkdownReport` 方法，可将审查结果转换为 Markdown 格式的报告。

### 示例步骤

1. **构造代码审查问题**  
   根据具体文件构造多个 `CodeReviewIssue` 实例，每个问题包含文件路径、问题描述、建议、起始行和（可选）结束行信息，以及代码示例和相关文档链接。

2. **构造审查结果**  
   包含一个总体的报告摘要（summary）和问题列表（issues）。

3. **生成 Markdown 报告**  
   调用 `CodeReviewReportGenerator.generateMarkdownReport` 方法，将审查结果转换为格式化后的 Markdown 文本。

### 示例代码

```typescript
// 示例代码：构造 CodeReviewResult 并生成 Markdown 报告

import { CodeReviewReportGenerator } from "./CodeReviewReportGenerator";
import { CodeReviewResult, CodeReviewIssue } from "../../ai/types";

// 构造示例问题列表
const issues: CodeReviewIssue[] = [
  {
    filePath: "src/app.ts",
    startLine: 10,
    endLine: 12,
    severity: "WARNING",
    description: "变量命名不符合命名规范。",
    suggestion: "建议使用 camelCase 命名方式。",
    code: `let my_variable = 123;`,
    documentation: "https://example.com/coding-style#naming-conventions",
  },
  {
    filePath: "src/utils/helper.ts",
    startLine: 5,
    severity: "ERROR",
    description: "缺少必要的错误处理。",
    suggestion: "在调用外部接口时添加 try/catch 块。",
    code: `function helper() {
  // 缺少错误处理
}`,
    documentation: "",
  },
];

// 构造审查结果对象
const reviewResult: CodeReviewResult = {
  summary:
    "本次代码审查发现多个问题，包括命名和错误处理等方面，建议按照团队编码规范进行修改。",
  issues: issues,
};

// 生成 Markdown 格式的报告
const markdownReport =
  CodeReviewReportGenerator.generateMarkdownReport(reviewResult);

// 输出报告
console.log(markdownReport);
```

### 预期输出

生成的 Markdown 报告应包含：

- 报告头部，包括总体标题和审查摘要。
- 按文件分组的详细问题列表，每个问题显示问题严重程度、行号、描述、建议、代码示例及文档链接（若有）。

示例输出格式如下：

````markdown
# 代码审查报告

## 审查摘要

本次代码审查发现多个问题，包括命名和错误处理等方面，建议按照团队编码规范进行修改。

## 审查发现

### src/app.ts

#### ⚠️ WARNING: Line 10-12

**问题** 变量命名不符合命名规范。  
**建议** 建议使用 camelCase 命名方式。

```typescript
let my_variable = 123;
```
````

📚 [文档](https://example.com/coding-style#naming-conventions)

---

### src/utils/helper.ts

#### 🚨 ERROR: Line 5

**问题** 缺少必要的错误处理。  
**建议** 在调用外部接口时添加 try/catch 块。

```typescript
function helper() {
  // 缺少错误处理
}
```

---

```

### 注意事项

- 报告内容可根据实际审查结果进行定制扩展。
- 请确保 `CodeReviewIssue` 中的各项内容完整，便于生成清晰的报告。
- 此 Markdown 示例为后续模块集成和文档扩充提供参考，可直接复制到项目 Wiki 或其他文档平台使用。
```
