# Welcome 组件文档

## 📋 概述

Welcome 模块提供了应用的欢迎页面和新用户引导功能，包括英雄区域、功能介绍和使用提示。

## 🏗️ 核心组件

### 1. Hero (英雄区域)

**文件**: `hero.tsx`

**职责**:

- 展示应用的核心价值主张
- 提供主要操作入口
- 吸引用户注意力

**设计特点**:

- 视觉突出的标题和描述
- 清晰的 CTA (Call to Action) 按钮
- 简洁的功能概述

**使用示例**:

```tsx
import { Hero } from "@/components/welcome/hero";

function WelcomePage() {
  return (
    <div className="container mx-auto py-12">
      <Hero />
    </div>
  );
}
```

**Hero 组件结构**:

```tsx
export const Hero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="text-center space-y-6 py-12">
      {/* Logo 和标题 */}
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">
          Dish AI Commit Gen
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          智能化的提交信息生成工具，让代码提交更高效、更规范
        </p>
      </div>

      {/* 主要操作 */}
      <div className="flex gap-3 justify-center">
        <Button size="lg" onClick={() => navigate("/settings")}>
          开始配置
        </Button>
        <Button size="lg" variant="outline" onClick={() => navigate("/usage")}>
          查看教程
        </Button>
      </div>

      {/* 快速统计或特性展示 */}
      <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mt-8">
        <div className="p-4 bg-card rounded-lg border">
          <div className="text-2xl font-bold">AI 驱动</div>
          <div className="text-sm text-muted-foreground">智能分析</div>
        </div>
        <div className="p-4 bg-card rounded-lg border">
          <div className="text-2xl font-bold">多语言</div>
          <div className="text-sm text-muted-foreground">中英支持</div>
        </div>
        <div className="p-4 bg-card rounded-lg border">
          <div className="text-2xl font-bold">实时预览</div>
          <div className="text-sm text-muted-foreground">即时反馈</div>
        </div>
      </div>
    </div>
  );
};
```

### 2. Tips (使用提示)

**文件**: `tips.tsx`

**职责**:

- 提供快速使用指南
- 展示最佳实践
- 引导用户完成关键操作

**内容分类**:

- 配置提示
- 使用技巧
- 常见问题
- 快捷操作

**使用示例**:

```tsx
import { Tips } from "@/components/welcome/tips";

function WelcomePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Hero />
      <Tips />
    </div>
  );
}
```

**Tips 组件结构**:

```tsx
export const Tips: React.FC = () => {
  const tips = [
    {
      icon: "⚙️",
      title: "快速配置",
      description: "在设置页面配置 AI 提供商，支持 OpenAI、Gemini、Ollama 等",
      action: {
        label: "去配置",
        path: "/settings",
      },
    },
    {
      icon: "💬",
      title: "交互式聊天",
      description: "使用聊天界面与 AI 对话，生成和优化提交信息",
      action: {
        label: "开始聊天",
        path: "/commit-chat",
      },
    },
    {
      icon: "🔍",
      title: "代码索引",
      description: "建立代码索引，让 AI 更好地理解你的项目上下文",
      action: {
        label: "建立索引",
        path: "/indexing",
      },
    },
    {
      icon: "📝",
      title: "自定义提示词",
      description: "创建自己的提示词模板，提高生成质量",
      action: {
        label: "管理模板",
        path: "/prompts",
      },
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {tips.map((tip, index) => (
        <TipCard key={index} tip={tip} />
      ))}
    </div>
  );
};

const TipCard: React.FC<{ tip: TipItem }> = ({ tip }) => {
  const navigate = useNavigate();

  return (
    <div className="p-6 bg-card border rounded-lg space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{tip.icon}</span>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">{tip.title}</h3>
          <p className="text-sm text-muted-foreground">{tip.description}</p>
        </div>
      </div>
      {tip.action && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(tip.action.path)}
          className="w-full mt-2"
        >
          {tip.action.label}
        </Button>
      )}
    </div>
  );
};
```

## 🎨 完整的欢迎页面

### 页面结构

```tsx
// src/pages/welcome-page.tsx
import { Hero } from "@/components/welcome/hero";
import { Tips } from "@/components/welcome/tips";
import { useNavigate } from "react-router-dom";
import { useVSCodeContext } from "@/contexts/useVSCodeContext";

export default function WelcomePage() {
  const navigate = useNavigate();
  const { initialData } = useVSCodeContext();

  // 如果已经配置过，可以显示不同的内容
  const hasConfig = initialData?.hasExistingConfig;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <Hero />

        {/* 已配置用户的快捷操作 */}
        {hasConfig && (
          <div className="mt-8 p-6 bg-card border rounded-lg">
            <h2 className="text-xl font-semibold mb-4">快速操作</h2>
            <div className="flex gap-3 flex-wrap">
              <Button onClick={() => navigate("/commit-chat")}>打开聊天</Button>
              <Button variant="outline" onClick={() => navigate("/settings")}>
                修改配置
              </Button>
              <Button variant="outline" onClick={() => navigate("/indexing")}>
                更新索引
              </Button>
            </div>
          </div>
        )}

        {/* 使用提示 */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-center mb-6">
            {hasConfig ? "进阶技巧" : "开始使用"}
          </h2>
          <Tips />
        </div>

        {/* 底部链接 */}
        <div className="mt-12 text-center space-x-4 text-sm text-muted-foreground">
          <button
            onClick={() => navigate("/usage")}
            className="hover:underline"
          >
            使用指南
          </button>
          <button
            onClick={() => navigate("/about")}
            className="hover:underline"
          >
            关于
          </button>
        </div>
      </div>
    </div>
  );
}
```

