# SCM测试维护文档

## 概述

本文档提供了SCM模块测试的维护指南，包括日常维护任务、故障排除、性能优化和最佳实践。

## 维护职责

### 开发团队职责

#### 每日任务
- [ ] 检查CI/CD流水线状态
- [ ] 修复失败的测试
- [ ] 审查新增的测试代码
- [ ] 监控测试执行时间

#### 每周任务
- [ ] 分析测试覆盖率报告
- [ ] 识别和修复不稳定的测试
- [ ] 更新过时的测试数据
- [ ] 清理未使用的测试工具

#### 每月任务
- [ ] 评估测试架构效率
- [ ] 更新测试依赖和工具
- [ ] 重构重复的测试代码
- [ ] 培训新团队成员

### 质量保证职责

#### 持续监控
- [ ] 监控覆盖率趋势
- [ ] 跟踪测试质量指标
- [ ] 识别测试盲点
- [ ] 验证测试有效性

#### 定期审查
- [ ] 审查测试策略
- [ ] 评估测试工具选择
- [ ] 检查测试文档完整性
- [ ] 验证CI/CD配置

## 维护流程

### 1. 测试失败处理流程

#### 步骤1: 快速诊断
```bash
# 检查失败的测试
npm run test -- --reporter=verbose --no-coverage

# 运行特定失败的测试
npm run test -- --run -t "失败的测试名称"
```

#### 步骤2: 问题分类
- **环境问题**: Mock配置、依赖版本
- **代码问题**: 逻辑错误、API变更
- **测试问题**: 测试逻辑错误、数据过时
- **基础设施问题**: CI/CD配置、网络问题

#### 步骤3: 修复验证
```bash
# 本地验证修复
npm run test src/scm

# 验证覆盖率不降低
npm run test -- --coverage

# 检查相关测试
npm run test -- --related
```

#### 步骤4: 文档更新
- 更新故障排除文档
- 记录修复方案
- 更新最佳实践

### 2. 覆盖率维护流程

#### 监控覆盖率趋势
```bash
# 生成覆盖率报告
npm run test -- --coverage --reporter=html

# 检查覆盖率阈值
node scripts/check-coverage-thresholds.js --detailed

# 分析未覆盖代码
open coverage/index.html
```

#### 提升覆盖率策略
1. **识别未覆盖代码**
   ```bash
   # 查看详细覆盖率报告
   npm run test -- --coverage --reporter=verbose
   ```

2. **优先级排序**
   - 核心业务逻辑 (高优先级)
   - 错误处理路径 (高优先级)
   - 边界条件 (中优先级)
   - 工具函数 (低优先级)

3. **添加测试用例**
   ```typescript
   // 为未覆盖的分支添加测试
   it('应该处理错误情况', () => {
     expect(() => method(invalidInput)).toThrow();
   });
   ```

### 3. 性能维护流程

#### 监控测试性能
```bash
# 分析测试执行时间
npm run test -- --reporter=verbose | grep "Duration"

# 识别慢速测试
npm run test -- --reporter=json > test-results.json
node -e "
  const results = require('./test-results.json');
  const slowTests = results.testResults
    .filter(test => test.duration > 1000)
    .sort((a, b) => b.duration - a.duration);
  console.log('Slow tests:', slowTests);
"
```

#### 优化策略
1. **并行化测试**
   ```typescript
   describe.concurrent('可并行的测试', () => {
     it.concurrent('测试1', async () => {});
     it.concurrent('测试2', async () => {});
   });
   ```

2. **优化Mock设置**
   ```typescript
   // 重用Mock实例
   let mockProvider: GitProvider;
   
   beforeAll(() => {
     mockProvider = createMockGitProvider();
   });
   
   beforeEach(() => {
     vi.clearAllMocks();
   });
   ```

3. **减少重复设置**
   ```typescript
   // 使用测试工厂
   const createTestContext = () => ({
     provider: createMockProvider(),
     testData: generateTestData()
   });
   ```

## 故障排除指南

### 常见问题及解决方案

#### 1. 测试超时问题

**症状**:
```
Error: Test timed out in 10000ms
```

