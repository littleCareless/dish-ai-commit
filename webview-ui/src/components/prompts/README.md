# Prompts 组件文档

## 📋 概述

Prompts 模块提供了提示词（Prompt）管理功能，允许用户创建、编辑和管理自定义提示词模板。支持变量替换和快速插入功能。

## 🏗️ 核心组件

### 1. CreatePromptModal (创建提示词模态框)

**文件**: `create-prompt-modal.tsx`

**职责**:

- 提供创建新提示词的界面
- 支持标题、内容和变量定义
- 表单验证和错误处理

**接口定义**:

```typescript
interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  variables: string[]; // 变量列表，如 ["project", "feature"]
  createdAt: Date;
  updatedAt: Date;
  usageCount: number; // 使用次数统计
}
```

**使用示例**:

```tsx
import { CreatePromptModal } from "@/components/prompts/create-prompt-modal";

function PromptsManager() {
  const [isOpen, setIsOpen] = useState(false);

  const handleCreate = async (template: PromptTemplate) => {
    // 保存到后端或本地存储
    await savePrompt(template);
    setIsOpen(false);
  };

  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>创建提示词</Button>

      <CreatePromptModal
        open={isOpen}
        onOpenChange={setIsOpen}
        onCreate={handleCreate}
      />
    </div>
  );
}
```

**模态框表单结构**:

```
┌─────────────────────────────────────┐
│ 创建提示词模板                       │
├─────────────────────────────────────┤
│ 标题: [输入框]                       │
│                                     │
│ 内容: [多行文本框]                   │
│   支持变量: {project}, {feature}    │
│                                     │
│ 变量管理:                           │
│   - {project} ✓                     │
│   - {feature} ✓                     │
│   [添加变量] [移除]                  │
│                                     │
│ [取消] [创建]                       │
└─────────────────────────────────────┘
```

### 2. VariablePicker (变量选择器)

**文件**: `variable-picker.tsx`

**职责**:

- 显示可用的变量列表
- 支持快速插入变量到编辑器
- 变量语法高亮和验证

**使用示例**:

```tsx
import { VariablePicker } from "@/components/prompts/variable-picker";

function PromptEditor() {
  const [content, setContent] = useState("");
  const availableVariables = ["project", "feature", "scope", "type"];

  const handleInsertVariable = (variable: string) => {
    setContent((prev) => prev + ` {${variable}}`);
  };

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="输入提示词，使用 {variable} 插入变量"
      />

      <VariablePicker
        variables={availableVariables}
        onSelect={handleInsertVariable}
      />

      {/* 预览 */}
      <div className="mt-4 p-4 bg-muted rounded">
        <p className="text-sm text-muted-foreground mb-2">预览:</p>
        <p className="font-mono">{content || "暂无内容"}</p>
      </div>
    </div>
  );
}
```

## 🎯 变量系统

### 变量语法

使用 `{variableName}` 格式：

```typescript
// 提示词模板
"为 {project} 项目添加 {feature} 功能，需要考虑 {scope} 方面"

// 变量映射
{
  project: "电商系统",
  feature: "用户登录",
  scope: "安全性"
}

// 渲染结果
"为 电商系统 项目添加 用户登录 功能，需要考虑 安全性 方面"
```

### 变量提取

```typescript
function extractVariables(content: string): string[] {
  const regex = /\{(\w+)\}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  return variables;
}

// 示例
extractVariables("Hello {name}, your {item} is ready");
// 返回: ["name", "item"]
```

### 变量替换

```typescript
function renderTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] || match;
  });
}

// 示例
renderTemplate("为 {project} 添加 {feature}", {
  project: "AI 系统",
  feature: "聊天功能",
});
// 返回: "为 AI 系统 添加 聊天功能"
```

## 🎨 使用场景

### 1. Commit Message 生成

```typescript
const commitTemplate = {
  title: "生成 Commit Message",
  content: `
    分析以下代码变更:
    {diff}

    要求:
    1. 使用 {type} 格式
    2. 简洁明了
    3. 包含 {scope}
  `,
  variables: ["diff", "type", "scope"],
};

// 使用
const prompt = renderTemplate(commitTemplate.content, {
  diff: "git diff output...",
  type: "Conventional Commits",
  scope: "backend",
});
```

### 2. 代码审查

```typescript
const reviewTemplate = {
  title: "代码审查",
  content: `
    请审查以下 {language} 代码:
    {code}

    关注点:
    - {focus}
    - 性能优化
    - 最佳实践
  `,
  variables: ["language", "code", "focus"],
};
```

