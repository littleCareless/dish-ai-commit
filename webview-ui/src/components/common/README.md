# Common 组件文档

## 📋 概述

Common 模块提供跨应用共享的基础组件，包括错误处理、加载状态和数据展示等核心功能。

## 🏗️ 核心组件

### 1. ErrorBoundary (错误边界)

**文件**: `ErrorBoundary.tsx`

**职责**:

- 捕获并处理 React 组件树中的错误
- 防止错误导致整个应用崩溃
- 提供优雅的错误 UI 展示
- 支持错误日志上报

**实现原理**:

```tsx
class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // 可选：上报到监控服务
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

**使用示例**:

```tsx
// 全局错误捕获
<ErrorBoundary
  onError={(error, info) => {
    // 上报到监控
    console.error("应用错误:", error, info);
  }}
  fallback={
    <div className="p-8 text-center">
      <h2>应用出现错误</h2>
      <Button onClick={() => window.location.reload()}>
        刷新页面
      </Button>
    </div>
  }
>
  <App />
</ErrorBoundary>

// 局部错误捕获
<ErrorBoundary>
  <ComplexComponent />
</ErrorBoundary>
```

**错误展示组件**:

```tsx
const ErrorFallback: React.FC<{ error: Error | null }> = ({ error }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="max-w-md w-full bg-card border rounded-lg p-6">
        <h2 className="text-xl font-bold text-destructive mb-2">⚠️ 发生错误</h2>
        <p className="text-muted-foreground mb-4">应用遇到了意外问题</p>
        {error && (
          <details className="text-sm bg-muted p-3 rounded mb-4">
            <summary className="cursor-pointer">错误详情</summary>
            <pre className="mt-2 whitespace-pre-wrap">{error.message}</pre>
          </details>
        )}
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>刷新页面</Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            返回上页
          </Button>
        </div>
      </div>
    </div>
  );
};
```

### 2. LoadingPage (加载页面)

**文件**: `LoadingPage.tsx`

**职责**:

- 提供全屏加载指示器
- 支持多种加载状态（初始化、处理中）
- 可选的进度展示

**使用示例**:

```tsx
// 基础用法
<LoadingPage />

// 带描述
<LoadingPage
  message="正在初始化应用..."
  submessage="这可能需要几秒钟"
/>

// 带进度
<LoadingPage
  message="处理中"
  progress={65}
/>
```

**实现细节**:

```tsx
export const LoadingPage: React.FC<LoadingPageProps> = ({
  message = "加载中...",
  submessage,
  progress,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen ${className}`}
    >
      <div className="text-center space-y-4">
        {/* 主加载动画 */}
        <div className="flex justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>

        {/* 主消息 */}
        <h2 className="text-lg font-semibold">{message}</h2>

        {/* 子消息 */}
        {submessage && (
          <p className="text-sm text-muted-foreground">{submessage}</p>
        )}

        {/* 进度条 */}
        {progress !== undefined && (
          <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
```

## 🎯 使用场景

### 1. 应用初始化

```tsx
function App() {
  const { isReady } = useVSCodeContext();

  if (!isReady) {
    return <LoadingPage message="正在连接 VS Code..." />;
  }

  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
```

### 2. 数据加载

```tsx
function UserProfile() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
  });

  if (isLoading) return <LoadingPage message="加载用户信息..." />;
  if (error) return <ErrorFallback error={error} />;

  return <ProfileCard user={data} />;
}
```

### 3. 异步操作

```tsx
function ImportData() {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleImport = async () => {
    setIsImporting(true);

    for (let i = 0; i < 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setProgress(i);
    }

    setIsImporting(false);
  };

  if (isImporting) {
    return (
      <LoadingPage
        message="正在导入数据..."
        submessage="请不要关闭窗口"
        progress={progress}
      />
    );
  }

  return <Button onClick={handleImport}>导入数据</Button>;
}
```

## 🔧 组合使用

### 完整的错误处理流程

```tsx
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isReady, error } = useVSCodeContext();

  // 1. 加载中
  if (!isReady && !error) {
    return <LoadingPage message="正在初始化..." />;
  }

  // 2. 加载失败
  if (error) {
    return <ErrorFallback error={new Error(`初始化失败: ${error}`)} />;
  }

  // 3. 正常渲染（带错误边界）
  return (
    <ErrorBoundary
      onError={(err, info) => {
        console.error("Route error:", err, info);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
```

## 🎨 样式定制

### 自定义加载动画

```tsx
<LoadingPage className="bg-gradient-to-br from-blue-50 to-purple-50" />
```

### 错误页面样式

```tsx
<ErrorBoundary
  fallback={
    <div className="bg-red-50 border-red-200 border rounded-lg p-8">
      <h2 className="text-red-800 text-xl">自定义错误</h2>
    </div>
  }
>
  {children}
</ErrorBoundary>
```

## 🔍 故障排除

### ErrorBoundary 不捕获的错误

**问题**: 某些错误没有被捕获
**原因**:

- 异步代码中的错误（如 setTimeout、Promise）
- 事件处理函数中的错误
- 渲染周期外的错误

**解决方案**:

```tsx
// ❌ 不推荐
setTimeout(() => {
  throw new Error("异步错误"); // 不会被捕获
}, 1000);

// ✅ 推荐
setTimeout(() => {
  try {
    throw new Error("异步错误");
  } catch (error) {
    // 手动处理或上报
    console.error(error);
  }
}, 1000);

// 或者使用 window.onerror
window.onerror = (message, source, lineno, colno, error) => {
  console.error("全局错误:", error);
  return true;
};
```

### LoadingPage 闪烁

**问题**: 加载页面快速闪烁
**解决方案**:

```tsx
// 添加最小显示时间
const [showLoading, setShowLoading] = useState(false);

useEffect(() => {
  const timer = setTimeout(() => setShowLoading(true), 200);
  return () => clearTimeout(timer);
}, []);

if (isLoading || showLoading) {
  return <LoadingPage />;
}
```

## 📚 相关文档

- **Hooks**: [../hooks/README.md](../hooks/README.md)
- **UI 组件**: [../ui/README.md](../ui/README.md)
- **App.tsx**: [../../App.tsx](../../App.tsx)
- **VSCode Context**: [../contexts/VSCodeContext.tsx](../contexts/VSCodeContext.tsx)

---

**最后更新**: 2024年12月
**组件版本**: v0.56.1
**架构模式**: React Class + Hooks
**错误处理**: 全局 + 局部
