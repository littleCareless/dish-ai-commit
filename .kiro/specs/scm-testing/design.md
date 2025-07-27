# SCM测试设计文档

## 概述

本设计文档描述了为SCM（源代码管理）模块创建完善测试套件的技术方案。测试套件将采用分层测试策略，包括单元测试、集成测试和端到端测试，确保SCM功能在各种场景下的可靠性。

## 架构

### 测试架构层次

```
测试架构
├── 单元测试层 (Unit Tests)
│   ├── SCM工厂类测试
│   ├── Git提供者测试
│   ├── SVN提供者测试
│   ├── CLI SVN提供者测试
│   ├── 作者服务测试
│   ├── 提交日志策略测试
│   └── SVN工具类测试
├── 集成测试层 (Integration Tests)
│   ├── SCM提供者与VS Code API集成测试
│   ├── 命令行工具集成测试
│   └── 配置管理集成测试
└── 端到端测试层 (E2E Tests)
    ├── 完整工作流测试
    └── 错误恢复测试
```

### 测试工具栈

- **测试框架**: Vitest (已配置)
- **模拟库**: Vitest内置的vi.mock
- **断言库**: Vitest内置的expect
- **覆盖率工具**: V8 coverage provider
- **测试环境**: Node.js环境

## 组件和接口

### 1. 测试工具类 (Test Utilities)

#### MockVSCodeAPI
```typescript
interface MockVSCodeAPI {
  workspace: {
    workspaceFolders: WorkspaceFolder[];
    getConfiguration: (section: string) => any;
  };
  window: {
    showErrorMessage: vi.Mock;
    showInformationMessage: vi.Mock;
    showInputBox: vi.Mock;
  };
  env: {
    clipboard: {
      writeText: vi.Mock;
    };
  };
}
```

#### MockGitExtension
```typescript
interface MockGitExtension {
  getAPI: (version: number) => MockGitAPI;
}

interface MockGitAPI {
  repositories: MockGitRepository[];
}

interface MockGitRepository {
  inputBox: { value: string };
  commit: vi.Mock;
  log: vi.Mock;
  getConfig: vi.Mock;
  getGlobalConfig: vi.Mock;
}
```

#### MockSvnExtension
```typescript
interface MockSvnExtension {
  getAPI: () => MockSvnAPI;
}

interface MockSvnAPI {
  repositories: MockSvnRepository[];
}

interface MockSvnRepository {
  inputBox: { value: string };
  commitFiles: vi.Mock;
}
```

#### TestFileSystem
```typescript
class TestFileSystem {
  static createTempGitRepo(): string;
  static createTempSvnRepo(): string;
  static createMockWorkspace(type: 'git' | 'svn' | 'none'): string;
  static cleanup(path: string): void;
}
```

#### CommandExecutor
```typescript
class MockCommandExecutor {
  static mockExec(command: string, result: { stdout: string; stderr?: string }): void;
  static mockExecError(command: string, error: Error): void;
  static clearMocks(): void;
}
```

### 2. 测试数据生成器

#### GitTestData
```typescript
class GitTestData {
  static generateDiffOutput(files: string[]): string;
  static generateCommitLog(count: number): string[];
  static generateBranchList(): string[];
  static generateGitConfig(): Record<string, string>;
}
```

#### SvnTestData
```typescript
class SvnTestData {
  static generateSvnDiffOutput(files: string[]): string;
  static generateSvnLogXml(count: number): string;
  static generateSvnInfo(): string;
  static generateSvnAuthOutput(): string;
}
```

### 3. 测试套件结构

#### 单元测试组织
```
src/scm/__tests__/
├── unit/
│   ├── scm-provider.test.ts
│   ├── git-provider.test.ts
│   ├── svn-provider.test.ts
│   ├── cli-svn-provider.test.ts
│   ├── author-service.test.ts
│   ├── commit-log-strategy.test.ts
│   └── svn-utils.test.ts
├── integration/
│   ├── scm-factory-integration.test.ts
│   ├── git-vscode-integration.test.ts
│   └── svn-vscode-integration.test.ts
├── e2e/
│   └── scm-workflow.test.ts
└── helpers/
    ├── test-utilities.ts
    ├── mock-factories.ts
    └── test-data-generators.ts
```

## 数据模型

### 测试配置模型
```typescript
interface TestConfig {
  mockWorkspacePath: string;
  scmType: 'git' | 'svn';
  hasExtension: boolean;
  hasCommandLine: boolean;
}

interface TestScenario {
  name: string;
  config: TestConfig;
  expectedBehavior: string;
  setupSteps: string[];
  assertions: string[];
}
```

