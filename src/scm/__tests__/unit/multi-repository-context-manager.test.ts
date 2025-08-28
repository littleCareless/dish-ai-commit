/**
 * Unit tests for MultiRepositoryContextManager
 * Tests repository identification, context management, and multi-repository scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

import { MultiRepositoryContextManager } from '../../multi-repository-context-manager';
import {
  RepositoryInfo,
  RepositoryContext,
  StagedDetectionError,
  DetectionErrorType
} from '../../staged-detector-types';

// Mock external dependencies
vi.mock('fs');
vi.mock('child_process');
vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [],
    getWorkspaceFolder: vi.fn(),
  },
  window: {
    activeTextEditor: undefined,
  },
  extensions: {
    getExtension: vi.fn().mockReturnValue(undefined),
  },
  Uri: {
    file: vi.fn((path: string) => ({ fsPath: path })),
  },
}));

const mockFs = vi.mocked(fs);
const mockExec = vi.mocked(exec);
const mockVscode = vi.mocked(vscode);

describe('MultiRepositoryContextManager', () => {
  let manager: MultiRepositoryContextManager;
  let mockWorkspaceFolders: any[];

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new MultiRepositoryContextManager();

    // Setup mock workspace folders
    mockWorkspaceFolders = [
      {
        uri: { fsPath: '/workspace/project1' },
        name: 'project1'
      },
      {
        uri: { fsPath: '/workspace/project2' },
        name: 'project2'
      }
    ];

    // Create a new mock object with the workspace folders
    const mockWorkspace = {
      ...mockVscode.workspace,
      workspaceFolders: mockWorkspaceFolders
    };
    
    // Replace the workspace object in mockVscode
    Object.defineProperty(mockVscode, 'workspace', {
      value: mockWorkspace,
      configurable: true
    });
  });

  afterEach(() => {
    // Clear cache between tests
    manager = new MultiRepositoryContextManager();
  });

  describe('identifyRepository', () => {
    it('应该基于选中文件识别仓库', async () => {
      // Arrange
      const selectedFiles = ['/workspace/project1/src/test.ts'];
      setupMockRepositories([
        { path: '/workspace/project1', type: 'git', branch: 'main' },
        { path: '/workspace/project2', type: 'git', branch: 'dev' }
      ]);

      // Act
      const context = await manager.identifyRepository(selectedFiles);

      // Assert
      expect(context.repository.path).toBe('/workspace/project1');
      expect(context.repository.type).toBe('git');
      expect(context.selectedFiles).toEqual(selectedFiles);
    });

    it('应该基于活动编辑器识别仓库', async () => {
      // Arrange
      const activeEditor = {
        document: {
          fileName: '/workspace/project2/src/main.ts'
        }
      };
      mockVscode.window.activeTextEditor = activeEditor as any;

      setupMockRepositories([
        { path: '/workspace/project1', type: 'git', branch: 'main' },
        { path: '/workspace/project2', type: 'git', branch: 'dev' }
      ]);

      // Act
      const context = await manager.identifyRepository();

      // Assert
      expect(context.repository.path).toBe('/workspace/project2');
      expect(context.repository.type).toBe('git');
      expect(context.activeFile).toBe('/workspace/project2/src/main.ts');
    });

    it('应该回退到主仓库当没有选中文件时', async () => {
      // Arrange
      setupMockRepositories([
        { path: '/workspace/project1', type: 'git', branch: 'main', isActive: true }
      ]);

      // Mock git extension
      const mockGitExtension = {
        isActive: true,
        exports: {
          getAPI: () => ({
            repositories: [
              { rootUri: { fsPath: '/workspace/project1' } }
            ]
          })
        }
      };
      vi.mocked(mockVscode.extensions.getExtension).mockReturnValue(mockGitExtension as any);

      // Act
      const context = await manager.identifyRepository();

      // Assert
      expect(context.repository.path).toBe('/workspace/project1');
      expect(context.repository.isActive).toBe(true);
    });

    it('应该抛出错误当没有找到仓库时', async () => {
      // Arrange
      // Create a new mock object with empty workspace folders
      const mockWorkspace = {
        ...mockVscode.workspace,
        workspaceFolders: []
      };
      
      // Replace the workspace object in mockVscode
      Object.defineProperty(mockVscode, 'workspace', {
        value: mockWorkspace,
        configurable: true
      });
      setupMockRepositories([]);

      // Act & Assert
      await expect(manager.identifyRepository())
        .rejects.toThrow(StagedDetectionError);
    });
  });

  describe('getAllRepositories', () => {
    it('应该发现所有工作区中的仓库', async () => {
      // Arrange
      setupMockRepositories([
        { path: '/workspace/project1', type: 'git', branch: 'main' },
        { path: '/workspace/project2', type: 'svn' }
      ]);

      // Act
      const repositories = await manager.getAllRepositories();

      // Assert
      expect(repositories).toHaveLength(2);
      expect(repositories[0].type).toBe('git');
      expect(repositories[1].type).toBe('svn');
    });

    it('应该缓存仓库发现结果', async () => {
      // Arrange
      setupMockRepositories([
        { path: '/workspace/project1', type: 'git', branch: 'main' }
      ]);

      // Act
      const repos1 = await manager.getAllRepositories();
      
      // Clear mocks to verify cache usage
      vi.clearAllMocks();
      
      const repos2 = await manager.getAllRepositories();

      // Assert
      expect(repos1).toEqual(repos2);
      expect(mockFs.stat).not.toHaveBeenCalled(); // Should not scan again
    });

    it('应该处理混合仓库类型', async () => {
      // Arrange
      setupMockRepositories([
        { path: '/workspace/git-repo', type: 'git', branch: 'main' },
        { path: '/workspace/svn-repo', type: 'svn' },
        { path: '/workspace/no-scm', type: 'unknown' }
      ]);

      // Act
      const repositories = await manager.getAllRepositories();

      // Assert
      const gitRepos = repositories.filter(r => r.type === 'git');
      const svnRepos = repositories.filter(r => r.type === 'svn');
      
      expect(gitRepos).toHaveLength(1);
      expect(svnRepos).toHaveLength(1);
      expect(repositories.some(r => r.type === 'unknown')).toBe(false); // Unknown types filtered out
    });
  });

  describe('getPrimaryRepository', () => {
    it('应该返回Git扩展中的活动仓库', async () => {
      // Arrange
      setupMockRepositories([
        { path: '/workspace/project1', type: 'git', branch: 'main' },
        { path: '/workspace/project2', type: 'git', branch: 'dev' }
      ]);

      const mockGitExtension = {
        isActive: true,
        exports: {
          getAPI: () => ({
            repositories: [
              { rootUri: { fsPath: '/workspace/project1' } }
            ]
          })
        }
      };
      vi.mocked(mockVscode.extensions.getExtension).mockReturnValue(mockGitExtension as any);

      // Act
      const primary = await manager.getPrimaryRepository();

      // Assert
      expect(primary?.path).toBe('/workspace/project1');
      expect(primary?.isActive).toBe(true);
    });

    it('应该基于活动编辑器确定主仓库', async () => {
      // Arrange
      const activeEditor = {
        document: {
          fileName: '/workspace/project2/src/test.ts'
        }
      };
      mockVscode.window.activeTextEditor = activeEditor as any;

      setupMockRepositories([
        { path: '/workspace/project1', type: 'git', branch: 'main' },
        { path: '/workspace/project2', type: 'git', branch: 'dev' }
      ]);

      // Mock git extension not available
      vi.mocked(mockVscode.extensions.getExtension).mockReturnValue(undefined);

      // Act
      const primary = await manager.getPrimaryRepository();

      // Assert
      expect(primary?.path).toBe('/workspace/project2');
      expect(primary?.isActive).toBe(true);
    });

    it('应该返回第一个仓库作为回退', async () => {
      // Arrange
      setupMockRepositories([
        { path: '/workspace/project1', type: 'git', branch: 'main' }
      ]);

      // Mock no git extension and no active editor
      vi.mocked(mockVscode.extensions.getExtension).mockReturnValue(undefined);
      mockVscode.window.activeTextEditor = undefined;

      // Act
      const primary = await manager.getPrimaryRepository();

      // Assert
      expect(primary?.path).toBe('/workspace/project1');
    });
  });

  describe('getRepositoryForPath', () => {
    it('应该为给定路径找到正确的仓库', async () => {
      // Arrange
      setupMockRepositories([
        { path: '/workspace/project1', type: 'git', branch: 'main' },
        { path: '/workspace/project2', type: 'svn' }
      ]);

      // Act
      const repo = await manager.getRepositoryForPath('/workspace/project1/src/test.ts');

      // Assert
      expect(repo?.path).toBe('/workspace/project1');
      expect(repo?.type).toBe('git');
    });

    it('应该返回undefined当路径不在任何仓库中时', async () => {
      // Arrange
      setupMockRepositories([
        { path: '/workspace/project1', type: 'git', branch: 'main' }
      ]);

      // Act
      const repo = await manager.getRepositoryForPath('/other/path/file.ts');

      // Assert
      expect(repo).toBeUndefined();
    });
  });

  describe('refreshRepositories', () => {
    it('应该清理缓存并重新发现仓库', async () => {
      // Arrange
      setupMockRepositories([
        { path: '/workspace/project1', type: 'git', branch: 'main' }
      ]);

      // Initial discovery
      await manager.getAllRepositories();
      
      // Clear mocks
      vi.clearAllMocks();
      
      // Setup new repository state
      setupMockRepositories([
        { path: '/workspace/project1', type: 'git', branch: 'main' },
        { path: '/workspace/project2', type: 'svn' }
      ]);

      // Act
      await manager.refreshRepositories();
      const repos = await manager.getAllRepositories();

      // Assert
      expect(repos).toHaveLength(2);
      expect(mockFs.stat).toHaveBeenCalled(); // Should have re-scanned
    });
  });

  describe('仓库类型检测', () => {
    it('应该正确检测Git仓库', async () => {
      // Arrange
      mockDirectoryStructure({
        '/workspace/git-repo/.git': { isDirectory: true }
      });

      mockGitCommands({
        'git rev-parse --show-toplevel': { stdout: '/workspace/git-repo' },
        'git rev-parse --abbrev-ref HEAD': { stdout: 'main' }
      });

      // Act
      const repositories = await manager.getAllRepositories();

      // Assert
      const gitRepo = repositories.find(r => r.path === '/workspace/git-repo');
      expect(gitRepo?.type).toBe('git');
      expect(gitRepo?.branch).toBe('main');
    });

    it('应该正确检测SVN仓库', async () => {
      // Arrange
      mockDirectoryStructure({
        '/workspace/svn-repo/.svn': { isDirectory: true }
      });

      // Act
      const repositories = await manager.getAllRepositories();

      // Assert
      const svnRepo = repositories.find(r => r.path === '/workspace/svn-repo');
      expect(svnRepo?.type).toBe('svn');
    });

    it('应该跳过非仓库目录', async () => {
      // Arrange
      mockDirectoryStructure({
        '/workspace/regular-folder': { isDirectory: true }
      });

      // Act
      const repositories = await manager.getAllRepositories();

      // Assert
      expect(repositories.find(r => r.path === '/workspace/regular-folder')).toBeUndefined();
    });
  });

  // Helper functions
  function setupMockRepositories(repositories: Array<{ 
    path: string; 
    type: 'git' | 'svn' | 'unknown'; 
    branch?: string; 
    isActive?: boolean 
  }>) {
    // Mock file system structure
    const dirStructure: Record<string, { isDirectory: boolean }> = {};
    const subdirs: Record<string, string[]> = {};

    repositories.forEach(repo => {
      if (repo.type === 'git') {
        dirStructure[`${repo.path}/.git`] = { isDirectory: true };
      } else if (repo.type === 'svn') {
        dirStructure[`${repo.path}/.svn`] = { isDirectory: true };
      }

      // Setup workspace subdirectories
      const parentDir = path.dirname(repo.path);
      const dirName = path.basename(repo.path);
      if (!subdirs[parentDir]) {
        subdirs[parentDir] = [];
      }
      subdirs[parentDir].push(dirName);
    });

    mockDirectoryStructure(dirStructure);
    mockSubdirectories(subdirs);

    // Mock git commands for repositories with branches
    const gitCommands: Record<string, { stdout?: string; error?: Error }> = {};
    repositories.forEach(repo => {
      if (repo.type === 'git') {
        gitCommands['git rev-parse --show-toplevel'] = { stdout: repo.path };
        if (repo.branch) {
          gitCommands['git rev-parse --abbrev-ref HEAD'] = { stdout: repo.branch };
        }
      }
    });
    mockGitCommands(gitCommands);
  }

  function mockDirectoryStructure(structure: Record<string, { isDirectory: boolean }>) {
    mockFs.stat = vi.fn().mockImplementation((path: string) => {
      return Promise.resolve(structure[path] || { isDirectory: () => false });
    }) as any;
  }

  function mockSubdirectories(subdirs: Record<string, string[]>) {
    mockFs.readdir = vi.fn().mockImplementation((path: string) => {
      return Promise.resolve(subdirs[path] || []);
    }) as any;
  }

  function mockGitCommands(commands: Record<string, { stdout?: string; error?: Error }>) {
    mockExec.mockImplementation(((command: string, options: any, callback?: any) => {
      const result = commands[command];
      
      if (callback) {
        if (result?.error) {
          callback(result.error);
        } else {
          callback(null, { stdout: result?.stdout || '', stderr: '' });
        }
      } else {
        return new Promise((resolve, reject) => {
          if (result?.error) {
            reject(result.error);
          } else {
            resolve({ stdout: result?.stdout || '', stderr: '' });
          }
        });
      }
    }) as any);
  }
});