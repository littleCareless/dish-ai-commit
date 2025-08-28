/**
 * Unit tests for StagedContentDetector
 * Tests staged content detection functionality, caching, and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

import { StagedContentDetector } from '../../staged-content-detector';
import {
  StagedDetectionResult,
  DiffTarget,
  DetectionErrorType,
  StagedDetectionError,
  DetectionOptions,
  RepositoryContext,
  RepositoryInfo
} from '../../staged-detector-types';

const execAsync = promisify(exec);

// Mock external dependencies
vi.mock('child_process');
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn().mockReturnValue({}),
  },
}));

const mockExec = vi.mocked(exec);
const mockVscode = vi.mocked(vscode);

describe('StagedContentDetector', () => {
  let detector: StagedContentDetector;
  let mockRepositoryContext: RepositoryContext;

  beforeEach(() => {
    vi.clearAllMocks();
    detector = new StagedContentDetector();

    // Setup mock repository context
    mockRepositoryContext = {
      repository: {
        path: '/test/repo',
        name: 'test-repo',
        type: 'git',
        isActive: true,
        branch: 'main'
      } as RepositoryInfo,
      selectedFiles: [],
      workingDirectory: ''
    };

    // Mock vscode configuration
    const mockConfig = {
      get: vi.fn((key: string, defaultValue?: any) => {
        if (key === 'features.codeAnalysis.fallbackToAll') {
          return true;
        }
        return defaultValue;
      })
    };
    vi.mocked(mockVscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);
  });

  afterEach(() => {
    detector.clearCache();
  });

  describe('detectStagedContent', () => {
    it('应该检测到暂存区有内容', async () => {
      // Arrange
      const stagedFiles = ['src/test.ts', 'README.md'];
      mockExecGitCommands({
        'git rev-parse --git-dir': { stdout: '.git' },
        'git diff --cached --name-only': { 
          stdout: stagedFiles.join('\n') 
        }
      });

      const options: DetectionOptions = {
        repository: mockRepositoryContext,
        useCache: false
      };

      // Act
      const result = await detector.detectStagedContent(options);

      // Assert
      expect(result.hasStagedContent).toBe(true);
      expect(result.stagedFileCount).toBe(2);
      expect(result.stagedFiles).toHaveLength(2);
      expect(result.recommendedTarget).toBe(DiffTarget.STAGED);
      expect(result.repositoryPath).toBe('/test/repo');
      expect(result.errorMessage).toBeUndefined();
    });

    it('应该检测到暂存区为空', async () => {
      // Arrange
      mockExecGitCommands({
        'git rev-parse --git-dir': { stdout: '.git' },
        'git diff --cached --name-only': { stdout: '' }
      });

      const options: DetectionOptions = {
        repository: mockRepositoryContext,
        useCache: false
      };

      // Act
      const result = await detector.detectStagedContent(options);

      // Assert
      expect(result.hasStagedContent).toBe(false);
      expect(result.stagedFileCount).toBe(0);
      expect(result.stagedFiles).toEqual([]);
      expect(result.recommendedTarget).toBe(DiffTarget.ALL);
      expect(result.repositoryPath).toBe('/test/repo');
    });

    it('应该处理Git命令执行失败的情况', async () => {
      // Arrange
      mockExecGitCommands({
        'git rev-parse --git-dir': { 
          error: new Error('not a git repository') 
        }
      });

      const options: DetectionOptions = {
        repository: mockRepositoryContext,
        useCache: false
      };

      // Act
      const result = await detector.detectStagedContent(options);

      // Assert - Should return fallback result instead of throwing
      expect(result.hasStagedContent).toBe(false);
      expect(result.stagedFileCount).toBe(0);
      expect(result.stagedFiles).toEqual([]);
      expect(result.recommendedTarget).toBe(DiffTarget.ALL);
      expect(result.errorMessage).toBeDefined();
    });

    it('应该支持缓存机制', async () => {
      // Arrange
      const stagedFiles = ['src/cached.ts'];
      mockExecGitCommands({
        'git rev-parse --git-dir': { stdout: '.git' },
        'git diff --cached --name-only': { 
          stdout: stagedFiles.join('\n') 
        }
      });

      const options: DetectionOptions = {
        repository: mockRepositoryContext,
        useCache: true
      };

      // Act - First call
      const result1 = await detector.detectStagedContent(options);
      
      // Clear mocks to verify cache is used
      vi.clearAllMocks();
      
      // Act - Second call should use cache
      const result2 = await detector.detectStagedContent(options);

      // Assert
      expect(result1).toEqual(result2);
      expect(mockExec).not.toHaveBeenCalled(); // Should not call git commands again
    });

    it('应该处理超时情况', async () => {
      // Arrange
      const longRunningPromise = new Promise((resolve) => {
        setTimeout(() => resolve({ stdout: 'test.ts' }), 15000);
      });
      
      mockExec.mockImplementation(() => longRunningPromise as any);

      const options: DetectionOptions = {
        repository: mockRepositoryContext,
        useCache: false,
        timeoutMs: 100 // Very short timeout
      };

      // Act
      const result = await detector.detectStagedContent(options);

      // Assert - Should return fallback result due to timeout
      expect(result.hasStagedContent).toBe(false);
      expect(result.errorMessage).toContain('timed out');
    });
  });

  describe('hasStagedChanges', () => {
    it('应该返回true当有暂存区内容时', async () => {
      // Arrange
      mockExecGitCommands({
        'git rev-parse --git-dir': { stdout: '.git' },
        'git diff --cached --name-only': { stdout: 'test.ts' }
      });

      // Act
      const result = await detector.hasStagedChanges('/test/repo');

      // Assert
      expect(result).toBe(true);
    });

    it('应该返回false当暂存区为空时', async () => {
      // Arrange
      mockExecGitCommands({
        'git rev-parse --git-dir': { stdout: '.git' },
        'git diff --cached --name-only': { stdout: '' }
      });

      // Act
      const result = await detector.hasStagedChanges('/test/repo');

      // Assert
      expect(result).toBe(false);
    });

    it('应该处理错误并返回false', async () => {
      // Arrange
      mockExecGitCommands({
        'git rev-parse --git-dir': { 
          error: new Error('not a git repository') 
        }
      });

      // Act
      const result = await detector.hasStagedChanges('/test/repo');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getStagedFiles', () => {
    it('应该返回暂存区文件列表', async () => {
      // Arrange
      const expectedFiles = ['src/file1.ts', 'src/file2.ts'];
      mockExecGitCommands({
        'git rev-parse --git-dir': { stdout: '.git' },
        'git diff --cached --name-only': { 
          stdout: expectedFiles.join('\n') 
        }
      });

      // Act
      const result = await detector.getStagedFiles('/test/repo');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toContain('src/file1.ts');
      expect(result[1]).toContain('src/file2.ts');
    });

    it('应该返回空数组当暂存区为空时', async () => {
      // Arrange
      mockExecGitCommands({
        'git rev-parse --git-dir': { stdout: '.git' },
        'git diff --cached --name-only': { stdout: '' }
      });

      // Act
      const result = await detector.getStagedFiles('/test/repo');

      // Assert
      expect(result).toEqual([]);
    });

    it('应该抛出错误当Git仓库无效时', async () => {
      // Arrange
      mockExecGitCommands({
        'git rev-parse --git-dir': { 
          error: new Error('not a git repository') 
        }
      });

      // Act & Assert
      await expect(detector.getStagedFiles('/invalid/repo'))
        .rejects.toThrow(StagedDetectionError);
    });
  });

  describe('getStagedDetails', () => {
    it('应该返回详细的暂存区信息', async () => {
      // Arrange
      const stagedFiles = ['file1.ts', 'file2.ts'];
      const diffStat = '5\t2\tfile1.ts\n3\t1\tfile2.ts';
      
      mockExecGitCommands({
        'git rev-parse --git-dir': { stdout: '.git' },
        'git diff --cached --name-only': { 
          stdout: stagedFiles.join('\n') 
        },
        'git diff --cached --numstat': { 
          stdout: diffStat 
        }
      });

      // Act
      const result = await detector.getStagedDetails('/test/repo');

      // Assert
      expect(result.files).toHaveLength(2);
      expect(result.summary.files).toBe(2);
      expect(result.summary.additions).toBe(8); // 5 + 3
      expect(result.summary.deletions).toBe(3); // 2 + 1
    });
  });

  describe('缓存管理', () => {
    it('应该能够清理缓存', async () => {
      // Arrange
      mockExecGitCommands({
        'git rev-parse --git-dir': { stdout: '.git' },
        'git diff --cached --name-only': { stdout: 'test.ts' }
      });

      const options: DetectionOptions = {
        repository: mockRepositoryContext,
        useCache: true
      };

      // Act
      await detector.detectStagedContent(options);
      detector.clearCache();
      
      // Clear mocks after first call
      vi.clearAllMocks();
      mockExecGitCommands({
        'git rev-parse --git-dir': { stdout: '.git' },
        'git diff --cached --name-only': { stdout: 'test.ts' }
      });

      await detector.detectStagedContent(options);

      // Assert - Should call git commands again after cache clear
      expect(mockExec).toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    it('应该正确分类不同类型的错误', async () => {
      // Test for invalid repository error
      mockExecGitCommands({
        'git rev-parse --git-dir': { 
          error: Object.assign(new Error('not a git repository'), { 
            stderr: 'fatal: not a git repository' 
          })
        }
      });

      const options: DetectionOptions = {
        repository: mockRepositoryContext,
        useCache: false
      };

      const result = await detector.detectStagedContent(options);
      expect(result.errorMessage).toContain('Not a valid git repository');
    });

    it('应该处理权限错误', async () => {
      // Test for permission error
      mockExecGitCommands({
        'git rev-parse --git-dir': { 
          error: Object.assign(new Error('Permission denied'), { 
            code: 'EACCES' 
          })
        }
      });

      const options: DetectionOptions = {
        repository: mockRepositoryContext,
        useCache: false
      };

      const result = await detector.detectStagedContent(options);
      expect(result.errorMessage).toContain('Permission denied');
    });
  });

  // Helper function to mock git command executions
  function mockExecGitCommands(commands: Record<string, { stdout?: string; stderr?: string; error?: Error }>) {
    mockExec.mockImplementation(((command: string, options: any, callback?: any) => {
      // Handle both callback and promise styles
      if (callback) {
        const commandKey = command.toString();
        const mock = commands[commandKey];
        
        if (mock?.error) {
          callback(mock.error);
        } else {
          callback(null, { 
            stdout: mock?.stdout || '', 
            stderr: mock?.stderr || '' 
          });
        }
      } else {
        // Return a promise for promisified version
        return new Promise((resolve, reject) => {
          const commandKey = command.toString();
          const mock = commands[commandKey];
          
          if (mock?.error) {
            reject(mock.error);
          } else {
            resolve({ 
              stdout: mock?.stdout || '', 
              stderr: mock?.stderr || '' 
            });
          }
        });
      }
    }) as any);
  }
});