# Commit Chat Interface

这是一个专门为 Git commit message 生成设计的交互式聊天界面。

## 功能特性

### 🎯 核心功能
- **交互式对话**: 通过自然语言与 AI 交互来生成和优化 commit message
- **实时预览**: 实时显示生成的 commit message 效果
- **智能提示**: 基于上下文和用户偏好的智能建议
- **快捷命令**: 支持 `/help`, `/template`, `/style` 等快捷命令
- **文件拖拽**: 支持从 SCM 资源管理器拖拽文件到输入框，自动分析文件变更

### 🧠 智能特性
- **学习用户偏好**: 根据用户的使用习惯学习并适应
- **上下文感知**: 基于项目类型和最近提交历史提供建议
- **多语言支持**: 支持中文和英文 commit message
- **多种风格**: 支持 conventional、descriptive、emoji、minimal 等风格

### 🔧 配置管理
- **配置同步**: 与全局设置同步，支持冲突解决
- **偏好管理**: 持久化用户偏好和学习数据
- **导入导出**: 支持配置和偏好数据的导入导出

## 组件结构

```
commit-chat/
├── CommitChatView.tsx          # 主聊天界面组件
├── CommitTextArea.tsx          # 智能输入组件
├── CommitPreview.tsx           # 实时预览组件
├── UserMessage.tsx             # 用户消息组件
├── AIMessage.tsx               # AI 响应组件
└── README.md                   # 文档
```

## 服务架构

```
services/commit-chat/
├── commit-chat-service.ts      # AI 对话服务
├── suggestion-engine.ts        # 智能提示引擎
├── command-parser.ts           # 命令解析器
├── response-processor.ts       # 响应处理器
├── config-sync.ts              # 配置同步服务
└── preference-manager.ts       # 偏好管理服务
```

## 使用方法

### 基本使用

```tsx
import CommitChatView from '@/components/commit-chat/CommitChatView';

function MyComponent() {
  const handleCommitMessageGenerated = (message: string) => {
    console.log('Generated commit message:', message);
  };

  const handleConfigurationChanged = (config: Record<string, any>) => {
    console.log('Configuration changed:', config);
  };

  return (
    <CommitChatView
      onCommitMessageGenerated={handleCommitMessageGenerated}
      onConfigurationChanged={handleConfigurationChanged}
    />
  );
}
```

### 文件拖拽功能

```tsx
import CommitTextArea from '@/components/commit-chat/CommitTextArea';

function ChatInput() {
  const handleFilesDropped = (filePaths: string[]) => {
    console.log('Files dropped:', filePaths);
    // 处理拖拽的文件路径
  };

  return (
    <CommitTextArea
      value={inputValue}
      onChange={setInputValue}
      onSend={handleSend}
      onFilesDropped={handleFilesDropped}
      placeholder="拖拽文件到输入框..."
    />
  );
}
```

### 高级配置

```tsx
import { useCommitChatState } from '@/hooks/useCommitChatState';

function AdvancedChatComponent() {
  const {
    state,
    addMessage,
    setInputValue,
    getConversationContext,
  } = useCommitChatState({
    maxMessages: 50,
    autoSaveDraft: true,
    enableHistory: true,
  });

  // 使用状态管理功能
  const handleSendMessage = () => {
    addMessage({
      type: 'user',
      content: state.inputValue,
    });
    setInputValue('');
  };

  return (
    <div>
      {/* 聊天界面 */}
      <CommitChatView />
      
      {/* 其他 UI 组件 */}
    </div>
  );
}
```

## 快捷命令

| 命令 | 描述 | 示例 |
|------|------|------|
| `/help` | 显示帮助信息 | `/help` |
| `/template` | 显示模板列表 | `/template feat` |
| `/style` | 设置消息风格 | `/style conventional` |
| `/length` | 设置最大长度 | `/length 50` |
| `/language` | 设置语言 | `/language zh` |
| `/suggest` | 生成建议 | `/suggest 添加用户登录` |
| `/history` | 显示提交历史 | `/history 5` |
| `/clear` | 清空对话 | `/clear` |
| `/export` | 导出对话 | `/export` |

## 文件拖拽功能