**诊断步骤**:
```bash
# 检查异步操作
npm run test -- --run -t "超时的测试" --reporter=verbose

# 增加调试输出
DEBUG=true npm run test -- --run -t "超时的测试"
```

**解决方案**:
```typescript
// 方案1: 增加超时时间
it('长时间运行的测试', async () => {
  // 测试逻辑
}, 30000);

// 方案2: 优化异步操作
it('优化的测试', async () => {
  const promise = provider.method();
  await expect(promise).resolves.toBeDefined();
});

// 方案3: 使用假定时器
it('使用假定时器', () => {
  vi.useFakeTimers();
  // 测试逻辑
  vi.runAllTimers();
  vi.useRealTimers();
});
```

#### 2. Mock未生效问题

**症状**:
```
TypeError: Cannot read properties of undefined
```

**诊断步骤**:
```typescript
// 检查Mock设置
console.log('Mock state:', vi.mocked(mockFunction).mock.calls);

// 验证Mock路径
console.log('Module path:', require.resolve('module-path'));
```

**解决方案**:
```typescript
// 方案1: 确保Mock在正确位置
vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/mock' } }]
  }
}));

// 方案2: 使用动态Mock
vi.mock('module', () => ({
  default: vi.fn(),
  namedExport: vi.fn()
}));

// 方案3: 手动Mock
const mockModule = {
  method: vi.fn()
};
vi.doMock('module', () => mockModule);
```

#### 3. 覆盖率不准确问题

**症状**:
- 覆盖率报告显示未覆盖，但代码已测试
- 覆盖率突然下降

**诊断步骤**:
```bash
# 检查覆盖率配置
cat vitest.config.mts | grep -A 10 coverage

# 验证测试文件包含
npm run test -- --coverage --reporter=verbose

# 检查忽略的文件
ls coverage/lcov-report/
```

**解决方案**:
```typescript
// 更新覆盖率配置
export default defineConfig({
  test: {
    coverage: {
      include: ['src/scm/**/*.ts'],
      exclude: [
        'src/scm/__tests__/**',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    }
  }
});
```

#### 4. CI/CD失败问题

**症状**:
- 本地测试通过，CI失败
- 间歇性CI失败

**诊断步骤**:
```bash
# 检查CI日志
gh run view --log

# 本地模拟CI环境
CI=true npm run test

# 检查环境差异
node -e "console.log(process.env)"
```

**解决方案**:
```yaml
# 更新CI配置
- name: Run tests with retry
  run: |
    npm run test || npm run test || npm run test
  
- name: Set test timeout
  run: npm run test -- --testTimeout=30000
```

### 调试技巧

#### 1. 详细日志输出
```typescript
// 添加调试信息
it('调试测试', () => {
  console.log('Input:', input);
  console.log('Mock calls:', mockFn.mock.calls);
  
  const result = method(input);
  
  console.log('Result:', result);
  expect(result).toBe(expected);
});
```

#### 2. 使用测试快照
```typescript
// 创建快照测试
it('应该匹配快照', () => {
  const result = complexMethod(input);
  expect(result).toMatchSnapshot();
});
```

#### 3. 条件断点
```typescript
// 在特定条件下暂停
it('条件调试', () => {
  if (process.env.DEBUG) {
    debugger;
  }
  expect(result).toBe(expected);
});
```

## 性能优化

### 测试执行优化

#### 1. 并行执行配置
```typescript
// vitest.config.mts
export default defineConfig({
  test: {
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: Math.max(1, Math.floor(require('os').cpus().length / 2)),
        minThreads: 1
      }
    }
  }
});
```

#### 2. 智能测试选择
```bash
# 只运行相关测试
npm run test -- --related src/scm/git-provider.ts

# 只运行变更的测试
npm run test -- --changed

# 运行失败的测试
npm run test -- --retry-failed
```

#### 3. 缓存优化
```bash
# 清理测试缓存
npm run test -- --clearCache

# 使用持久化缓存
npm run test -- --cache-dir=.vitest-cache
```

### Mock性能优化

