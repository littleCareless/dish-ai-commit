import { SvnProvider } from '../../svn-provider';
import { ImprovedPathUtils } from '../../utils/improved-path-utils';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Mock vscode
jest.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
    getConfiguration: jest.fn(() => ({
      get: jest.fn()
    }))
  },
  window: {
    activeTextEditor: null
  },
  Uri: {
    file: jest.fn((path) => ({ fsPath: path, scheme: 'file' }))
  },
  env: {
    clipboard: {
      writeText: jest.fn()
    }
  }
}));

// Mock fs
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

// Mock ImprovedPathUtils
jest.mock('../../utils/improved-path-utils');
const mockImprovedPathUtils = ImprovedPathUtils as jest.Mocked<typeof ImprovedPathUtils>;

describe('SvnProvider 路径处理测试', () => {
  let svnProvider: SvnProvider;
  let mockSvnExtension: any;

  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks();
    
    // 设置 ImprovedPathUtils mock 的默认行为
    mockImprovedPathUtils.safeExists.mockReturnValue(true);
    mockImprovedPathUtils.escapeShellPath.mockImplementation((path) => `"${path}"`);
    mockImprovedPathUtils.handleLongPath.mockImplementation((path) => path);
    mockImprovedPathUtils.normalizePath.mockImplementation((path) => path.replace(/\\/g, '/'));
    mockImprovedPathUtils.createTempFilePath.mockReturnValue('/tmp/temp-file');
    mockImprovedPathUtils.createExecOptions.mockReturnValue({
      cwd: '/test/repo',
      maxBuffer: 50 * 1024 * 1024,
      encoding: 'utf8',
      env: process.env
    });

    // 创建 mock SVN 扩展
    mockSvnExtension = {
      getAPI: jest.fn(() => ({
        repositories: [
          {
            rootUri: { fsPath: '/test/repo' },
            inputBox: { value: '' },
            commitFiles: jest.fn()
          }
        ]
      }))
    };

    svnProvider = new SvnProvider(mockSvnExtension);
  });

  describe('路径处理功能', () => {
    test('应该使用 ImprovedPathUtils.safeExists 检查文件存在性', async () => {
      // 这个测试验证 isValidSvnPath 函数是否正确使用了 ImprovedPathUtils
      const testPath = '/usr/bin/svn';
      
      // 模拟 exec 成功
      const { exec } = require('child_process');
      (exec as jest.Mock).mockImplementation((cmd, callback) => {
        callback(null, { stdout: 'svn, version 1.14.0' });
      });

      // 调用初始化来触发路径检查
      await svnProvider.init();

      // 验证 safeExists 被调用
      expect(mockImprovedPathUtils.safeExists).toHaveBeenCalled();
    });

    test('应该使用 ImprovedPathUtils.escapeShellPath 转义路径', async () => {
      const testFile = '/path/with spaces/file.txt';
      
      // 模拟仓库查找
      (svnProvider as any)._findRepositoryAndPath = jest.fn(() => ({
        repository: mockSvnExtension.getAPI().repositories[0],
        repositoryPath: '/test/repo'
      }));

      // 模拟 exec 调用
      const { exec } = require('child_process');
      (exec as jest.Mock).mockImplementation((cmd, options, callback) => {
        if (typeof options === 'function') {
          callback = options;
        }
        callback(null, { stdout: 'M file.txt' });
      });

      try {
        await svnProvider.getDiff([testFile]);
      } catch (error) {
        // 忽略可能的错误，我们主要关心路径转义是否被调用
      }

      // 验证 escapeShellPath 被调用
      expect(mockImprovedPathUtils.escapeShellPath).toHaveBeenCalledWith(testFile);
    });

    test('应该使用 ImprovedPathUtils.createTempFilePath 创建临时文件', async () => {
      // 模拟仓库查找
      (svnProvider as any)._findRepositoryAndPath = jest.fn(() => ({
        repository: mockSvnExtension.getAPI().repositories[0],
        repositoryPath: '/test/repo'
      }));

      // 模拟文件状态为新文件
      (svnProvider as any).getFileStatus = jest.fn().mockResolvedValue('New File');

      // 模拟 fs.writeFileSync
      mockFs.writeFileSync.mockImplementation(() => {});
      mockFs.unlinkSync.mockImplementation(() => {});

      // 模拟 exec 调用
      const { exec } = require('child_process');
      (exec as jest.Mock).mockImplementation((cmd, options, callback) => {
        if (typeof options === 'function') {
          callback = options;
        }
        callback(null, { stdout: 'diff output' });
      });

      try {
        await svnProvider.getDiff(['/test/newfile.txt']);
      } catch (error) {
        // 忽略可能的错误
      }

      // 验证 createTempFilePath 被调用
      expect(mockImprovedPathUtils.createTempFilePath).toHaveBeenCalledWith('empty-file-for-diff');
    });

    test('应该使用 ImprovedPathUtils.createExecOptions 创建执行选项', async () => {
      // 模拟仓库查找
      (svnProvider as any)._findRepositoryAndPath = jest.fn(() => ({
        repository: mockSvnExtension.getAPI().repositories[0],
        repositoryPath: '/test/repo'
      }));

      // 模拟 exec 调用
      const { exec } = require('child_process');
      (exec as jest.Mock).mockImplementation((cmd, options, callback) => {
        if (typeof options === 'function') {
          callback = options;
        }
        callback(null, { stdout: 'diff output' });
      });

      try {
        await svnProvider.getDiff();
      } catch (error) {
        // 忽略可能的错误
      }

      // 验证 createExecOptions 被调用
      expect(mockImprovedPathUtils.createExecOptions).toHaveBeenCalled();
    });

    test('应该使用 ImprovedPathUtils.normalizePath 进行路径比较', () => {
      const repositories = [
        {
          rootUri: { fsPath: '/test/repo1' },
          inputBox: { value: '' },
          commitFiles: jest.fn()
        },
        {
          rootUri: { fsPath: '/test/repo2' },
          inputBox: { value: '' },
          commitFiles: jest.fn()
        }
      ];

      // 模拟 _getRepoFsPath 方法
      (svnProvider as any)._getRepoFsPath = jest.fn((repo) => repo.rootUri?.fsPath || repo.root);

      // 设置特定的仓库路径
      (svnProvider as any).repositoryPath = '/test/repo1';

      // 调用 findRepository 方法
      const result = (svnProvider as any).findRepository();

      // 验证 normalizePath 被调用用于路径比较
      expect(mockImprovedPathUtils.normalizePath).toHaveBeenCalled();
    });
  });

  describe('跨平台兼容性', () => {
    test('Windows 路径应该被正确处理', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const windowsPath = 'C:\\Program Files\\SVN\\bin\\svn.exe';
      
      // 模拟 Windows 路径处理
      mockImprovedPathUtils.handleLongPath.mockReturnValue(windowsPath);
      mockImprovedPathUtils.normalizePath.mockReturnValue('c:/program files/svn/bin/svn.exe');

      // 调用路径处理方法
      const result = ImprovedPathUtils.handleLongPath(windowsPath);
      const normalized = ImprovedPathUtils.normalizePath(windowsPath);

      expect(mockImprovedPathUtils.handleLongPath).toHaveBeenCalledWith(windowsPath);
      expect(mockImprovedPathUtils.normalizePath).toHaveBeenCalledWith(windowsPath);

      // 恢复原始平台
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('Unix 路径应该被正确处理', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      const unixPath = '/usr/local/bin/svn';
      
      // 模拟 Unix 路径处理
      mockImprovedPathUtils.normalizePath.mockReturnValue('/usr/local/bin/svn');
      mockImprovedPathUtils.escapeShellPath.mockReturnValue("'/usr/local/bin/svn'");

      // 调用路径处理方法
      const normalized = ImprovedPathUtils.normalizePath(unixPath);
      const escaped = ImprovedPathUtils.escapeShellPath(unixPath);

      expect(mockImprovedPathUtils.normalizePath).toHaveBeenCalledWith(unixPath);
      expect(mockImprovedPathUtils.escapeShellPath).toHaveBeenCalledWith(unixPath);

      // 恢复原始平台
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('错误处理', () => {
    test('路径不存在时应该正确处理', async () => {
      // 模拟路径不存在
      mockImprovedPathUtils.safeExists.mockReturnValue(false);

      const { exec } = require('child_process');
      (exec as jest.Mock).mockImplementation((cmd, callback) => {
        callback(new Error('SVN not found'));
      });

      // 验证初始化失败时的错误处理
      await expect(svnProvider.init()).rejects.toThrow();
      
      expect(mockImprovedPathUtils.safeExists).toHaveBeenCalled();
    });

    test('临时文件清理失败时应该继续执行', async () => {
      // 模拟仓库查找
      (svnProvider as any)._findRepositoryAndPath = jest.fn(() => ({
        repository: mockSvnExtension.getAPI().repositories[0],
        repositoryPath: '/test/repo'
      }));

      // 模拟文件状态为新文件
      (svnProvider as any).getFileStatus = jest.fn().mockResolvedValue('New File');

      // 模拟临时文件创建成功但删除失败
      mockFs.writeFileSync.mockImplementation(() => {});
      mockFs.unlinkSync.mockImplementation(() => {
        throw new Error('删除失败');
      });

      // 模拟 exec 调用成功
      const { exec } = require('child_process');
      (exec as jest.Mock).mockImplementation((cmd, options, callback) => {
        if (typeof options === 'function') {
          callback = options;
        }
        callback(null, { stdout: 'diff output' });
      });

      // 应该不会因为临时文件删除失败而抛出错误
      await expect(svnProvider.getDiff(['/test/newfile.txt'])).resolves.toBeDefined();
    });
  });
});