### 测试结果模型
```typescript
interface TestResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: Error;
  coverage?: CoverageInfo;
}

interface CoverageInfo {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}
```

## 错误处理

### 测试错误分类
1. **设置错误**: 测试环境配置失败
2. **模拟错误**: Mock对象行为不正确
3. **断言错误**: 期望结果与实际结果不匹配
4. **超时错误**: 测试执行时间过长
5. **资源错误**: 临时文件或目录创建失败

### 错误处理策略
```typescript
class TestErrorHandler {
  static handleSetupError(error: Error, testName: string): void;
  static handleMockError(error: Error, mockName: string): void;
  static handleAssertionError(error: Error, assertion: string): void;
  static handleTimeoutError(testName: string, timeout: number): void;
  static handleResourceError(error: Error, resource: string): void;
}
```

## 测试策略

### 1. 单元测试策略

#### SCM工厂类测试
- **隔离性**: 每个测试用例独立运行，不依赖其他测试
- **模拟策略**: 模拟文件系统、VS Code API和命令行执行
- **覆盖场景**: 
  - Git仓库检测
  - SVN仓库检测
  - 混合仓库处理
  - 无仓库情况
  - 扩展可用性检测

#### Git提供者测试
- **API模拟**: 完整模拟VS Code Git扩展API
- **命令行模拟**: 模拟git命令执行结果
- **状态管理**: 测试输入框状态变化
- **异步处理**: 测试Promise-based方法

#### SVN提供者测试
- **初始化测试**: 验证SVN路径检测和版本验证
- **配置测试**: 测试环境配置加载
- **命令执行**: 模拟SVN命令输出
- **错误恢复**: 测试认证失败和重试机制

### 2. 集成测试策略

#### VS Code API集成
- **扩展依赖**: 测试与Git/SVN扩展的交互
- **配置集成**: 验证配置变更的响应
- **事件处理**: 测试扩展事件的处理

#### 命令行集成
- **命令可用性**: 验证git/svn命令的检测
- **输出解析**: 测试命令输出的正确解析
- **错误处理**: 验证命令执行失败的处理

### 3. 性能测试策略

#### 大文件处理
```typescript
describe('Performance Tests', () => {
  it('should handle large diff output efficiently', async () => {
    const largeFiles = generateLargeFileList(1000);
    const startTime = Date.now();
    await gitProvider.getDiff(largeFiles);
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000); // 5秒内完成
  });
});
```

#### 内存使用
```typescript
it('should not leak memory during repeated operations', async () => {
  const initialMemory = process.memoryUsage().heapUsed;
  
  for (let i = 0; i < 100; i++) {
    await gitProvider.getDiff();
  }
  
  global.gc?.(); // 强制垃圾回收
  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = finalMemory - initialMemory;
  
  expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 不超过10MB
});
```

## 测试执行计划

### 1. 测试分组
```typescript
// 快速测试组 - 单元测试
describe.concurrent('Unit Tests', () => {
  // 并行执行的单元测试
});

// 慢速测试组 - 集成测试
describe.sequential('Integration Tests', () => {
  // 顺序执行的集成测试
});

// 端到端测试组
describe('E2E Tests', () => {
  // 完整流程测试
});
```

### 2. 测试环境配置
```typescript
// vitest.config.ts 扩展
export default defineConfig({
  test: {
    include: ["src/scm/__tests__/**/*.test.ts"],
    setupFiles: ["src/scm/__tests__/setup.ts"],
    environment: "node",
    globals: true,
    testTimeout: 10000,
    hookTimeout: 5000,
    teardownTimeout: 5000,
  },
});
```

### 3. CI/CD集成
```yaml
# GitHub Actions 示例
name: SCM Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run SCM tests
        run: npm run test:scm
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## 质量保证

### 1. 代码覆盖率目标
- **行覆盖率**: ≥ 90%
- **函数覆盖率**: ≥ 95%
- **分支覆盖率**: ≥ 85%
- **语句覆盖率**: ≥ 90%

### 2. 测试质量指标
- **测试可靠性**: 测试通过率 ≥ 99%
- **测试速度**: 单元测试套件执行时间 < 30秒
- **测试维护性**: 每个测试文件行数 < 500行
- **测试可读性**: 每个测试用例包含清晰的描述和断言

### 3. 持续改进
- **定期审查**: 每月审查测试覆盖率和质量指标
- **重构测试**: 识别和重构重复的测试代码
- **更新测试**: 随着功能变更及时更新测试用例
- **性能监控**: 监控测试执行时间，优化慢速测试