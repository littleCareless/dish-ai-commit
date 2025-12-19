# UI 组件库文档

## 📋 概述

UI 模块提供了一套完整的、可复用的基础组件库，基于 Radix UI 和 Tailwind CSS 构建。所有组件都支持主题、无障碍访问和响应式设计。

## 🏗️ 技术栈

- **基础**: Radix UI (无头组件)
- **样式**: Tailwind CSS
- **图标**: Lucide React, @radix-ui/react-icons
- **动画**: Tailwind CSS Animate
- **工具**: class-variance-authority (CVA)

## 📦 组件分类

### 1. 输入组件 (Input Components)

- **Button** - 按钮组件
- **Input** - 文本输入框
- **Textarea** - 多行文本输入
- **Checkbox** - 复选框
- **RadioGroup** - 单选按钮组
- **Select** - 下拉选择器
- **Switch** - 开关
- **Slider** - 滑块

### 2. 数据展示组件 (Data Display)

- **Card** - 卡片容器
- **Badge** - 徽章标签
- **Avatar** - 头像
- **Progress** - 进度条
- **ProgressRing** - 环形进度条
- **StatusIndicator** - 状态指示器
- **DataGrid** - 数据表格

### 3. 导航组件 (Navigation)

- **Breadcrumb** - 面包屑
- **NavigationMenu** - 导航菜单
- **Menubar** - 菜单栏
- **Tabs** - 标签页

### 4. 反馈组件 (Feedback)

- **Alert** - 警告提示
- **Toast** - 轻提示
- **Dialog** - 对话框
- **AlertDialog** - 确认对话框
- **HoverCard** - 悬停卡片
- **Tooltip** - 工具提示

### 5. 数据录入组件 (Data Entry)

- **Form** - 表单
- **FormHooks** - 表单 Hooks
- **Calendar** - 日历
- **DatePicker** - 日期选择器

### 6. 布局组件 (Layout)

- **ScrollArea** - 滚动区域
- **Resizable** - 可调整大小面板
- **Drawer** - 抽屉
- **Popover** - 弹出框

### 7. 组合组件 (Composite)

- **Command** - 命令面板
- **Accordion** - 折叠面板
- **Collapsible** - 可折叠内容
- **ContextMenu** - 右键菜单
- **DropdownMenu** - 下拉菜单

### 8. 专用组件 (Specialized)

- **ProgressStages** - 阶段进度
- **StatusIndicator** - 状态指示器

## 🎨 核心组件详解

### 1. Button (按钮)

**特性**:

- 多种变体: default, primary, secondary, destructive, outline, ghost, link
- 大小控制: default, sm, lg, icon
- 加载状态
- 禁用状态
- 图标支持

**使用示例**:

```tsx
import { Button } from "@/components/ui/button";

// 基础用法
<Button variant="default" size="default">
  点击我
</Button>

// 带图标
<Button variant="outline" icon={<Plus className="w-4 h-4" />}>
  新增
</Button>

// 加载状态
<Button disabled={isLoading}>
  {isLoading ? "加载中..." : "提交"}
</Button>

// 危险操作
<Button variant="destructive" onClick={handleDelete}>
  删除
</Button>
```

### 2. Card (卡片)

**使用示例**:

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>卡片标题</CardTitle>
    <CardDescription>卡片描述文本</CardDescription>
  </CardHeader>
  <CardContent>
    <p>卡片内容区域</p>
  </CardContent>
  <CardFooter>
    <Button>操作按钮</Button>
  </CardFooter>
</Card>;
```

### 3. Form (表单)

**基于 React Hook Form**:

```tsx
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const form = useForm({
  defaultValues: {
    name: "",
    email: "",
  },
});