#### 1. 重用Mock实例
```typescript
// 全局Mock设置
const globalMocks = {
  vscode: createVSCodeMock(),
  fs: createFsMock()
};

beforeAll(() => {
  Object.entries(globalMocks).forEach(([module, mock]) => {
    vi.doMock(module, () => mock);
  });
});
```

#### 2. 延迟Mock创建
```typescript
// 懒加载Mock
const getMockProvider = (() => {
  let instance: GitProvider;
  return () => {
    if (!instance) {
      instance = createMockGitProvider();
    }
    return instance;
  };
})();
```

#### 3. Mock清理优化
```typescript
// 选择性清理Mock
afterEach(() => {
  // 只清理必要的Mock
  vi.mocked(criticalMock).mockClear();
  // 不清理重用的Mock
});
```

## 质量指标监控

### 关键指标

#### 1. 覆盖率指标
- **行覆盖率**: ≥90%
- **函数覆盖率**: ≥95%
- **分支覆盖率**: ≥85%
- **语句覆盖率**: ≥90%

#### 2. 性能指标
- **测试执行时间**: <30秒
- **单个测试时间**: <1秒
- **CI构建时间**: <5分钟

#### 3. 稳定性指标
- **测试通过率**: ≥99%
- **间歇性失败率**: <1%
- **测试维护频率**: 每月<5次

### 监控工具

#### 1. 覆盖率趋势监控
```bash
# 生成趋势报告
node scripts/check-coverage-thresholds.js --detailed

# 查看历史趋势
cat coverage/trends.json | jq '.[-5:]'
```

#### 2. 性能监控
```bash
# 性能基准测试
npm run test -- --reporter=json > perf-baseline.json

# 性能回归检测
node scripts/performance-check.js perf-baseline.json
```

#### 3. 质量门禁
```bash
# 运行质量检查
npm run quality-gate

# 检查测试债务
npm run test-debt-analysis
```

## 最佳实践

### 测试编写最佳实践

#### 1. 测试结构
```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should handle normal case', () => {
      // Arrange
      const input = createTestInput();
      
      // Act
      const result = method(input);
      
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

#### 2. Mock策略
```typescript
// 使用工厂函数
const createMockProvider = (overrides = {}) => ({
  method: vi.fn(),
  ...overrides
});

// 类型安全的Mock
const mockProvider = createMockProvider() as jest.Mocked<Provider>;
```

#### 3. 测试数据管理
```typescript
// 使用构建器模式
class TestDataBuilder {
  private data = {};
  
  withProperty(value: any) {
    this.data.property = value;
    return this;
  }
  
  build() {
    return { ...this.data };
  }
}
```

### 维护最佳实践

#### 1. 定期重构
- 每月审查测试代码质量
- 识别和消除重复代码
- 更新过时的测试模式

#### 2. 文档维护
- 保持测试文档最新
- 记录重要的测试决策
- 更新故障排除指南

#### 3. 团队协作
- 代码审查包含测试代码
- 分享测试最佳实践
- 定期团队培训

## 应急响应

### 紧急情况处理

#### 1. 生产问题
```bash
# 快速验证修复
npm run test -- --run --reporter=verbose

# 回归测试
npm run test -- --coverage --reporter=json
```

#### 2. CI/CD中断
```bash
# 本地验证
CI=true npm run test

# 跳过不稳定测试
npm run test -- --skip-unstable
```

#### 3. 性能问题
```bash
# 性能分析
npm run test -- --reporter=verbose --no-coverage

# 临时禁用慢速测试
npm run test -- --exclude="**/*.slow.test.ts"
```

### 恢复流程

#### 1. 问题识别
- 收集错误信息
- 分析影响范围
- 确定优先级

#### 2. 快速修复
- 应用临时解决方案
- 验证修复效果
- 监控系统稳定性

#### 3. 根本原因分析
- 深入分析问题原因
- 制定长期解决方案
- 更新预防措施

## 总结

有效的测试维护需要：

1. **系统化的维护流程**
2. **持续的质量监控**
3. **快速的问题响应**
4. **团队协作和知识分享**

定期审查和更新本维护文档，确保其与实际维护需求保持一致。