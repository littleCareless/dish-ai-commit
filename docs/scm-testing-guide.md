# SCM测试运行指南

## 概述

本指南提供了SCM（源代码管理）模块测试的完整运行和维护说明。SCM模块支持Git和SVN两种版本控制系统，包含差异获取、提交操作、日志查询等核心功能。

## 测试架构

### 测试分层结构

```
src/scm/__tests__/
├── unit/                    # 单元测试
│   ├── git-provider.test.ts
│   ├── svn-provider.test.ts
│   ├── cli-svn-provider.test.ts
│   ├── scm-factory.test.ts
│   ├── author-service.test.ts
│   ├── commit-log-strategy.test.ts
│   └── svn-utils.test.ts
├── integration/             # 集成测试
│   ├── scm-factory-integration.test.ts
│   ├── git-vscode-integration.test.ts
│   └── svn-vscode-integration.test.ts
├── e2e/                     # 端到端测试
│   └── scm-workflow.test.ts
└── helpers/                 # 测试工具
    ├── test-utilities.ts
    ├── mock-factories.ts
    ├── test-data-generators.ts
    └── mock-command-executor.ts
```

### 测试工具栈

- **测试框架**: Vitest
- **模拟库**: Vitest内置的vi.mock
- **断言库**: Vitest内置的expect
- **覆盖率工具**: V8 coverage provider
- **测试环境**: Node.js环境

## 快速开始

### 环境准备

1. **安装依赖**
   ```bash
   npm install
   ```

2. **验证测试环境**
   ```bash
   npm run test -- --version
   ```

### 运行测试

#### 运行所有测试
```bash
# 运行所有测试
npm run test

# 运行SCM相关测试
npm run test src/scm

# 运行特定测试文件
npm run test src/scm/__tests__/unit/git-provider.test.ts
```

#### 运行测试并生成覆盖率报告
```bash
# 生成覆盖率报告
npm run test -- --coverage

# 生成HTML覆盖率报告
npm run test -- --coverage --reporter=html

# 运行测试并监听文件变化
npm run test -- --watch
```

#### 运行特定类型的测试
```bash
# 只运行单元测试
npm run test src/scm/__tests__/unit

# 只运行集成测试
npm run test src/scm/__tests__/integration

# 只运行端到端测试
npm run test src/scm/__tests__/e2e
```

## 测试配置

### Vitest配置 (vitest.config.mts)

```typescript
export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    setupFiles: ["src/scm/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/scm/**/*.ts"],
      exclude: [
        "src/scm/__tests__/**",
        "**/*.d.ts",
        "**/*.config.*"
      ],
      thresholds: {
        lines: 90,
        functions: 95,
        branches: 85,
        statements: 90
      }
    },
    environment: "node",
    globals: true,
    testTimeout: 10000,
    hookTimeout: 5000,
    teardownTimeout: 5000,
  },
});
```

### 测试环境设置 (src/scm/__tests__/setup.ts)

```typescript
import { vi } from 'vitest';

// 全局Mock设置
global.vi = vi;

// VS Code API Mock
vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/mock/workspace' } }],
    textDocuments: [],
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      has: vi.fn(),
      inspect: vi.fn(),
      update: vi.fn()
    }))
  },
  window: {
    showErrorMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    showInputBox: vi.fn()
  },
  env: {
    clipboard: {
      writeText: vi.fn()
    }
  },
  Uri: {
    file: vi.fn((path) => ({ fsPath: path }))
  }
}));

// 文件系统Mock
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn()
}));

// 子进程Mock
vi.mock('child_process', () => ({
  exec: vi.fn()
}));
```

## 编写测试

### 测试命名约定

```typescript
describe('ComponentName - 功能分组', () => {
  describe('methodName - 方法测试', () => {
    it('应该在正常情况下返回预期结果', () => {
      // 测试正常流程
    });

    it('应该在错误情况下抛出异常', () => {
      // 测试错误处理
    });

    it('应该处理边界条件', () => {
      // 测试边界情况
    });
  });
});
```

### 测试结构模式 (AAA模式)