function ProfileForm() {
  const onSubmit = (data) => {
    console.log(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>姓名</FormLabel>
              <FormControl>
                <Input placeholder="请输入姓名" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">提交</Button>
      </form>
    </Form>
  );
}
```

### 4. Dialog (对话框)

**使用示例**:

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button>打开对话框</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>对话框标题</DialogTitle>
      <DialogDescription>对话框描述</DialogDescription>
    </DialogHeader>
    <div>对话框内容...</div>
  </DialogContent>
</Dialog>;
```

### 5. Toast (轻提示)

**使用示例**:

```tsx
import { useToast } from "@/hooks/use-toast";

function MyComponent() {
  const { toast } = useToast();

  const handleClick = () => {
    toast({
      title: "操作成功",
      description: "您的更改已保存",
      variant: "default",
      duration: 3000,
    });
  };

  const handleError = () => {
    toast({
      title: "错误",
      description: "操作失败，请重试",
      variant: "destructive",
      duration: 5000,
    });
  };

  return (
    <div>
      <Button onClick={handleClick}>成功提示</Button>
      <Button onClick={handleError} variant="destructive">
        错误提示
      </Button>
    </div>
  );
}
```

### 6. ProgressStages (阶段进度)

**专用组件 - 用于索引流程**:

```tsx
import { ProgressStages } from "@/components/ui/ProgressStages";

<ProgressStages
  stages={[
    { name: "初始化", status: "completed" },
    { name: "扫描文件", status: "processing" },
    { name: "生成索引", status: "pending" },
    { name: "完成", status: "pending" },
  ]}
  currentStage={1}
/>;
```

### 7. StatusIndicator (状态指示器)

**使用示例**:

```tsx
import { StatusIndicator } from "@/components/ui/StatusIndicator";

// 不同状态
<StatusIndicator status="success" text="运行正常" />
<StatusIndicator status="error" text="连接失败" />
<StatusIndicator status="warning" text="需要配置" />
<StatusIndicator status="loading" text="处理中" />
```

### 8. DataGrid (数据表格)

**使用示例**:

```tsx
import { DataGrid } from "@/components/ui/data-grid";

<DataGrid
  data={profiles}
  columns={[
    { header: "名称", accessor: "name" },
    { header: "描述", accessor: "description" },
    {
      header: "操作",
      accessor: "actions",
      cell: (row) => (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleEdit(row)}>
            编辑
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleDelete(row)}
          >
            删除
          </Button>
        </div>
      ),
    },
  ]}
/>;
```

## 🎨 主题集成

### 使用 VS Code 主题

所有组件自动适配 VS Code 主题：

```tsx
// 组件会自动使用当前主题
<Button variant="default">自适应主题</Button>

// 也可以手动指定
<div className="bg-background text-foreground">
  {/* 内容 */}
</div>
```

### 主题类参考

```css
/* 背景色 */
.bg-background     /* 主背景 */
.bg-card           /* 卡片背景 */
.bg-muted          /* 弱化背景 */
.bg-primary        /* 主色调 */

/* 文字色 */
.text-foreground   /* 主文字 */
.text-muted        /* 弱化文字 */
.text-primary      /* 主色调文字 */

/* 边框 */
.border            /* 边框 */
.border-input      /* 输入框边框 */
```

## 📱 响应式设计

### 断点系统

```tsx
// 移动端优先
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* 移动端全宽，平板半宽，桌面 1/3 宽 */}
</div>

// 隐藏/显示
<div className="hidden md:block">
  {/* 仅在桌面显示 */}
</div>

// 间距
<div className="p-4 md:p-6 lg:p-8">
  {/* 响应式内边距 */}
</div>
```

## ♿ 无障碍访问

### 键盘导航

所有交互组件支持：

- Tab - 焦点切换
- Enter/Space - 激活
- Esc - 关闭/取消
- 方向键 - 导航选择

### 屏幕阅读器

```tsx
// 按钮
<Button aria-label="删除配置文件" variant="destructive">
  <Trash2 className="w-4 h-4" />
</Button>

// 对话框
<Dialog>
  <DialogTrigger>
    <Button>打开</Button>
  </DialogTrigger>
  <DialogContent aria-describedby="对话框描述">
    <DialogDescription id="对话框描述">
      这是一个重要的操作
    </DialogDescription>
  </DialogContent>
</Dialog>
```

## 🎯 最佳实践

### 1. 组件组合

```tsx
// ✅ 推荐：组合使用
<Card>
  <CardHeader>
    <CardTitle>标题</CardTitle>
    <CardDescription>描述</CardDescription>
  </CardHeader>
  <CardContent>
    <p>内容</p>
  </CardContent>
  <CardFooter>
    <Button>操作</Button>
  </CardFooter>
</Card>

// ❌ 避免：手动拼凑样式
<div className="border rounded-lg p-4 shadow">
  <h3 className="text-lg font-bold">标题</h3>
  {/* ... */}
</div>
```

### 2. 表单验证

```tsx
// ✅ 推荐：使用 Form 组件
<Form {...form}>
  <form onSubmit={handleSubmit}>
    <FormField
      control={control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>邮箱</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>

// ❌ 避免：手动验证
<Input
  onChange={handleChange}
  onBlur={validateEmail}
  className={error ? "border-red-500" : ""}
/>
{error && <span className="text-red-500">{error}</span>}
```

### 3. 状态反馈

```tsx
// ✅ 推荐：使用 Toast
const { toast } = useToast();

const handleSave = async () => {
  try {
    await saveData();
    toast({ title: "保存成功", description: "您的更改已保存" });
  } catch (error) {
    toast({
      title: "保存失败",
      description: error.message,
      variant: "destructive",
    });
  }
};

// ❌ 避免：使用 alert
const handleSave = async () => {
  try {
    await saveData();
    alert("保存成功");
  } catch (error) {
    alert("保存失败: " + error.message);
  }
};
```

### 4. 加载状态

```tsx
// ✅ 推荐：使用 Button 的 disabled 状态
<Button disabled={isLoading} type="submit">
  {isLoading ? (
    <div className="flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin" />
      处理中...
    </div>
  ) : (
    "提交"
  )}
</Button>

// 或者使用 ProgressStages
<ProgressStages
  stages={stages}
  currentStage={currentStage}
/>
```

## 🔧 自定义组件

### 使用 CVA 创建变体

```tsx
import { cva } from "class-variance-authority";

const myButtonVariants = cva("px-4 py-2 rounded font-medium", {
  variants: {
    variant: {
      default: "bg-blue-500 text-white hover:bg-blue-600",
      destructive: "bg-red-500 text-white hover:bg-red-600",
      outline: "border border-gray-300 hover:bg-gray-100",
    },
    size: {
      sm: "text-sm px-3 py-1",
      default: "text-base px-4 py-2",
      lg: "text-lg px-6 py-3",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

interface MyButtonProps {
  variant?: "default" | "destructive" | "outline";
  size?: "sm" | "default" | "lg";
  children: React.ReactNode;
}

export const MyButton = ({ variant, size, children }: MyButtonProps) => {
  return (
    <button className={myButtonVariants({ variant, size })}>{children}</button>
  );
};
```

## 🔍 故障排除

### 常见问题

#### 1. 样式不生效

**问题**: 组件看起来没有样式
**解决方案**:

- 确认 Tailwind CSS 配置正确
- 检查是否导入了正确的组件
- 验证构建过程是否完成

#### 2. 对话框不显示

**问题**: Dialog/Drawer 不打开
**解决方案**:

- 确认使用了 `DialogTrigger` 包装触发器
- 检查 `asChild` 属性的使用
- 验证 `DialogContent` 是否正确包裹

#### 3. 表单验证错误

**问题**: FormMessage 不显示错误
**解决方案**:

- 确认 `FormField` 的 `name` 与 `form` 的字段匹配
- 检查 `control` 是否正确传递
- 验证 `form.handleSubmit` 的使用

## 📚 相关文档

- **Radix UI 文档**: https://www.radix-ui.com/
- **Tailwind CSS**: https://tailwindcss.com/
- **React Hook Form**: https://react-hook-form.com/
- **Hooks**: [../hooks/README.md](../hooks/README.md)
- **组件使用示例**: [../commit-chat/README.md](../commit-chat/README.md)

---

**最后更新**: 2024年12月
**组件版本**: v0.56.1
**架构模式**: Radix UI + Tailwind CSS + CVA
**支持**: 无障碍访问 + 主题适配 + 响应式