### 支持的文件类型
- **代码文件**: `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.java`, `.cpp`, `.c`, `.cs`, `.php`, `.rb`, `.go`, `.rs`, `.swift`, `.kt`, `.scala`
- **Web 文件**: `.html`, `.css`, `.scss`, `.less`, `.vue`, `.svelte`
- **配置文件**: `.json`, `.xml`, `.yaml`, `.yml`
- **文档文件**: `.md`, `.txt`

### 拖拽操作
1. **从 SCM 资源管理器拖拽**: 直接拖拽文件到输入框
2. **视觉反馈**: 拖拽时显示高亮边框和提示信息
3. **文件过滤**: 自动过滤不支持的文件类型
4. **文件显示**: 显示拖拽的文件列表，包含文件图标和名称
5. **清除功能**: 可以一键清除所有拖拽的文件

### 使用场景
- **批量文件提交**: 拖拽多个相关文件，AI 会分析文件关系生成合适的 commit message
- **代码审查**: 拖拽修改的文件，AI 会基于文件变更生成描述性 commit message
- **功能开发**: 拖拽新功能相关的文件，AI 会生成功能性的 commit message

## 配置选项

### 用户偏好

```typescript
interface UserPreference {
  style: 'conventional' | 'descriptive' | 'emoji' | 'minimal';
  language: 'zh' | 'en';
  maxLength: number;
  includeScope: boolean;
  includeBody: boolean;
  enableSuggestions: boolean;
  enableCommands: boolean;
  enablePreview: boolean;
  autoSave: boolean;
  customTemplates: Array<{
    name: string;
    pattern: string;
    description: string;
  }>;
}
```

### 服务配置

```typescript
interface CommitChatConfig {
  maxContextLength: number;
  enableStreaming: boolean;
  enableSuggestions: boolean;
  enableCommands: boolean;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
}
```

## 集成到设置界面

聊天界面已经集成到设置界面中，用户可以通过以下步骤访问：

1. 打开 VS Code 设置
2. 在左侧菜单中找到 "Commit 聊天助手"
3. 点击进入聊天界面

## 扩展开发

### 添加自定义命令

```typescript
import { CommandParser } from '@/services/commit-chat/command-parser';

const customCommand = {
  command: 'mycommand',
  description: '我的自定义命令',
  usage: '/mycommand [args]',
  examples: ['/mycommand test'],
  handler: async (args, context) => {
    return {
      success: true,
      message: '自定义命令执行成功',
    };
  },
};

const commandParser = new CommandParser([customCommand]);
```

### 添加自定义模板

```typescript
import { SuggestionEngine } from '@/services/commit-chat/suggestion-engine';

const customTemplate = {
  name: 'custom',
  pattern: 'custom: {description}',
  description: '自定义模板',
  examples: ['custom: 自定义提交信息'],
  category: 'custom',
};

const suggestionEngine = new SuggestionEngine();
suggestionEngine.updateUserPreferences({
  customTemplates: [customTemplate],
});
```

## 性能优化

- **虚拟滚动**: 消息列表使用虚拟滚动优化性能
- **缓存机制**: 响应处理器包含智能缓存
- **懒加载**: 组件支持懒加载和代码分割
- **内存管理**: 自动清理过期的缓存和学习数据

## 可访问性

- **键盘导航**: 支持完整的键盘导航
- **屏幕阅读器**: 兼容屏幕阅读器
- **高对比度**: 支持高对比度模式
- **语音输入**: 支持语音输入功能

## 故障排除

### 常见问题

1. **聊天界面不显示**
   - 检查是否正确导入组件
   - 确认设置菜单配置正确

2. **AI 响应失败**
   - 检查网络连接
   - 确认 AI 服务配置正确

3. **配置不同步**
   - 检查本地存储权限
   - 确认全局配置服务正常

4. **拖拽功能不工作**
   - 请参阅 [拖拽功能故障排除指南](./DRAG_DROP_TROUBLESHOOT.md)
   - 打开调试面板查看实时日志
   - 确认拖拽的是支持的文件类型

### 调试模式

启用调试模式可以查看详细的日志信息：

```typescript
// 在浏览器控制台中设置
localStorage.setItem('commit-chat-debug', 'true');
```

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License
