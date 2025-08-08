# SVN Provider 重构测试计划

## 测试目标

确保重构后的SVN Provider代码保持原有功能的完整性和正确性，特别是验证以下方面：

1. 路径处理的跨平台兼容性
2. 文件差异获取功能
3. 提交操作功能
4. 日志获取和解析功能
5. 提交信息处理功能

## 测试环境

为确保跨平台兼容性，测试应在以下环境中进行：

- Windows 10/11
- macOS (Intel和Apple Silicon)
- Linux (Ubuntu/Debian)

## 测试类型

### 1. 单元测试

#### SvnProviderBase 类测试

```typescript
// src/scm/__tests__/unit/svn-provider-base.test.ts
import { SvnProviderBase } from '../../svn-provider-base';
import * as assert from 'assert';
import * as sinon from 'sinon';

// 创建一个具体实现类用于测试
class TestSvnProvider extends SvnProviderBase {
  async commit(message: string, files?: string[]): Promise<void> {
    // 测试实现
  }
  
  async setCommitInput(message: string): Promise<void> {
    // 测试实现
  }
  
  async getCommitInput(): Promise<string> {
    return "";
  }
  
  async startStreamingInput(message: string): Promise<void> {
    // 测试实现
  }
}

describe('SvnProviderBase', () => {
  let provider: TestSvnProvider;
  let execStub: sinon.SinonStub;
  
  beforeEach(() => {
    // 设置测试环境
    provider = new TestSvnProvider('/test/path');
    execStub = sinon.stub(childProcess, 'exec');
  });
  
  afterEach(() => {
    // 清理测试环境
    sinon.restore();
  });
  
  describe('init()', () => {
    it('应该正确初始化SVN路径', async () => {
      // 测试代码
    });
    
    it('应该处理初始化错误', async () => {
      // 测试代码
    });
  });
  
  describe('getDiff()', () => {
    it('应该获取指定文件的差异', async () => {
      // 测试代码
    });
    
    it('应该获取所有文件的差异', async () => {
      // 测试代码
    });
    
    it('应该处理新文件的差异', async () => {
      // 测试代码
    });
  });
  
  // 更多测试...
});
```

#### SvnUtils 类测试

```typescript
// src/scm/__tests__/unit/svn-utils.test.ts
import { SvnUtils } from '../../svn-utils';
import * as assert from 'assert';
import * as sinon from 'sinon';

describe('SvnUtils', () => {
  let execStub: sinon.SinonStub;
  
  beforeEach(() => {
    execStub = sinon.stub(childProcess, 'exec');
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('detectSvnPath()', () => {
    it('应该检测配置中的SVN路径', async () => {
      // 测试代码
    });
    
    it('应该检测系统中的SVN路径', async () => {
      // 测试代码
    });
    
    it('应该处理未找到SVN的情况', async () => {
      // 测试代码
    });
  });
  
  describe('parseSvnLog()', () => {
    it('应该正确解析SVN日志', () => {
      // 测试代码
    });
    
    it('应该处理空日志', () => {
      // 测试代码
    });
    
    it('应该处理格式不正确的日志', () => {
      // 测试代码
    });
  });
  
  // 更多测试...
});
```

### 2. 集成测试

```typescript
// src/scm/__tests__/integration/svn-provider.integration.test.ts
import { SvnProvider } from '../../svn-provider';
import { CliSvnProvider } from '../../cli-svn-provider';
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

describe('SVN Provider集成测试', () => {
  // 测试前准备SVN测试仓库
  
  describe('SvnProvider', () => {
    it('应该能获取文件差异', async () => {
      // 测试代码
    });
    
    it('应该能提交更改', async () => {
      // 测试代码
    });
    
    // 更多测试...
  });
  
  describe('CliSvnProvider', () => {
    it('应该能获取文件差异', async () => {
      // 测试代码
    });
    
    it('应该能提交更改', async () => {
      // 测试代码
    });
    
    // 更多测试...
  });
});
```

### 3. 跨平台测试

```typescript
// src/scm/__tests__/cross-platform/path-handling.test.ts
import { ImprovedPathUtils } from '../../utils/improved-path-utils';
import * as assert from 'assert';
import * as os from 'os';

describe('跨平台路径处理测试', () => {
  describe('Windows环境', () => {
    // 模拟Windows环境
    
    it('应该正确处理Windows路径分隔符', () => {
      // 测试代码
    });
    
    it('应该正确处理Windows长路径', () => {
      // 测试代码
    });
    
    // 更多测试...
  });
  
  describe('Unix环境', () => {
    // 模拟Unix环境
    
    it('应该正确处理Unix路径分隔符', () => {
      // 测试代码
    });
    
    it('应该正确处理符号链接', () => {
      // 测试代码
    });
    
    // 更多测试...
  });
});
```

## 手动测试清单

除了自动化测试外，还应进行以下手动测试：

1. **基本功能测试**
   - [ ] 初始化SVN Provider
   - [ ] 获取文件差异
   - [ ] 提交更改
   - [ ] 获取提交日志
   - [ ] 设置提交信息

2. **特殊情况测试**
   - [ ] 包含特殊字符的文件路径
   - [ ] 非ASCII字符的文件路径
   - [ ] 超长文件路径
   - [ ] 空白字符的文件路径

3. **错误处理测试**
   - [ ] SVN命令不可用
   - [ ] 权限不足
   - [ ] 网络连接问题

## 测试报告模板

```
# SVN Provider重构测试报告

## 测试环境
- 操作系统: [操作系统版本]
- Node.js版本: [Node.js版本]
- VS Code版本: [VS Code版本]
- SVN版本: [SVN版本]

## 测试结果摘要
- 通过测试: [数量]
- 失败测试: [数量]
- 跳过测试: [数量]

## 详细测试结果
[详细测试结果]

## 发现的问题
[问题列表]

## 结论
[结论]
```

## 测试时间表

1. 单元测试: 1天
2. 集成测试: 2天
3. 跨平台测试: 2天
4. 手动测试: 1天
5. 问题修复和回归测试: 2天

总计: 8天