### 3. 文档生成

```typescript
const docTemplate = {
  title: "API 文档生成",
  content: `
    为以下代码生成 API 文档:
    {code}

    格式要求:
    - 使用 {format} 格式
    - 包含示例代码
    - 说明 {audience}
  `,
  variables: ["code", "format", "audience"],
};
```

## 🔧 管理提示词

### 存储结构

```typescript
// 本地存储示例
interface StoredPrompt {
  id: string;
  title: string;
  content: string;
  variables: string[];
  metadata: {
    category: string; // 分类
    tags: string[]; // 标签
    lastUsed: Date; // 最后使用时间
    usageCount: number; // 使用次数
  };
}

// 存储到 localStorage
const savePrompt = (prompt: StoredPrompt) => {
  const prompts = JSON.parse(localStorage.getItem("prompts") || "[]");
  prompts.push(prompt);
  localStorage.setItem("prompts", JSON.stringify(prompts));
};
```

### 分类管理

```typescript
const categories = {
  commit: "提交信息",
  review: "代码审查",
  doc: "文档生成",
  refactor: "代码重构",
  test: "测试生成",
};

// 按分类筛选
const getPromptsByCategory = (category: string) => {
  return prompts.filter((p) => p.metadata.category === category);
};
```

## 🎯 最佳实践

### 1. 提示词设计原则

```typescript
// ✅ 推荐：清晰的变量定义
const goodPrompt = {
  content: "为 {project} 项目添加 {feature} 功能",
  variables: ["project", "feature"],
};

// ❌ 避免：模糊的变量
const badPrompt = {
  content: "为 {something} 添加 {stuff}",
  variables: ["something", "stuff"],
};
```

### 2. 变量验证

```typescript
function validateVariables(
  content: string,
  variables: string[],
): { valid: boolean; missing: string[] } {
  const extracted = extractVariables(content);
  const missing = extracted.filter((v) => !variables.includes(v));

  return {
    valid: missing.length === 0,
    missing,
  };
}

// 使用
const result = validateVariables("为 {project} 添加 {feature}", ["project"]);
// result: { valid: false, missing: ["feature"] }
```

### 3. 模板复用

```typescript
// 创建基础模板库
const baseTemplates = {
  conventionalCommit: {
    title: "Conventional Commit",
    content: "{type}({scope}): {description}",
    variables: ["type", "scope", "description"],
  },

  angularCommit: {
    title: "Angular Commit",
    content: "{type}({scope}): {subject}\n\n{body}\n\n{footer}",
    variables: ["type", "scope", "subject", "body", "footer"],
  },
};

// 使用模板
const generateCommit = (type: string, scope: string, desc: string) => {
  return renderTemplate(baseTemplates.conventionalCommit.content, {
    type,
    scope,
    description: desc,
  });
};
```

## 🔍 故障排除

### 常见问题

#### 1. 变量不替换

**问题**: `{variable}` 保持原样
**解决方案**:

```typescript
// 检查变量名是否匹配
const content = "Hello {name}";
const variables = { name: "World" }; // ✅ 正确
// const variables = { Name: "World" }; // ❌ 大小写不匹配

// 检查替换函数
function replaceVariables(text, vars) {
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : match;
  });
}
```

#### 2. 变量提取错误

**问题**: 提取了错误的变量
**解决方案**:

```typescript
// 使用正确的正则表达式
const regex = /\{(\w+)\}/g; // ✅ 只匹配字母数字下划线
// const regex = /\{.*?\}/g;  // ❌ 匹配太多内容

// 测试正则
const test = "{name} and {age}";
const matches = test.match(/\{(\w+)\}/g);
// 返回: ["{name}", "{age}"]
```

#### 3. 模态框不显示

**问题**: CreatePromptModal 不打开
**解决方案**:

```tsx
// 确保正确管理状态
const [isOpen, setIsOpen] = useState(false);

// 确保传递正确
<CreatePromptModal
  open={isOpen}
  onOpenChange={setIsOpen} // 必须传递
  onCreate={handleCreate}
/>;
```

## 📚 相关文档

- **Commit Chat**: [../commit-chat/README.md](../commit-chat/README.md)
- **Hooks**: [../hooks/README.md](../hooks/README.md)
- **Prompts Page**: [../../pages/prompts-page.tsx](../../pages/prompts-page.tsx)
- **类型定义**: [../../types/settings.ts](../../types/settings.ts)

---

**最后更新**: 2024年12月
**组件版本**: v0.56.1
**架构模式**: React Hooks + 模板引擎
**变量系统**: `{variable}` 语法
