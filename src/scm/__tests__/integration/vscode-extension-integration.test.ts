/**
 * VS Code Extension Integration Tests
 * Tests the integration between SCM providers and VS Code extensions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { GitProvider } from '../../git-provider';
import { SvnProvider } from '../../svn-provider';
import { CliSvnProvider } from '../../cli-svn-provider';
import { SCMFactory } from '../../scm-provider';
import {
  MockVSCodeAPIFactory,
  MockGitExtensionFactory,
  MockSvnExtensionFactory,
} from '../helpers/mock-factories';
import {
  MockVSCodeAPI,
  MockGitExtension,
  MockSvnExtension,
} from '../helpers/test-interfaces';

// Mock util module for promisify
vi.mock('util', () => ({
  promisify: vi.fn((fn) => vi.fn().mockResolvedValue({ stdout: '', stderr: '' })),
}));

// Mock child_process module
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

describe('VS Code Extension Integration Tests', () => {
  let mockVSCode: MockVSCodeAPI;

  beforeEach(() => {
    // Create fresh mock for each test
    mockVSCode = MockVSCodeAPIFactory.create();

    // Replace vscode mock with our test-specific mock
    Object.assign(vi.mocked(vscode), mockVSCode);

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Git Extension API Integration', () => {
    it('should successfully integrate with Git extension when available', async () => {
      // Arrange
      const workspacePath = '/test/git/workspace';
      const gitExtension = MockGitExtensionFactory.create({
        repositories: [{ rootUri: { fsPath: workspacePath } }],
      });

      MockVSCodeAPIFactory.configureWorkspaceFolders(mockVSCode, [workspacePath]);
      MockVSCodeAPIFactory.configureExtensions(mockVSCode, {
        'vscode.git': gitExtension,
      });

      // Mock promisified exec to return git version
      const { promisify } = await import('util');
      const mockExec = vi.mocked(promisify).mockReturnValue(
        vi.fn().mockResolvedValue({ stdout: 'git version 2.34.1', stderr: '' })
      );

      // Act
      const provider = new GitProvider(gitExtension, workspacePath);
      await provider.init();
      const isAvailable = await provider.isAvailable();

      // Assert
      expect(isAvailable).toBe(true);
      expect(provider.type).toBe('git');
      expect(gitExtension.getAPI).toHaveBeenCalledWith(1);
    });

    it('should handle Git extension API calls correctly', async () => {
      // Arrange
      const workspacePath = '/test/git/workspace';
      const gitExtension = MockGitExtensionFactory.create({
        repositories: [{
          rootUri: { fsPath: workspacePath },
          inputBox: { value: '' },
        }],
      });

      MockVSCodeAPIFactory.configureWorkspaceFolders(mockVSCode, [workspacePath]);

      // Mock promisified exec
      const { promisify } = await import('util');
      vi.mocked(promisify).mockReturnValue(
        vi.fn().mockResolvedValue({ stdout: 'git version 2.34.1', stderr: '' })
      );

      const provider = new GitProvider(gitExtension, workspacePath);
      await provider.init();

      // Act & Assert - Test setCommitInput
      await provider.setCommitInput('Test commit message');
      const api = gitExtension.getAPI(1);
      expect(api.repositories[0].inputBox.value).toBe('Test commit message');

      // Act & Assert - Test getCommitInput
      const commitInput = await provider.getCommitInput();
      expect(commitInput).toBe('Test commit message');

      // Act & Assert - Test commit
      await provider.commit('Test commit', ['file1.txt']);
      expect(api.repositories[0].commit).toHaveBeenCalledWith(
        'Test commit',
        { all: false, files: ['file1.txt'] }
      );
    });

    it('should handle Git extension errors gracefully', async () => {
      // Arrange
      const workspacePath = '/test/git/workspace';
      const gitExtension = MockGitExtensionFactory.create({
        repositories: [{
          rootUri: { fsPath: workspacePath },
          commit: vi.fn().mockRejectedValue(new Error('Git commit failed')),
        }],
      });

      MockVSCodeAPIFactory.configureWorkspaceFolders(mockVSCode, [workspacePath]);

      // Mock promisified exec
      const { promisify } = await import('util');
      vi.mocked(promisify).mockReturnValue(
        vi.fn().mockResolvedValue({ stdout: 'git version 2.34.1', stderr: '' })
      );

      const provider = new GitProvider(gitExtension, workspacePath);
      await provider.init();

      // Act & Assert
      await expect(provider.commit('Test commit')).rejects.toThrow('Git commit failed');
    });
  });

  describe('SVN Extension API Integration', () => {
    it('should successfully integrate with SVN extension when available', async () => {
      // Arrange
      const workspacePath = '/test/svn/workspace';
      const svnExtension = MockSvnExtensionFactory.create({
        repositories: [{ rootUri: { fsPath: workspacePath } }],
      });

      MockVSCodeAPIFactory.configureWorkspaceFolders(mockVSCode, [workspacePath]);
      MockVSCodeAPIFactory.configureExtensions(mockVSCode, {
        'littleCareless.svn-scm-ai': svnExtension,
      });

      // Mock promisified exec to return SVN version
      const { promisify } = await import('util');
      vi.mocked(promisify).mockReturnValue(
        vi.fn().mockResolvedValue({ stdout: 'svn, version 1.14.1 (r1886195)', stderr: '' })
      );

      // Act
      const provider = new SvnProvider(svnExtension);
      await provider.init();
      const isAvailable = await provider.isAvailable();

      // Assert
      expect(isAvailable).toBe(true);
      expect(provider.type).toBe('svn');
      expect(svnExtension.getAPI).toHaveBeenCalled();
    });

    it('should handle SVN extension API calls correctly', async () => {
      // Arrange
      const workspacePath = '/test/svn/workspace';
      const svnExtension = MockSvnExtensionFactory.create({
        repositories: [{
          rootUri: { fsPath: workspacePath },
          inputBox: { value: '' },
        }],
      });

      MockVSCodeAPIFactory.configureWorkspaceFolders(mockVSCode, [workspacePath]);

      // Mock promisified exec
      const { promisify } = await import('util');
      vi.mocked(promisify).mockReturnValue(
        vi.fn().mockResolvedValue({ stdout: 'svn, version 1.14.1 (r1886195)', stderr: '' })
      );

      const provider = new SvnProvider(svnExtension);
      await provider.init();

      // Act & Assert - Test setCommitInput
      await provider.setCommitInput('Test SVN commit message');
      const api = svnExtension.getAPI();
      expect(api.repositories[0].inputBox.value).toBe('Test SVN commit message');

      // Act & Assert - Test getCommitInput
      const commitInput = await provider.getCommitInput();
      expect(commitInput).toBe('Test SVN commit message');

      // Act & Assert - Test commit
      await provider.commit('Test SVN commit', ['file1.txt']);
      expect(api.repositories[0].commitFiles).toHaveBeenCalledWith(
        ['file1.txt'],
        'Test SVN commit'
      );
    });

    it('should handle SVN extension errors gracefully', async () => {
      // Arrange
      const workspacePath = '/test/svn/workspace';
      const svnExtension = MockSvnExtensionFactory.create({
        repositories: [{
          rootUri: { fsPath: workspacePath },
          commitFiles: vi.fn().mockRejectedValue(new Error('SVN commit failed')),
        }],
      });

      MockVSCodeAPIFactory.configureWorkspaceFolders(mockVSCode, [workspacePath]);

      // Mock promisified exec
      const { promisify } = await import('util');
      vi.mocked(promisify).mockReturnValue(
        vi.fn().mockResolvedValue({ stdout: 'svn, version 1.14.1 (r1886195)', stderr: '' })
      );

      const provider = new SvnProvider(svnExtension);
      await provider.init();

      // Act & Assert
      await expect(provider.commit('Test commit', ['file1.txt'])).rejects.toThrow();
    });
  });

  describe('Extension Unavailable Fallback Mechanism', () => {
    it('should fallback to CLI SVN when SVN extension is unavailable', async () => {
      // Arrange
      const workspacePath = '/test/svn/workspace';

      MockVSCodeAPIFactory.configureWorkspaceFolders(mockVSCode, [workspacePath]);
      MockVSCodeAPIFactory.configureExtensions(mockVSCode, {}); // No extensions available

      // Mock file system to simulate .svn directory
      const fs = await import('fs');
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return path.toString().includes('.svn');
      });

      // Mock promisified exec for SVN command availability
      const { promisify } = await import('util');
      vi.mocked(promisify).mockReturnValue(
        vi.fn().mockResolvedValue({ stdout: 'svn, version 1.14.1 (r1886195)', stderr: '' })
      );

      // Act
      const provider = await SCMFactory.detectSCM(undefined, workspacePath);

      // Assert
      expect(provider).toBeDefined();
      expect(provider?.type).toBe('svn');
      expect(provider).toBeInstanceOf(CliSvnProvider);
    });

    it('should handle clipboard fallback when extension inputBox is unavailable', async () => {
      // Arrange
      const workspacePath = '/test/git/workspace';
      const gitExtension = MockGitExtensionFactory.create({
        repositories: [{
          rootUri: { fsPath: workspacePath },
          inputBox: undefined as any, // Simulate unavailable inputBox
        }],
      });

      MockVSCodeAPIFactory.configureWorkspaceFolders(mockVSCode, [workspacePath]);

      // Mock promisified exec
      const { promisify } = await import('util');
      vi.mocked(promisify).mockReturnValue(
        vi.fn().mockResolvedValue({ stdout: 'git version 2.34.1', stderr: '' })
      );

      const provider = new GitProvider(gitExtension, workspacePath);
      await provider.init();

      // Act
      await provider.setCommitInput('Test commit message');

      // Assert - Should fallback to clipboard
      expect(mockVSCode.env.clipboard.writeText).toHaveBeenCalledWith('Test commit message');
    });

    it('should handle extension activation failures gracefully', async () => {
      // Arrange
      const workspacePath = '/test/git/workspace';
      const gitExtension = {
        getAPI: vi.fn().mockImplementation(() => {
          throw new Error('Extension activation failed');
        }),
        isActive: false,
      };

      MockVSCodeAPIFactory.configureWorkspaceFolders(mockVSCode, [workspacePath]);

      // Act & Assert
      expect(() => new GitProvider(gitExtension, workspacePath)).toThrow('Extension activation failed');
    });

    it('should return undefined when no SCM system is detected', async () => {
      // Arrange
      const workspacePath = '/test/no-scm/workspace';

      MockVSCodeAPIFactory.configureWorkspaceFolders(mockVSCode, [workspacePath]);
      MockVSCodeAPIFactory.configureExtensions(mockVSCode, {}); // No extensions

      // Mock file system to simulate no SCM directories
      const fs = await import('fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act
      const provider = await SCMFactory.detectSCM(undefined, workspacePath);

      // Assert
      expect(provider).toBeUndefined();
    });
  });

  describe('Extension Configuration Integration', () => {
    it('should respond to configuration changes in Git extension', async () => {
      // Arrange
      const workspacePath = '/test/git/workspace';
      const gitExtension = MockGitExtensionFactory.create({
        repositories: [{ rootUri: { fsPath: workspacePath } }],
      });

      MockVSCodeAPIFactory.configureWorkspaceFolders(mockVSCode, [workspacePath]);

      // Mock promisified exec
      const { promisify } = await import('util');
      vi.mocked(promisify).mockReturnValue(
        vi.fn().mockResolvedValue({ stdout: 'git version 2.34.1', stderr: '' })
      );

      // Mock configuration
      const mockConfig = {
        get: vi.fn().mockReturnValue('test-value'),
        has: vi.fn().mockReturnValue(true),
        inspect: vi.fn(),
        update: vi.fn(),
      };
      mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);

      const provider = new GitProvider(gitExtension, workspacePath);
      await provider.init();

      // Act - Simulate configuration change
      const configChangeCallback = mockVSCode.workspace.onDidChangeConfiguration.mock.calls[0]?.[0];
      if (configChangeCallback) {
        configChangeCallback({ affectsConfiguration: vi.fn().mockReturnValue(true) });
      }

      // Assert - Configuration should be accessible
      expect(mockVSCode.workspace.getConfiguration).toHaveBeenCalled();
    });

    it('should handle SVN extension configuration correctly', async () => {
      // Arrange
      const workspacePath = '/test/svn/workspace';
      const svnExtension = MockSvnExtensionFactory.create({
        repositories: [{ rootUri: { fsPath: workspacePath } }],
      });

      MockVSCodeAPIFactory.configureWorkspaceFolders(mockVSCode, [workspacePath]);

      // Mock promisified exec
      const { promisify } = await import('util');
      vi.mocked(promisify).mockReturnValue(
        vi.fn().mockResolvedValue({ stdout: 'svn, version 1.14.1 (r1886195)', stderr: '' })
      );

      // Mock SVN-specific configuration
      const mockConfig = {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'svnPath') {return '/usr/bin/svn';}
          if (key === 'environmentPath') {return ['/usr/local/bin'];}
          if (key === 'locale') {return 'en_US.UTF-8';}
          return undefined;
        }),
        has: vi.fn().mockReturnValue(true),
        inspect: vi.fn(),
        update: vi.fn(),
      };
      mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);

      const provider = new SvnProvider(svnExtension);
      await provider.init();

      // Assert - Configuration should be loaded
      expect(mockVSCode.workspace.getConfiguration).toHaveBeenCalledWith('svn-commit-gen');
    });
  });
});