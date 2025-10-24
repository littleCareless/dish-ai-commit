# SVN 源代码管理模块

本模块提供 SVN 源代码管理功能，包括优雅降级机制和多种实现选择。

## 模块结构

```
svn/
├── helpers/                - 辅助工具类
│   ├── svn-path-helper.ts  - 路径处理工具
│   ├── svn-diff-helper.ts  - 差异处理工具
│   ├── svn-log-helper.ts   - 日志处理工具
│   └── svn-test-helper.ts  - 测试帮助工具
├── index.ts               - 模块导出
├── svn-provider.ts        - VS Code API 实现
├── svn-command-provider.ts - 命令行实现
├── cli-svn-provider.ts     - 简化命令行实现（降级用）
├── svn-provider-factory.ts - 提供者工厂（优雅降级）
├── svn-provider-interface.ts - 公共接口
└── svn-repository-manager.ts - 仓库管理
```

## 优雅降级机制

本模块提供三级优雅降级机制：

1. **VS Code SVN API**：优先使用 VS Code 的 SVN 扩展 API（如已安装）
2. **SVN 命令行工具**：当扩展 API 不可用时，使用完整的 SVN 命令行功能
3. **简易 CLI 实现**：当前两种方式都不可用时，使用基本的 CLI 实现

### 使用方法

使用工厂类自动选择最合适的提供者：

```typescript
import { SvnProviderFactory } from './scm/svn';

async function useSvn() {
  try {
    // 工厂会自动选择最佳的可用实现
    const svnProvider = await SvnProviderFactory.createProvider(workspacePath);
    
    // 使用提供者执行操作
    const diff = await svnProvider.getDiff();
    // ...
  } catch (error) {
    // 处理错误情况
    console.error('无法初始化 SVN 提供者', error);
  }
}
```

### 手动选择提供者

如果需要手动指定要使用的提供者：

```typescript
import { SvnProvider, SvnCommandProvider, CliSvnProvider } from './scm/svn';

// 使用 VS Code API 提供者
const apiProvider = new SvnProvider(vscodeExtension);

// 使用命令行提供者
const cmdProvider = new SvnCommandProvider(workspacePath);

// 使用简易 CLI 提供者
const cliProvider = new CliSvnProvider(workspacePath);
```

## 测试帮助工具

提供了 `SvnTestHelper` 类，用于测试 SVN 功能：

```typescript
import { SvnTestHelper } from './scm/svn/helpers';

// 检测可用的 SVN 提供者
const provider = await SvnTestHelper.detectAvailableProvider(workspacePath);

// 验证提供者基本功能
const isValid = await SvnTestHelper.validateProviderBasics(provider);

// 使用模拟数据进行测试
const mockDiff = SvnTestHelper.getMockSvnDiff();
```

## 注意事项

- 所有 SVN 提供者实现相同的接口，可以互换使用
- 优雅降级机制会自动选择最佳实现
- 如遇问题，查看日志了解详情
