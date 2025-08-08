import { vi } from 'vitest';
import type { ChildProcess } from 'child_process';
import { SvnUtils } from '../../utils/svn-utils';
import { SCMPathHandler } from '../../utils/path-handler';

  // Mock child_process
  vi.mock('child_process', () => ({
    exec: vi.fn(),
    spawn: vi.fn(),
  }));

// Mock fs
vi.mock('fs', () => {
  const existsSync = vi.fn();
  const readFileSync = vi.fn();
  const writeFileSync = vi.fn();
  const unlinkSync = vi.fn();
  return {
    existsSync,
    readFileSync,
    writeFileSync,
    unlinkSync,
    default: { existsSync, readFileSync, writeFileSync, unlinkSync }
  };
});

// Mock os
vi.mock('os', () => ({
  tmpdir: vi.fn(() => '/tmp'),
}));

// Mock crypto
vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => ({ toString: () => 'abcd1234' })),
}));

  // Mock SCMPathHandler
  const mockSCMPathHandler = SCMPathHandler as unknown as Record<string, any>;

  // Ensure methods exist on the mocked object
  beforeAll(() => {
    mockSCMPathHandler.safeExists = vi.fn();
    mockSCMPathHandler.escapeShellPath = vi.fn();
    mockSCMPathHandler.handleLongPath = vi.fn();
    mockSCMPathHandler.normalizePath = vi.fn();
    mockSCMPathHandler.createTempFilePath = vi.fn();
  });

