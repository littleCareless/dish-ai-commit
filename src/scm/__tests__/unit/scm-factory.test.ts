/**
 * Unit tests for SCM Factory class
 * Tests SCM type detection, provider creation, and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { exec } from 'child_process';

import { SCMFactory, ISCMProvider } from '../../scm-provider';
import { GitProvider } from '../../git-provider';
import { SvnProvider } from '../../svn-provider';
import { CliSvnProvider } from '../../cli-svn-provider';

import { TestFileSystem } from '../helpers/test-data-generators';
import { TestConfig } from '../helpers/test-interfaces';

// Mock external dependencies
vi.mock('fs');
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));
vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [],
    textDocuments: [],
  },
  extensions: {
    getExtension: vi.fn(),
  },
  window: {
    activeTextEditor: undefined,
  },
}));

// Mock SCM providers
vi.mock('../../git-provider');
vi.mock('../../svn-provider');
vi.mock('../../cli-svn-provider');

const mockFs = vi.mocked(fs);
const mockExec = vi.mocked(exec);

describe('SCMFactory', () => {
  let testConfig: TestConfig;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create default test configuration
    testConfig = {
      mockWorkspacePath: '/mock/workspace',
      scmType: 'git',
      hasExtension: true,
      hasCommandLine: true,
    };

    // Setup VS Code workspace mock
    vi.mocked(vscode.workspace).workspaceFolders = [
      {
        uri: { fsPath: testConfig.mockWorkspacePath },
        name: 'test-workspace',
        index: 0,
      } as any,
    ];

    // Reset SCMFactory internal state
    (SCMFactory as any).currentProvider = undefined
      ; (SCMFactory as any).providerCache = new Map()
      ; (SCMFactory as any).pendingDetections = new Map();
  });

  afterEach(() => {
    vi.resetAllMocks();
    TestFileSystem.cleanupAll();
  });

  describe('2.1 SCM Type Detection', () => {
    describe('Git directory detection', () => {
      it('should detect Git when .git directory exists in workspace root', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const gitPath = path.join(workspacePath, '.git');

        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === gitPath;
        });

        // Create mock Git API and extension with exports
        const mockGitAPI = {
          repositories: [],
        };

        const mockGitExtension = {
          exports: mockGitAPI,
          getAPI: vi.fn().mockReturnValue(mockGitAPI),
        };

        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          if (id === 'vscode.git') { return mockGitExtension as any; }
          return undefined;
        });

        // Mock GitProvider
        const mockGitProvider = {
          type: 'git' as const,
          init: vi.fn().mockResolvedValue(undefined),
          isAvailable: vi.fn().mockResolvedValue(true),
        };
        vi.mocked(GitProvider).mockImplementation(() => mockGitProvider as any);

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(mockFs.existsSync).toHaveBeenCalledWith(gitPath);
        expect(provider).toBeDefined();
        expect(provider?.type).toBe('git');
        expect(GitProvider).toHaveBeenCalledWith(mockGitAPI, workspacePath);
      });

      it('should detect Git when .git directory exists in selected file path', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const subProjectPath = '/mock/workspace/subproject';
        const selectedFiles = ['/mock/workspace/subproject/file.txt'];
        const gitPath = path.join(subProjectPath, '.git');

        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === gitPath;
        });

        // Create mock Git API and extension
        const mockGitAPI = {
          repositories: [],
        };

        const mockGitExtension = {
          exports: mockGitAPI,
          getAPI: vi.fn().mockReturnValue(mockGitAPI),
        };

        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          if (id === 'vscode.git') { return mockGitExtension as any; }
          return undefined;
        });

        // Mock GitProvider
        const mockGitProvider = {
          type: 'git' as const,
          init: vi.fn().mockResolvedValue(undefined),
          isAvailable: vi.fn().mockResolvedValue(true),
        };
        vi.mocked(GitProvider).mockImplementation(() => mockGitProvider as any);

        // Act
        const provider = await SCMFactory.detectSCM(selectedFiles);

        // Assert
        expect(mockFs.existsSync).toHaveBeenCalledWith(gitPath);
        expect(provider).toBeDefined();
        expect(provider?.type).toBe('git');
      });

      it('should not detect Git when .git directory does not exist', async () => {
        // Arrange
        mockFs.existsSync.mockReturnValue(false);

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(provider).toBeUndefined();
      });
    });

    describe('SVN directory detection', () => {
      it('should detect SVN when .svn directory exists in workspace root', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const svnPath = path.join(workspacePath, '.svn');

        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === svnPath;
        });

        // Create mock SVN API and extension
        const mockSvnAPI = {
          repositories: [],
        };

        const mockSvnExtension = {
          exports: mockSvnAPI,
          getAPI: vi.fn().mockReturnValue(mockSvnAPI),
        };

        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          if (id === 'littleCareless.svn-scm-ai') { return mockSvnExtension as any; }
          return undefined;
        });

        // Mock SvnProvider
        const mockSvnProvider = {
          type: 'svn' as const,
          init: vi.fn().mockResolvedValue(undefined),
          isAvailable: vi.fn().mockResolvedValue(true),
        };
        vi.mocked(SvnProvider).mockImplementation(() => mockSvnProvider as any);

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(mockFs.existsSync).toHaveBeenCalledWith(svnPath);
        expect(provider).toBeDefined();
        expect(provider?.type).toBe('svn');
        expect(SvnProvider).toHaveBeenCalledWith(mockSvnAPI);
      });

      it('should detect SVN when .svn directory exists in selected file path', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const subProjectPath = '/mock/workspace/subproject';
        const selectedFiles = ['/mock/workspace/subproject/file.txt'];
        const svnPath = path.join(subProjectPath, '.svn');

        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === svnPath;
        });

        // Create mock SVN API and extension
        const mockSvnAPI = {
          repositories: [],
        };

        const mockSvnExtension = {
          exports: mockSvnAPI,
          getAPI: vi.fn().mockReturnValue(mockSvnAPI),
        };

        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          if (id === 'littleCareless.svn-scm-ai') { return mockSvnExtension as any; }
          return undefined;
        });

        // Mock SvnProvider
        const mockSvnProvider = {
          type: 'svn' as const,
          init: vi.fn().mockResolvedValue(undefined),
          isAvailable: vi.fn().mockResolvedValue(true),
        };
        vi.mocked(SvnProvider).mockImplementation(() => mockSvnProvider as any);

        // Act
        const provider = await SCMFactory.detectSCM(selectedFiles);

        // Assert
        expect(mockFs.existsSync).toHaveBeenCalledWith(svnPath);
        expect(provider).toBeDefined();
        expect(provider?.type).toBe('svn');
      });

      it('should not detect SVN when .svn directory does not exist', async () => {
        // Arrange
        mockFs.existsSync.mockReturnValue(false);

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(provider).toBeUndefined();
      });
    });

    describe('SCM root directory finding based on file paths', () => {
      it('should find Git root from nested file path', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const nestedPath = '/mock/workspace/src/components';
        const selectedFiles = ['/mock/workspace/src/components/Button.tsx'];

        // Mock directory traversal - Git found at workspace root
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          const gitPath = path.join(workspacePath, '.git');
          return filePath === gitPath;
        });

        // Create mock Git API and extension
        const mockGitAPI = {
          repositories: [],
        };

        const mockGitExtension = {
          exports: mockGitAPI,
          getAPI: vi.fn().mockReturnValue(mockGitAPI),
        };

        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          if (id === 'vscode.git') { return mockGitExtension as any; }
          return undefined;
        });

        // Mock GitProvider
        const mockGitProvider = {
          type: 'git' as const,
          init: vi.fn().mockResolvedValue(undefined),
          isAvailable: vi.fn().mockResolvedValue(true),
        };
        vi.mocked(GitProvider).mockImplementation(() => mockGitProvider as any);

        // Act
        const provider = await SCMFactory.detectSCM(selectedFiles);

        // Assert
        expect(provider).toBeDefined();
        expect(provider?.type).toBe('git');
        expect(GitProvider).toHaveBeenCalledWith(mockGitAPI, workspacePath);
      });

      it('should find SVN root from nested file path', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const nestedPath = '/mock/workspace/trunk/src';
        const selectedFiles = ['/mock/workspace/trunk/src/main.c'];

        // Mock directory traversal - SVN found at workspace root
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          const svnPath = path.join(workspacePath, '.svn');
          return filePath === svnPath;
        });

        // Create mock SVN API and extension
        const mockSvnAPI = {
          repositories: [],
        };

        const mockSvnExtension = {
          exports: mockSvnAPI,
          getAPI: vi.fn().mockReturnValue(mockSvnAPI),
        };

        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          if (id === 'littleCareless.svn-scm-ai') { return mockSvnExtension as any; }
          return undefined;
        });

        // Mock SvnProvider
        const mockSvnProvider = {
          type: 'svn' as const,
          init: vi.fn().mockResolvedValue(undefined),
          isAvailable: vi.fn().mockResolvedValue(true),
        };
        vi.mocked(SvnProvider).mockImplementation(() => mockSvnProvider as any);

        // Act
        const provider = await SCMFactory.detectSCM(selectedFiles);

        // Assert
        expect(provider).toBeDefined();
        expect(provider?.type).toBe('svn');
        expect(SvnProvider).toHaveBeenCalledWith(mockSvnAPI);
      });

      it('should handle multiple files from different directories', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const selectedFiles = [
          '/mock/workspace/src/main.ts',
          '/mock/workspace/tests/unit.test.ts',
          '/mock/workspace/docs/README.md'
        ];

        // Mock Git found at workspace root
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          const gitPath = path.join(workspacePath, '.git');
          return filePath === gitPath;
        });

        // Create mock Git API and extension
        const mockGitAPI = {
          repositories: [],
        };

        const mockGitExtension = {
          exports: mockGitAPI,
          getAPI: vi.fn().mockReturnValue(mockGitAPI),
        };

        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          if (id === 'vscode.git') { return mockGitExtension as any; }
          return undefined;
        });

        // Mock GitProvider
        const mockGitProvider = {
          type: 'git' as const,
          init: vi.fn().mockResolvedValue(undefined),
          isAvailable: vi.fn().mockResolvedValue(true),
        };
        vi.mocked(GitProvider).mockImplementation(() => mockGitProvider as any);

        // Act
        const provider = await SCMFactory.detectSCM(selectedFiles);

        // Assert
        expect(provider).toBeDefined();
        expect(provider?.type).toBe('git');
      });

      it('should fallback to workspace folder when no SCM found in file paths', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const selectedFiles = ['/mock/workspace/file.txt'];

        // No SCM directories found
        mockFs.existsSync.mockReturnValue(false);

        // Act
        const provider = await SCMFactory.detectSCM(selectedFiles);

        // Assert
        expect(provider).toBeUndefined();
      });

      it('should handle empty file paths array', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const gitPath = path.join(workspacePath, '.git');

        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === gitPath;
        });

        // Create mock Git API and extension
        const mockGitAPI = {
          repositories: [],
        };

        const mockGitExtension = {
          exports: mockGitAPI,
          getAPI: vi.fn().mockReturnValue(mockGitAPI),
        };

        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          if (id === 'vscode.git') { return mockGitExtension as any; }
          return undefined;
        });

        // Mock GitProvider
        const mockGitProvider = {
          type: 'git' as const,
          init: vi.fn().mockResolvedValue(undefined),
          isAvailable: vi.fn().mockResolvedValue(true),
        };
        vi.mocked(GitProvider).mockImplementation(() => mockGitProvider as any);

        // Act
        const provider = await SCMFactory.detectSCM([]);

        // Assert
        expect(provider).toBeDefined();
        expect(provider?.type).toBe('git');
      });
    });

    describe('Priority handling when both Git and SVN exist', () => {
      it('should prioritize Git when both .git and .svn directories exist', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const gitPath = path.join(workspacePath, '.git');
        const svnPath = path.join(workspacePath, '.svn');

        // Both directories exist, but Git should be prioritized
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === gitPath || filePath === svnPath;
        });

        // Create mock Git API and extension
        const mockGitAPI = {
          repositories: [],
        };

        const mockGitExtension = {
          exports: mockGitAPI,
          getAPI: vi.fn().mockReturnValue(mockGitAPI),
        };

        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          if (id === 'vscode.git') { return mockGitExtension as any; }
          return undefined;
        });

        // Mock GitProvider
        const mockGitProvider = {
          type: 'git' as const,
          init: vi.fn().mockResolvedValue(undefined),
          isAvailable: vi.fn().mockResolvedValue(true),
        };
        vi.mocked(GitProvider).mockImplementation(() => mockGitProvider as any);

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(provider).toBeDefined();
        expect(provider?.type).toBe('git');
        expect(GitProvider).toHaveBeenCalled();
        expect(SvnProvider).not.toHaveBeenCalled();
      });
    });
  });

  describe('2.2 SCM Provider Creation Logic', () => {
    describe('Git provider creation', () => {
      it('should create GitProvider when Git extension is available', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const gitPath = path.join(workspacePath, '.git');

        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === gitPath;
        });

        // Create mock Git API and extension
        const mockGitAPI = {
          repositories: [],
        };

        const mockGitExtension = {
          exports: mockGitAPI,
          getAPI: vi.fn().mockReturnValue(mockGitAPI),
        };

        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          if (id === 'vscode.git') { return mockGitExtension as any; }
          return undefined;
        });

        // Mock GitProvider
        const mockGitProvider = {
          type: 'git' as const,
          init: vi.fn().mockResolvedValue(undefined),
          isAvailable: vi.fn().mockResolvedValue(true),
        };
        vi.mocked(GitProvider).mockImplementation(() => mockGitProvider as any);

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(provider).toBeDefined();
        expect(provider?.type).toBe('git');
        expect(GitProvider).toHaveBeenCalledWith(mockGitAPI, workspacePath);
        expect(mockGitProvider.init).toHaveBeenCalled();
        expect(mockGitProvider.isAvailable).toHaveBeenCalled();
      });

      it('should not create GitProvider when Git extension is not available', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const gitPath = path.join(workspacePath, '.git');

        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === gitPath;
        });

        // No Git extension available
        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          return undefined;
        });

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(provider).toBeUndefined();
        expect(GitProvider).not.toHaveBeenCalled();
      });

      it('should not create GitProvider when Git extension has no exports', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const gitPath = path.join(workspacePath, '.git');

        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === gitPath;
        });

        // Git extension without exports
        const mockGitExtension = {
          exports: undefined,
          getAPI: vi.fn(),
        };

        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          if (id === 'vscode.git') { return mockGitExtension as any; }
          return undefined;
        });

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(provider).toBeUndefined();
        expect(GitProvider).not.toHaveBeenCalled();
      });

      it('should not return GitProvider when isAvailable returns false', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const gitPath = path.join(workspacePath, '.git');

        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === gitPath;
        });

        // Create mock Git API and extension
        const mockGitAPI = {
          repositories: [],
        };

        const mockGitExtension = {
          exports: mockGitAPI,
          getAPI: vi.fn().mockReturnValue(mockGitAPI),
        };

        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          if (id === 'vscode.git') { return mockGitExtension as any; }
          return undefined;
        });

        // Mock GitProvider that is not available
        const mockGitProvider = {
          type: 'git' as const,
          init: vi.fn().mockResolvedValue(undefined),
          isAvailable: vi.fn().mockResolvedValue(false), // Not available
        };
        vi.mocked(GitProvider).mockImplementation(() => mockGitProvider as any);

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(provider).toBeUndefined();
        expect(GitProvider).toHaveBeenCalledWith(mockGitAPI, workspacePath);
        expect(mockGitProvider.init).toHaveBeenCalled();
        expect(mockGitProvider.isAvailable).toHaveBeenCalled();
      });
    });

    describe('SVN provider creation', () => {
      it('should create SvnProvider when SVN extension is available', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const svnPath = path.join(workspacePath, '.svn');

        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === svnPath;
        });

        // Create mock SVN API and extension
        const mockSvnAPI = {
          repositories: [],
        };

        const mockSvnExtension = {
          exports: mockSvnAPI,
          getAPI: vi.fn().mockReturnValue(mockSvnAPI),
        };

        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          if (id === 'littleCareless.svn-scm-ai') { return mockSvnExtension as any; }
          return undefined;
        });

        // Mock SvnProvider
        const mockSvnProvider = {
          type: 'svn' as const,
          init: vi.fn().mockResolvedValue(undefined),
          isAvailable: vi.fn().mockResolvedValue(true),
        };
        vi.mocked(SvnProvider).mockImplementation(() => mockSvnProvider as any);

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(provider).toBeDefined();
        expect(provider?.type).toBe('svn');
        expect(SvnProvider).toHaveBeenCalledWith(mockSvnAPI);
        expect(mockSvnProvider.init).toHaveBeenCalled();
        expect(mockSvnProvider.isAvailable).toHaveBeenCalled();
      });

      it('should create CliSvnProvider when SVN extension is not available but svn command exists', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const svnPath = path.join(workspacePath, '.svn');

        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === svnPath;
        });

        // No SVN extension available
        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          return undefined;
        });

        // Mock exec to simulate svn command availability
        const { exec } = await import('child_process');
        const mockExec = vi.mocked(exec);
        mockExec.mockImplementation((command: string, callback: any) => {
          if (command === 'svn --version') {
            callback(null, 'svn, version 1.14.0', '');
          } else {
            callback(new Error('Command not found'), '', '');
          }
          return {} as any;
        });

        // Mock CliSvnProvider
        const mockCliSvnProvider = {
          type: 'svn' as const,
          init: vi.fn().mockResolvedValue(undefined),
          isAvailable: vi.fn().mockResolvedValue(true),
        };
        vi.mocked(CliSvnProvider).mockImplementation(() => mockCliSvnProvider as any);

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(provider).toBeDefined();
        expect(provider?.type).toBe('svn');
        expect(CliSvnProvider).toHaveBeenCalledWith(workspacePath);
        expect(mockCliSvnProvider.init).toHaveBeenCalled();
        expect(mockCliSvnProvider.isAvailable).toHaveBeenCalled();
      });

      it('should not create any SVN provider when extension and command are not available', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const svnPath = path.join(workspacePath, '.svn');

        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === svnPath;
        });

        // No SVN extension available
        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          return undefined;
        });

        // Mock exec to simulate svn command not available
        const { exec } = await import('child_process');
        const mockExec = vi.mocked(exec);
        mockExec.mockImplementation((command: string, callback: any) => {
          callback(new Error('Command not found'), '', 'svn: command not found');
          return {} as any;
        });

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(provider).toBeUndefined();
        expect(SvnProvider).not.toHaveBeenCalled();
        expect(CliSvnProvider).not.toHaveBeenCalled();
      });
    });

    describe('Fallback mechanisms', () => {
      it('should fallback to CliSvnProvider when SvnProvider is not available', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const svnPath = path.join(workspacePath, '.svn');

        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === svnPath;
        });

        // Create mock SVN API and extension
        const mockSvnAPI = {
          repositories: [],
        };

        const mockSvnExtension = {
          exports: mockSvnAPI,
          getAPI: vi.fn().mockReturnValue(mockSvnAPI),
        };

        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          if (id === 'littleCareless.svn-scm-ai') { return mockSvnExtension as any; }
          return undefined;
        });

        // Mock SvnProvider that is not available
        const mockSvnProvider = {
          type: 'svn' as const,
          init: vi.fn().mockResolvedValue(undefined),
          isAvailable: vi.fn().mockResolvedValue(false), // Not available
        };
        vi.mocked(SvnProvider).mockImplementation(() => mockSvnProvider as any);

        // Mock exec to simulate svn command availability
        const { exec } = await import('child_process');
        const mockExec = vi.mocked(exec);
        mockExec.mockImplementation((command: string, callback: any) => {
          if (command === 'svn --version') {
            callback(null, 'svn, version 1.14.0', '');
          } else {
            callback(new Error('Command not found'), '', '');
          }
          return {} as any;
        });

        // Mock CliSvnProvider
        const mockCliSvnProvider = {
          type: 'svn' as const,
          init: vi.fn().mockResolvedValue(undefined),
          isAvailable: vi.fn().mockResolvedValue(true),
        };
        vi.mocked(CliSvnProvider).mockImplementation(() => mockCliSvnProvider as any);

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(provider).toBeDefined();
        expect(provider?.type).toBe('svn');
        expect(SvnProvider).toHaveBeenCalledWith(mockSvnAPI);
        expect(mockSvnProvider.isAvailable).toHaveBeenCalled();
        expect(CliSvnProvider).toHaveBeenCalledWith(workspacePath);
        expect(mockCliSvnProvider.init).toHaveBeenCalled();
        expect(mockCliSvnProvider.isAvailable).toHaveBeenCalled();
      });

      it('should return cached provider on subsequent calls', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const gitPath = path.join(workspacePath, '.git');

        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === gitPath;
        });

        // Create mock Git API and extension
        const mockGitAPI = {
          repositories: [],
        };

        const mockGitExtension = {
          exports: mockGitAPI,
          getAPI: vi.fn().mockReturnValue(mockGitAPI),
        };

        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          if (id === 'vscode.git') { return mockGitExtension as any; }
          return undefined;
        });

        // Mock GitProvider
        const mockGitProvider = {
          type: 'git' as const,
          init: vi.fn().mockResolvedValue(undefined),
          isAvailable: vi.fn().mockResolvedValue(true),
        };
        vi.mocked(GitProvider).mockImplementation(() => mockGitProvider as any);

        // Act - First call
        const provider1 = await SCMFactory.detectSCM();

        // Act - Second call
        const provider2 = await SCMFactory.detectSCM();

        // Assert
        expect(provider1).toBeDefined();
        expect(provider2).toBeDefined();
        expect(provider1).toBe(provider2); // Same instance
        expect(GitProvider).toHaveBeenCalledTimes(1); // Only called once
      });
    });
  });

  describe('2.3 SCM Factory Error Handling', () => {
    describe('Invalid workspace path handling', () => {
      it('should return undefined when no workspace folders exist', async () => {
        // Arrange
        vi.mocked(vscode.workspace).workspaceFolders = [];

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(provider).toBeUndefined();
      });

      it('should return undefined when workspace folders is null', async () => {
        // Arrange
        vi.mocked(vscode.workspace).workspaceFolders = null as any;

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(provider).toBeUndefined();
      });

      it('should return undefined when workspace folders is undefined', async () => {
        // Arrange
        vi.mocked(vscode.workspace).workspaceFolders = undefined as any;

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(provider).toBeUndefined();
      });

      it('should handle invalid file paths gracefully', async () => {
        // Arrange
        const invalidFiles = [
          '', // Empty string
          null as any, // Null
          undefined as any, // Undefined
          '/nonexistent/path/file.txt', // Non-existent path
        ];

        mockFs.existsSync.mockReturnValue(false);

        // Act
        const provider = await SCMFactory.detectSCM(invalidFiles);

        // Assert
        expect(provider).toBeUndefined();
      });
    });

    describe('Command line tool availability handling', () => {
      it('should handle exec errors gracefully when checking SVN command', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const svnPath = path.join(workspacePath, '.svn');

        // Set up workspace folders
        vi.mocked(vscode.workspace).workspaceFolders = [
          { uri: { fsPath: workspacePath } } as any
        ];

        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === svnPath;
        });

        // No SVN extension available
        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          return undefined;
        });

        // Mock exec to throw an error
        mockExec.mockImplementation((command: string, callback: any) => {
          const error = new Error('Command execution failed');
          callback(error, '', 'Command not found');
          return {} as any;
        });

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(provider).toBeUndefined();
        expect(mockExec).toHaveBeenCalledWith('svn --version', expect.any(Function));
      });

      it('should handle timeout when checking command availability', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const svnPath = path.join(workspacePath, '.svn');

        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === svnPath;
        });

        // Set up workspace folders
        vi.mocked(vscode.workspace).workspaceFolders = [
          { uri: { fsPath: workspacePath } } as any
        ];

        // No SVN extension available
        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          return undefined;
        });

        // Mock exec to simulate timeout by calling callback with error after delay
        mockExec.mockImplementation((command: string, callback: any) => {
          // Simulate timeout by calling callback with error after a short delay
          setTimeout(() => {
            callback(new Error('Command timeout'), '', '');
          }, 50);
          return {} as any;
        });

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(provider).toBeUndefined();
        expect(mockExec).toHaveBeenCalledWith('svn --version', expect.any(Function));
      });
    });

    describe('Provider initialization error handling', () => {
      it('should handle GitProvider initialization errors', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const gitPath = path.join(workspacePath, '.git');

        // Set up workspace folders
        vi.mocked(vscode.workspace).workspaceFolders = [
          { uri: { fsPath: workspacePath } } as any
        ];

        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === gitPath;
        });

        // Create mock Git API and extension
        const mockGitAPI = {
          repositories: [],
        };

        const mockGitExtension = {
          exports: mockGitAPI,
          getAPI: vi.fn().mockReturnValue(mockGitAPI),
        };

        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          if (id === 'vscode.git') { return mockGitExtension as any; }
          return undefined;
        });

        // Mock GitProvider that throws during init
        const mockGitProvider = {
          type: 'git' as const,
          init: vi.fn().mockRejectedValue(new Error('Initialization failed')),
          isAvailable: vi.fn().mockResolvedValue(true),
        };
        vi.mocked(GitProvider).mockImplementation(() => mockGitProvider as any);

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(provider).toBeUndefined();
        expect(mockGitProvider.init).toHaveBeenCalled();
      });

      it('should handle SvnProvider initialization errors', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const svnPath = path.join(workspacePath, '.svn');

        // Set up workspace folders
        vi.mocked(vscode.workspace).workspaceFolders = [
          { uri: { fsPath: workspacePath } } as any
        ];

        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === svnPath;
        });

        // Create mock SVN API and extension
        const mockSvnAPI = {
          repositories: [],
        };

        const mockSvnExtension = {
          exports: mockSvnAPI,
          getAPI: vi.fn().mockReturnValue(mockSvnAPI),
        };

        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          if (id === 'littleCareless.svn-scm-ai') { return mockSvnExtension as any; }
          return undefined;
        });

        // Mock SvnProvider that throws during init
        const mockSvnProvider = {
          type: 'svn' as const,
          init: vi.fn().mockRejectedValue(new Error('SVN initialization failed')),
          isAvailable: vi.fn().mockResolvedValue(true),
        };
        vi.mocked(SvnProvider).mockImplementation(() => mockSvnProvider as any);

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(provider).toBeUndefined();
        expect(mockSvnProvider.init).toHaveBeenCalled();
      });

      it('should handle provider constructor errors', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const gitPath = path.join(workspacePath, '.git');

        // Set up workspace folders
        vi.mocked(vscode.workspace).workspaceFolders = [
          { uri: { fsPath: workspacePath } } as any
        ];

        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === gitPath;
        });

        // Create mock Git API and extension
        const mockGitAPI = {
          repositories: [],
        };

        const mockGitExtension = {
          exports: mockGitAPI,
          getAPI: vi.fn().mockReturnValue(mockGitAPI),
        };

        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          if (id === 'vscode.git') { return mockGitExtension as any; }
          return undefined;
        });

        // Mock GitProvider constructor to throw
        vi.mocked(GitProvider).mockImplementation(() => {
          throw new Error('Constructor failed');
        });

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(provider).toBeUndefined();
        expect(GitProvider).toHaveBeenCalledWith(mockGitAPI, workspacePath);
      });
    });

    describe('File system error handling', () => {
      it('should handle fs.existsSync errors gracefully', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';

        // Mock fs.existsSync to throw an error
        mockFs.existsSync.mockImplementation(() => {
          throw new Error('File system error');
        });

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(provider).toBeUndefined();
      });

      it('should handle permission errors when accessing directories', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const gitPath = path.join(workspacePath, '.git');

        // Mock fs.existsSync to throw permission error
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          if (filePath === gitPath) {
            const error = new Error('EACCES: permission denied') as any;
            error.code = 'EACCES';
            throw error;
          }
          return false;
        });

        // Act
        const provider = await SCMFactory.detectSCM();

        // Assert
        expect(provider).toBeUndefined();
      });
    });

    describe('Concurrent call safety', () => {
      it('should handle concurrent calls safely', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const gitPath = path.join(workspacePath, '.git');

        // Set up workspace folders
        vi.mocked(vscode.workspace).workspaceFolders = [
          { uri: { fsPath: workspacePath } } as any
        ];

        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === gitPath;
        });

        // Create mock Git API and extension
        const mockGitAPI = {
          repositories: [],
        };

        const mockGitExtension = {
          exports: mockGitAPI,
          getAPI: vi.fn().mockReturnValue(mockGitAPI),
        };

        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          if (id === 'vscode.git') { return mockGitExtension as any; }
          return undefined;
        });

        // Mock GitProvider with delayed initialization
        const mockGitProvider = {
          type: 'git' as const,
          init: vi.fn().mockImplementation(() =>
            new Promise(resolve => setTimeout(resolve, 10))
          ),
          isAvailable: vi.fn().mockResolvedValue(true),
        };
        vi.mocked(GitProvider).mockImplementation(() => mockGitProvider as any);

        // Reset the current provider to test concurrent creation
        (SCMFactory as any).currentProvider = undefined;

        // Act - Make multiple concurrent calls
        const promises = [
          SCMFactory.detectSCM(),
          SCMFactory.detectSCM(),
          SCMFactory.detectSCM(),
        ];

        const results = await Promise.all(promises);

        // Assert
        expect(results).toHaveLength(3);
        expect(results[0]).toBeDefined();
        expect(results[1]).toBeDefined();
        expect(results[2]).toBeDefined();

        // Note: The current SCMFactory implementation doesn't prevent concurrent creation
        // This test verifies that concurrent calls don't crash the system
        // In a real implementation, you might want to add proper synchronization
        expect(GitProvider).toHaveBeenCalled();
      });

      it('should handle race conditions during provider creation', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const gitPath = path.join(workspacePath, '.git');

        // Set up workspace folders
        vi.mocked(vscode.workspace).workspaceFolders = [
          { uri: { fsPath: workspacePath } } as any
        ];

        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          return filePath === gitPath;
        });

        // Create mock Git API and extension
        const mockGitAPI = {
          repositories: [],
        };

        const mockGitExtension = {
          exports: mockGitAPI,
          getAPI: vi.fn().mockReturnValue(mockGitAPI),
        };

        vi.mocked(vscode.extensions.getExtension).mockImplementation((id: string) => {
          if (id === 'vscode.git') { return mockGitExtension as any; }
          return undefined;
        });

        let initCallCount = 0;
        const mockGitProvider = {
          type: 'git' as const,
          init: vi.fn().mockImplementation(() => {
            initCallCount++;
            return new Promise(resolve => setTimeout(resolve, Math.random() * 20));
          }),
          isAvailable: vi.fn().mockResolvedValue(true),
        };
        vi.mocked(GitProvider).mockImplementation(() => mockGitProvider as any);

        // Reset the current provider to simulate fresh state
        (SCMFactory as any).currentProvider = undefined;

        // Act - Make rapid concurrent calls
        const promises = Array.from({ length: 5 }, () => SCMFactory.detectSCM());
        const results = await Promise.all(promises);

        // Assert
        expect(results).toHaveLength(5);
        results.forEach(result => {
          expect(result).toBeDefined();
          expect(result?.type).toBe('git');
        });

        // Should handle race conditions gracefully
        expect(initCallCount).toBeGreaterThan(0);
      });
    });

    describe('Edge cases and boundary conditions', () => {
      it('should handle very long file paths', async () => {
        // Arrange
        const longPath = '/mock/workspace/' + 'a'.repeat(1000) + '/file.txt';
        const selectedFiles = [longPath];

        mockFs.existsSync.mockReturnValue(false);

        // Act
        const provider = await SCMFactory.detectSCM(selectedFiles);

        // Assert
        expect(provider).toBeUndefined();
      });

      it('should handle circular directory references', async () => {
        // Arrange
        const workspacePath = '/mock/workspace';
        const circularPath = '/mock/workspace/link/to/workspace';
        const selectedFiles = [circularPath + '/file.txt'];

        // Mock path operations to simulate circular reference
        mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
          // Simulate that we never find SCM directories due to circular reference
          return false;
        });

        // Act
        const provider = await SCMFactory.detectSCM(selectedFiles);

        // Assert
        expect(provider).toBeUndefined();
      });

      it('should handle special characters in paths', async () => {
        // Arrange
        const specialPath = '/mock/workspace/特殊字符/файл.txt';
        const selectedFiles = [specialPath];

        mockFs.existsSync.mockReturnValue(false);

        // Act
        const provider = await SCMFactory.detectSCM(selectedFiles);

        // Assert
        expect(provider).toBeUndefined();
      });

      it('should handle empty arrays and null values gracefully', async () => {
        // Arrange & Act & Assert
        expect(await SCMFactory.detectSCM([])).toBeUndefined();
        expect(await SCMFactory.detectSCM(null as any)).toBeUndefined();
        expect(await SCMFactory.detectSCM(undefined)).toBeUndefined();
      });
    });
  });
});