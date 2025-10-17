# 上下文区块快速参考

## 🚀 优先级排序 (数字越小优先级越高)

| 优先级 | 区块名称 | 强制保留 | 作用 |
|--------|----------|----------|------|
| **100** | `code-changes` | ✅ | **核心**：AI 分析的主要对象 |
| **750** | `custom-instructions` | ❌ | 用户自定义指令 |
| **800** | `original-code` | ❌ | 原始代码对比 |
| **900** | `reminder` | ✅ | 系统提醒和指导 |
| **950** | `user-commits` | ✅ | 用户提交历史（用户开启） |
| **950** | `recent-commits` | ✅ | 仓库提交历史（用户开启） |
| **320** | `similar-code` | ❌ | 相似代码上下文 |

## 🎯 关键设计原则

1. **`code-changes` 优先级最高** - 这是 AI 分析的核心依据
2. **用户主动开启的功能强制保留** - 尊重用户选择
3. **系统指导信息强制保留** - 确保 AI 行为正确
4. **参考信息可截断** - 在空间不足时优先保留核心内容

## 📋 强制保留区块

```typescript
FORCE_RETAIN_BLOCKS = [
  "code-changes",      // 核心分析对象
  "user-commits",      // 用户主动开启
  "recent-commits",    // 用户主动开启  
  "reminder"           // 系统指导
]
```

## 🔄 截断策略

- **SmartTruncateDiff**: 智能截断代码变更，保留重要部分
- **TruncateTail**: 从尾部截断文本内容，保留开头

---

*详细文档请参考: [context-blocks.md](./context-blocks.md)*