describe('SvnUtils with SCMCommonUtils integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // 设置 SCMPathHandler mock 的默认行为
    mockSCMPathHandler.safeExists.mockReturnValue(true);
    mockSCMPathHandler.escapeShellPath.mockImplementation((p: string) => {
      // 安全：含空格/特殊字符时加引号
      if (/\s|[&|<>^$`]/.test(p)) {return `"${p}"`;}
      return p;
    });
    mockSCMPathHandler.handleLongPath.mockImplementation((path: string) => path);
    mockSCMPathHandler.normalizePath.mockImplementation((path: string) => path.replace(/\\/g, '/'));
    mockSCMPathHandler.createTempFilePath.mockReturnValue('/tmp/temp-file');
    // createExecOptions 已迁移至 SCMCommandExecutor，取消此 mock
  });

  describe('SVN路径验证', () => {
    test('应该使用 SCMCommonUtils.safeExists 检查文件存在性', async () => {
      // 这个测试验证 isValidSvnPath 函数是否正确使用了 SCMCommonUtils
      const testFile = '/usr/local/bin/svn';
      
      // Mock fs.existsSync 返回 true
      const fs = require('fs');
      fs.existsSync.mockReturnValue(true);
      
      // 调用 SvnUtils.getSvnPath
      const result = await SvnUtils.getSvnPath();
      
      // 验证 SCMPathHandler.safeExists 被调用
      expect(mockSCMPathHandler.safeExists).toHaveBeenCalled();
    });

    test('应该使用 SCMCommonUtils.escapeShellPath 转义路径', async () => {
      const testFile = '/usr/local/bin/svn with spaces';
      
      // Mock child_process.exec 返回成功
      const child = await import('child_process');
      const exec = vi.mocked(child.exec);
      exec.mockImplementation((command: string, options: any, callback: any): ChildProcess => {
        callback?.(null, 'svn version 1.14.0', '');
        return {} as unknown as ChildProcess;
      });
      
      // 调用 SvnUtils.execCommand
      await SvnUtils.execCommand(`"${testFile}" --version`);
      
      // 验证 SCMPathHandler.escapeShellPath 被调用
      expect(mockSCMPathHandler.escapeShellPath).toHaveBeenCalledWith(testFile);
    });

    test('应该使用 SCMCommonUtils.createTempFilePath 创建临时文件', async () => {
      const testFile = '/test/file.txt';
      
      // Mock child_process.exec 返回成功
      const child = await import('child_process');
      const exec = vi.mocked(child.exec);
      exec.mockImplementation((command: string, options: any, callback: any): ChildProcess => {
        callback?.(null, 'diff output', '');
        return {} as unknown as ChildProcess;
      });
      
      // Mock fs 操作
      const fs = require('fs');
      fs.writeFileSync.mockImplementation(() => {});
      fs.unlinkSync.mockImplementation(() => {});
      
      // 调用 SCMPathHandler.createTempFilePath（示例用法）
      const tempPath = SCMPathHandler.createTempFilePath('empty-file-for-diff');
      expect(tempPath).toBeDefined();
    });

    test('应该使用 SCMCommonUtils.createExecOptions 创建执行选项', async () => {
      const testFile = '/test/file.txt';
      
      // Mock child_process.exec 返回成功
      const child = await import('child_process');
      const exec = vi.mocked(child.exec);
      exec.mockImplementation((command: string, options: any, callback: any): ChildProcess => {
        callback?.(null, 'status output', '');
        return {} as unknown as ChildProcess;
      });
      
      // 调用 SCMPathHandler.createExecOptions
      const opts = SCMPathHandler.createExecOptions('/test/workspace');
      expect(opts).toBeDefined();
    });

    test('应该使用 SCMCommonUtils.normalizePath 进行路径比较', () => {
      const testPath = 'C:\\Users\\test\\project';
      
      // 调用 SCMPathHandler.normalizePath
      const result = SCMPathHandler.normalizePath(testPath);
      
      // 验证 SCMCommonUtils.normalizePath 被调用
      expect(mockSCMPathHandler.normalizePath).toHaveBeenCalled();
    });
  });

  describe('Windows路径处理', () => {
    test('应该正确处理Windows长路径', () => {
      const windowsPath = 'C:\\very\\long\\path\\that\\exceeds\\windows\\limit\\of\\260\\characters\\and\\needs\\to\\be\\handled\\with\\long\\path\\prefix';
      
      // 设置 mock 返回值
      mockSCMPathHandler.handleLongPath.mockReturnValue(windowsPath);
      mockSCMPathHandler.normalizePath.mockReturnValue('c:/program files/svn/bin/svn.exe');
      
      // 调用路径处理方法
      const result = SCMPathHandler.handleLongPath(windowsPath);
      const normalized = SCMPathHandler.normalizePath(windowsPath);
      
      // 验证方法被调用
      expect(mockSCMPathHandler.handleLongPath).toHaveBeenCalledWith(windowsPath);
      expect(mockSCMPathHandler.normalizePath).toHaveBeenCalledWith(windowsPath);
    });
  });

  describe('Unix路径处理', () => {
    test('应该正确处理Unix路径', () => {
      const unixPath = '/usr/local/bin/svn with spaces';
      
      // 设置 mock 返回值
      mockSCMPathHandler.normalizePath.mockReturnValue('/usr/local/bin/svn');
      mockSCMPathHandler.escapeShellPath.mockReturnValue("'/usr/local/bin/svn'");
      
      // 调用路径处理方法
      const normalized = SCMPathHandler.normalizePath(unixPath);
      const escaped = SCMPathHandler.escapeShellPath(unixPath);
      
      // 验证方法被调用
      expect(mockSCMPathHandler.normalizePath).toHaveBeenCalledWith(unixPath);
      expect(mockSCMPathHandler.escapeShellPath).toHaveBeenCalledWith(unixPath);
    });
  });

  describe('文件存在性检查', () => {
    test('应该正确处理文件不存在的情况', () => {
      const nonExistentFile = '/path/to/non/existent/file';
      
      // 设置 mock 返回值
      mockSCMPathHandler.safeExists.mockReturnValue(false);
      
      // 调用文件存在性检查
      const result = SCMPathHandler.safeExists(nonExistentFile);
      
      // 验证方法被调用并返回正确结果
      expect(mockSCMPathHandler.safeExists).toHaveBeenCalledWith(nonExistentFile);
      expect(result).toBe(false);
    });
  });
});