## 🎯 使用场景

### 1. 新用户引导

```tsx
// 检查是否是首次使用
const WelcomeOrDashboard: React.FC = () => {
  const { initialData } = useVSCodeContext();
  const navigate = useNavigate();

  useEffect(() => {
    // 如果已配置且有数据，跳转到仪表板
    if (initialData?.hasExistingConfig && initialData?.hasData) {
      navigate("/dashboard");
    }
  }, [initialData, navigate]);

  return <WelcomePage />;
};
```

### 2. 功能亮点展示

```tsx
const FeatureHighlights: React.FC = () => {
  const features = [
    {
      icon: "🤖",
      title: "AI 智能生成",
      description: "基于上下文生成符合规范的提交信息",
    },
    {
      icon: "🌐",
      title: "多语言支持",
      description: "支持中文、英文等多语言界面",
    },
    {
      icon: "⚡",
      title: "实时预览",
      description: "即时查看生成结果，支持修改",
    },
    {
      icon: "🔧",
      title: "高度可配",
      description: "支持多种 AI 提供商和自定义模板",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {features.map((f, i) => (
        <div key={i} className="text-center p-4">
          <div className="text-4xl mb-2">{f.icon}</div>
          <h3 className="font-semibold mb-1">{f.title}</h3>
          <p className="text-sm text-muted-foreground">{f.description}</p>
        </div>
      ))}
    </div>
  );
};
```

## 🔧 与 Onboarding 集成

### 使用 useOnboarding Hook

```tsx
import { useOnboarding } from "@/hooks/useOnboarding";

function WelcomeWithOnboarding() {
  const { currentStep, isCompleted, nextStep, prevStep, skipOnboarding } =
    useOnboarding();

  if (isCompleted) {
    return <WelcomePage />;
  }

  return (
    <OnboardingWizard
      step={currentStep}
      onNext={nextStep}
      onPrev={prevStep}
      onSkip={skipOnboarding}
    />
  );
}
```

## 🎨 设计原则

### 1. 渐进式引导

```typescript
// 第一步：欢迎
// 第二步：配置提供商
// 第三步：测试连接
// 第四步：完成
const steps = [
  { title: "欢迎", description: "了解核心功能" },
  { title: "配置", description: "设置 AI 提供商" },
  { title: "测试", description: "验证配置是否正常" },
  { title: "完成", description: "开始使用" },
];
```

### 2. 行动导向

```tsx
// ✅ 推荐：明确的 CTA
<Button size="lg" onClick={() => navigate("/settings")}>
  开始配置
</Button>

// ❌ 避免：模糊的描述
<p>你可以稍后在设置中配置</p>
```

### 3. 信息层次

```tsx
// 标题 - 主要信息
<h1 className="text-4xl font-bold">Dish AI Commit Gen</h1>

// 副标题 - 次要信息
<p className="text-xl text-muted-foreground">智能提交信息生成</p>

// 提示 - 辅助信息
<p className="text-sm text-muted-foreground">支持 OpenAI、Gemini 等</p>
```

## 🔍 响应式设计

### 移动端适配

```tsx
// Hero 区域在移动端的调整
<div className="space-y-6 py-8">
  <h1 className="text-3xl md:text-4xl">标题</h1>

  <div className="flex flex-col md:flex-row gap-2">
    <Button className="w-full md:w-auto">主要操作</Button>
    <Button variant="outline" className="w-full md:w-auto">
      次要操作
    </Button>
  </div>

  {/* 特性网格 */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{/* 特性卡片 */}</div>
</div>
```

## 📊 性能优化

### 懒加载非关键内容

```tsx
import { Suspense, lazy } from "react";

const Tips = lazy(() => import("@/components/welcome/tips"));

function WelcomePage() {
  return (
    <div>
      <Hero />
      <Suspense fallback={<LoadingPage />}>
        <Tips />
      </Suspense>
    </div>
  );
}
```

## 🔍 故障排除

### 常见问题

#### 1. 页面不显示

**问题**: WelcomePage 空白
**解决方案**:

- 检查路由配置是否正确
- 确认组件是否正确导出
- 验证父容器的高度设置

#### 2. 导航不工作

**问题**: 点击按钮无反应
**解决方案**:

```tsx
// 确保正确使用 useNavigate
const navigate = useNavigate();

// 确保按钮正确绑定
<Button onClick={() => navigate("/settings")}>配置</Button>;
```

#### 3. 样式异常

**问题**: 布局错乱
**解决方案**:

- 检查 Tailwind CSS 类名
- 确认父容器的 padding/margin
- 验证响应式类是否正确

## 📚 相关文档

- **Hooks**: [../hooks/README.md](../hooks/README.md#useOnboarding)
- **路由**: [../router/README.md](../router/README.md)
- **页面**: [../../pages/welcome-page.tsx](../../pages/welcome-page.tsx)
- **UI 组件**: [../ui/README.md](../ui/README.md)

---

**最后更新**: 2024年12月
**组件版本**: v0.56.1
**架构模式**: React Hooks + React Router
**设计风格**: 渐进式引导 + 行动导向