```typescript
it('应该成功获取Git差异', async () => {
  // Arrange - 准备测试数据和Mock
  const mockFiles = ['file1.ts', 'file2.ts'];
  const expectedDiff = 'mock diff output';
  MockCommandExecutor.mockExec('git diff', { stdout: expectedDiff });

  // Act - 执行被测试的方法
  const result = await gitProvider.getDiff(mockFiles);

  // Assert - 验证结果
  expect(result).toBe(expectedDiff);
  expect(MockCommandExecutor.exec).toHaveBeenCalledWith(
    expect.stringContaining('git diff')
  );
});
```

### Mock使用指南

#### 1. 使用Mock工厂

```typescript
import { createMockGitProvider, createMockSvnProvider } from '../helpers/mock-factories';

describe('SCMFactory', () => {
  it('应该创建Git提供者', () => {
    const mockGitProvider = createMockGitProvider();
    // 使用mockGitProvider进行测试
  });
});
```

#### 2. 命令执行Mock

```typescript
import { MockCommandExecutor } from '../helpers/mock-command-executor';

beforeEach(() => {
  MockCommandExecutor.clearMocks();
});

it('应该执行git命令', async () => {
  MockCommandExecutor.mockExec('git status', { stdout: 'clean' });
  
  const result = await gitProvider.getStatus();
  
  expect(result).toBe('clean');
});
```

#### 3. 测试数据生成

```typescript
import { GitTestData, SvnTestData } from '../helpers/test-data-generators';

it('应该解析Git日志', () => {
  const mockLog = GitTestData.generateCommitLog(5);
  const result = gitProvider.parseCommitLog(mockLog);
  
  expect(result).toHaveLength(5);
});
```

## 测试最佳实践

### 1. 测试隔离

```typescript
describe('GitProvider', () => {
  let gitProvider: GitProvider;
  let mockGitExtension: any;

  beforeEach(() => {
    // 每个测试前重新创建实例
    mockGitExtension = createMockGitExtension();
    gitProvider = new GitProvider(mockGitExtension);
  });

  afterEach(() => {
    // 清理Mock状态
    vi.clearAllMocks();
  });
});
```

### 2. 异步测试

```typescript
it('应该处理异步操作', async () => {
  const promise = gitProvider.getDiff(['file.ts']);
  
  // 验证Promise状态
  expect(promise).toBeInstanceOf(Promise);
  
  // 等待结果
  const result = await promise;
  expect(result).toBeDefined();
});
```

### 3. 错误测试

```typescript
it('应该处理命令执行失败', async () => {
  MockCommandExecutor.mockExecError('git diff', new Error('Command failed'));
  
  await expect(gitProvider.getDiff(['file.ts']))
    .rejects
    .toThrow('Command failed');
});
```

### 4. 性能测试

```typescript
it('应该在合理时间内完成', async () => {
  const startTime = Date.now();
  
  await gitProvider.getDiff(largeFileList);
  
  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(5000); // 5秒内完成
});
```

## 调试测试

### 1. 运行单个测试

```bash
# 运行特定测试
npm run test -- --run -t "应该成功获取Git差异"

# 运行特定文件的测试
npm run test src/scm/__tests__/unit/git-provider.test.ts
```

### 2. 调试模式

```bash
# 启用调试输出
npm run test -- --reporter=verbose

# 显示详细错误信息
npm run test -- --reporter=verbose --no-coverage
```

### 3. 测试超时调试

```typescript
it('长时间运行的测试', async () => {
  // 增加超时时间
  await longRunningOperation();
}, 30000); // 30秒超时
```

## 持续集成

### GitHub Actions配置

创建 `.github/workflows/scm-tests.yml`:

```yaml
name: SCM Tests

on:
  push:
    branches: [ main, develop ]
    paths: [ 'src/scm/**' ]
  pull_request:
    branches: [ main ]
    paths: [ 'src/scm/**' ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18, 20]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run SCM tests
      run: npm run test src/scm -- --coverage --reporter=json
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/coverage-final.json
        flags: scm
        name: scm-coverage
    
    - name: Check coverage thresholds
      run: |
        npm run test src/scm -- --coverage --reporter=json > coverage-report.json
        node scripts/check-coverage-thresholds.js
```

### 覆盖率门禁

创建 `scripts/check-coverage-thresholds.js`:

```javascript
const fs = require('fs');
const path = require('path');

const coverageFile = path.join(__dirname, '../coverage/coverage-summary.json');
const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));

const thresholds = {
  lines: 90,
  functions: 95,
  branches: 85,
  statements: 90
};

let failed = false;

Object.entries(thresholds).forEach(([metric, threshold]) => {
  const actual = coverage.total[metric].pct;
  if (actual < threshold) {
    console.error(`❌ ${metric} coverage ${actual}% is below threshold ${threshold}%`);
    failed = true;
  } else {
    console.log(`✅ ${metric} coverage ${actual}% meets threshold ${threshold}%`);
  }
});

if (failed) {
  process.exit(1);
}
```

## 故障排除

### 常见问题

#### 1. 测试超时
```
Error: Test timed out in 10000ms
```

**解决方案**:
- 检查异步操作是否正确等待
- 增加测试超时时间
- 优化测试逻辑，避免不必要的等待

#### 2. Mock未生效
```
TypeError: Cannot read properties of undefined
```

**解决方案**:
- 确认Mock在测试执行前已设置
- 检查Mock路径是否正确
- 验证Mock返回值格式

#### 3. 模块未找到
```
Error: Cannot find module '../../config/configuration-manager'
```

**解决方案**:
- 检查模块路径是否正确
- 确认模块已正确导出
- 添加必要的Mock配置

### 调试技巧

#### 1. 添加调试输出
```typescript
it('调试测试', () => {
  console.log('Debug info:', mockData);
  expect(result).toBe(expected);
});
```

#### 2. 使用断点调试
```typescript
it('断点调试', () => {
  debugger; // 在浏览器开发工具中暂停
  expect(result).toBe(expected);
});
```

#### 3. 检查Mock调用
```typescript
it('检查Mock调用', () => {
  expect(mockFunction).toHaveBeenCalledTimes(1);
  expect(mockFunction).toHaveBeenCalledWith(expectedArgs);
});
```

## 维护指南

### 定期维护任务

#### 每周
- [ ] 检查测试通过率
- [ ] 审查失败的测试
- [ ] 更新过时的测试数据

#### 每月
- [ ] 分析覆盖率报告
- [ ] 识别未测试的代码路径
- [ ] 重构重复的测试代码
- [ ] 更新测试文档

#### 每季度
- [ ] 评估测试架构
- [ ] 优化测试性能
- [ ] 更新测试工具和依赖
- [ ] 培训团队成员

### 代码变更时的测试更新

#### 添加新功能
1. 编写对应的单元测试
2. 更新集成测试
3. 验证覆盖率不降低
4. 更新测试文档

#### 修复Bug
1. 编写重现Bug的测试
2. 修复代码使测试通过
3. 验证相关测试仍然通过
4. 添加回归测试

#### 重构代码
1. 确保所有测试通过
2. 重构测试代码以匹配新结构
3. 验证覆盖率保持不变
4. 更新相关文档

## 性能优化

### 测试执行优化

#### 1. 并行执行
```typescript
// vitest.config.mts
export default defineConfig({
  test: {
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 2
      }
    }
  }
});
```

#### 2. 测试分组
```typescript
describe.concurrent('并行测试组', () => {
  it.concurrent('测试1', async () => {
    // 可以并行执行的测试
  });
  
  it.concurrent('测试2', async () => {
    // 可以并行执行的测试
  });
});
```

#### 3. 资源清理
```typescript
afterEach(() => {
  // 清理Mock状态
  vi.clearAllMocks();
  
  // 清理全局状态
  global.testState = undefined;
});
```

### Mock优化

#### 1. 重用Mock实例
```typescript
const mockGitProvider = createMockGitProvider();

beforeAll(() => {
  // 在所有测试前创建一次
});

beforeEach(() => {
  // 只重置Mock状态
  vi.clearAllMocks();
});
```

#### 2. 延迟Mock创建
```typescript
let mockProvider: GitProvider;

const getMockProvider = () => {
  if (!mockProvider) {
    mockProvider = createMockGitProvider();
  }
  return mockProvider;
};
```

## 总结

本指南提供了SCM模块测试的完整运行和维护说明。遵循这些最佳实践可以确保：

1. **高质量的测试代码**
2. **稳定的测试执行**
3. **有效的错误检测**
4. **持续的代码质量保证**

定期更新本指南以反映最新的测试实践和工具变化。如有问题或建议，请联系开发团队。