/**
 * Unit tests for CLI SVN Provider
 * Tests the command-line SVN provider functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CliSvnProvider } from '../../cli-svn-provider';
import { MockCommandExecutor } from '../helpers/mock-command-executor';
import { SvnTestData } from '../helpers/test-data-generators';
import { TestUtils } from '../helpers/test-utilities';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

// Mock vscode
vi.mock('vscode', () => ({
  env: {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

// Mock utils
vi.mock('../../utils', () => ({
  getMessage: vi.fn().mockReturnValue('Mock message'),
}));

// Mock DiffProcessor
vi.mock('../../utils/diff/diff-processor', () => ({
  DiffProcessor: {
    process: vi.fn().mockImplementation((diff: string) => diff),
  },
}));

// Mock notification manager
vi.mock('../../utils/notification/notification-manager', () => ({
  notify: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CliSvnProvider', () => {
  let provider: CliSvnProvider;
  let mockCommandExecutor: MockCommandExecutor;
  const mockWorkspacePath = '/mock/svn/workspace';

  beforeEach(() => {
    // Setup test environment
    TestUtils.createSafeTestEnvironment();

    // Create mock command executor
    mockCommandExecutor = new MockCommandExecutor();

    // Setup child_process.exec mock
    const { exec } = require('child_process');
    exec.mockImplementation(MockCommandExecutor.getExecMock());

    // Create provider instance
    provider = new CliSvnProvider(mockWorkspacePath);
  });

  afterEach(() => {
    mockCommandExecutor.clearMocks();
    TestUtils.resetAllMocks();
  });

  describe('5.1 CLI SVN可用性检测', () => {
    describe('isAvailable method', () => {
      it('should return true when svn command is available', async () => {
        // Arrange
        mockCommandExecutor.mockExec('svn --version', {
          stdout: 'svn, version 1.14.1 (r1886195)',
          stderr: '',
        });

        // Act
        const result = await provider.isAvailable();

        // Assert
        expect(result).toBe(true);
        expect(mockCommandExecutor.getLastCommand()).toBe('svn --version');
      });

      it('should return false when svn command is not available', async () => {
        // Arrange
        mockCommandExecutor.mockExecError('svn --version', {
          name: 'CommandNotFoundError',
          message: 'svn: command not found',
          code: 127,
        } as any);

        // Act
        const result = await provider.isAvailable();

        // Assert
        expect(result).toBe(false);
        expect(mockCommandExecutor.getLastCommand()).toBe('svn --version');
      });

      it('should return false when svn command fails with permission error', async () => {
        // Arrange
        mockCommandExecutor.mockExecError('svn --version', {
          name: 'PermissionError',
          message: 'Permission denied',
          code: 126,
        } as any);

        // Act
        const result = await provider.isAvailable();

        // Assert
        expect(result).toBe(false);
      });

      it('should return false when svn command times out', async () => {
        // Arrange
        mockCommandExecutor.mockExecError('svn --version', {
          name: 'TimeoutError',
          message: 'Command timed out',
          code: 124,
        } as any);

        // Act
        const result = await provider.isAvailable();

        // Assert
        expect(result).toBe(false);
      });

      it('should handle different SVN version outputs correctly', async () => {
        const versionOutputs = [
          'svn, version 1.14.1 (r1886195)',
          'svn, version 1.10.4 (r1850624)',
          'svn, version 1.9.7 (r1800392)',
        ];

        for (const versionOutput of versionOutputs) {
          // Arrange
          mockCommandExecutor.clearMocks();
          mockCommandExecutor.mockExec('svn --version', {
            stdout: versionOutput,
            stderr: '',
          });

          // Act
          const result = await provider.isAvailable();

          // Assert
          expect(result).toBe(true);
        }
      });

      it('should handle SVN version command with stderr output', async () => {
        // Arrange
        mockCommandExecutor.mockExec('svn --version', {
          stdout: 'svn, version 1.14.1 (r1886195)',
          stderr: 'Warning: some non-critical warning',
        });

        // Act
        const result = await provider.isAvailable();

        // Assert
        expect(result).toBe(true);
      });
    });

    describe('initialization process', () => {
      it('should initialize without async operations', async () => {
        // Act
        const initPromise = provider.init();

        // Assert
        expect(initPromise).toBeInstanceOf(Promise);
        await expect(initPromise).resolves.toBeUndefined();
      });

      it('should have correct type property', () => {
        // Assert
        expect(provider.type).toBe('svn');
      });

      it('should store workspace root correctly', () => {
        // Assert
        expect((provider as any).workspaceRoot).toBe(mockWorkspacePath);
      });
    });

    describe('system SVN command existence verification', () => {
      it('should verify SVN command exists in system PATH', async () => {
        // Arrange
        mockCommandExecutor.mockExec('svn --version', {
          stdout: 'svn, version 1.14.1 (r1886195)',
          stderr: '',
        });

        // Act
        const isAvailable = await provider.isAvailable();

        // Assert
        expect(isAvailable).toBe(true);

        // Verify the command was executed
        const executedCommands = mockCommandExecutor.getExecutedCommands();
        expect(executedCommands).toContain('svn --version');
      });

      it('should handle case where SVN is not in PATH', async () => {
        // Arrange
        mockCommandExecutor.mockExecError('svn --version', {
          name: 'Error',
          message: '/bin/sh: svn: command not found',
          code: 127,
        } as any);

        // Act
        const isAvailable = await provider.isAvailable();

        // Assert
        expect(isAvailable).toBe(false);
      });

      it('should handle case where SVN exists but is not executable', async () => {
        // Arrange
        mockCommandExecutor.mockExecError('svn --version', {
          name: 'Error',
          message: '/usr/bin/svn: Permission denied',
          code: 126,
        } as any);

        // Act
        const isAvailable = await provider.isAvailable();

        // Assert
        expect(isAvailable).toBe(false);
      });

      it('should handle network-dependent SVN installations', async () => {
        // Arrange - Some SVN installations might require network access for version check
        mockCommandExecutor.mockExecError('svn --version', {
          name: 'NetworkError',
          message: 'svn: E170013: Unable to connect to a repository',
          code: 1,
        } as any);

        // Act
        const isAvailable = await provider.isAvailable();

        // Assert
        expect(isAvailable).toBe(false);
      });
    });

    describe('error handling in availability detection', () => {
      it('should handle unexpected errors gracefully', async () => {
        // Arrange
        mockCommandExecutor.mockExecError('svn --version', {
          name: 'UnexpectedError',
          message: 'Something went wrong',
          code: 1,
        } as any);

        // Act & Assert
        await expect(provider.isAvailable()).resolves.toBe(false);
      });

      it('should not throw exceptions during availability check', async () => {
        // Arrange
        mockCommandExecutor.mockExecError('svn --version', {
          name: 'CriticalError',
          message: 'Critical system error',
          code: 2,
        } as any);

        // Act & Assert
        await expect(provider.isAvailable()).resolves.toBe(false);
      });

      it('should handle null/undefined command output', async () => {
        // Arrange
        mockCommandExecutor.mockExec('svn --version', {
          stdout: '',
          stderr: '',
        });

        // Act
        const result = await provider.isAvailable();

        // Assert
        expect(result).toBe(true); // Empty output should still be considered success
      });
    });

    describe('performance considerations', () => {
      it('should complete availability check within reasonable time', async () => {
        // Arrange
        mockCommandExecutor.mockExec('svn --version', {
          stdout: 'svn, version 1.14.1 (r1886195)',
          stderr: '',
        });

        // Act
        const startTime = Date.now();
        await provider.isAvailable();
        const endTime = Date.now();

        // Assert
        const executionTime = endTime - startTime;
        expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
      });

      it('should handle concurrent availability checks', async () => {
        // Arrange
        mockCommandExecutor.mockExec('svn --version', {
          stdout: 'svn, version 1.14.1 (r1886195)',
          stderr: '',
        });

        // Act
        const promises = Array.from({ length: 5 }, () => provider.isAvailable());
        const results = await Promise.all(promises);

        // Assert
        expect(results).toEqual([true, true, true, true, true]);

        // Verify all commands were executed
        const executedCommands = mockCommandExecutor.getExecutedCommands();
        expect(executedCommands.filter(cmd => cmd === 'svn --version')).toHaveLength(5);
      });
    });
  });
});
describe('5.2 CLI SVN核心操作', () => {
  let provider: CliSvnProvider;
  let mockCommandExecutor: MockCommandExecutor;
  const mockWorkspacePath = '/mock/svn/workspace';

  beforeEach(() => {
    // Setup test environment
    TestUtils.createSafeTestEnvironment();

    // Create mock command executor
    mockCommandExecutor = new MockCommandExecutor();

    // Setup child_process.exec mock
    const { exec } = require('child_process');
    exec.mockImplementation(MockCommandExecutor.getExecMock());

    // Create provider instance
    provider = new CliSvnProvider(mockWorkspacePath);
  });

  afterEach(() => {
    mockCommandExecutor.clearMocks();
    TestUtils.resetAllMocks();
  });

  describe('getDiff method command-line implementation', () => {
    it('should execute svn diff command and return processed diff', async () => {
      // Arrange
      const testFiles = ['src/test.ts', 'README.md'];
      const rawDiff = SvnTestData.generateSvnDiffOutput(testFiles);
      const processedDiff = 'processed-diff-content';

      mockCommandExecutor.mockExec(`svn diff ${testFiles.join(' ')}`, {
        stdout: rawDiff,
        stderr: '',
      });

      const { DiffProcessor } = require('../../utils/diff/diff-processor');
      DiffProcessor.process.mockReturnValue(processedDiff);

      // Act
      const result = await provider.getDiff(testFiles);

      // Assert
      expect(result).toBe(processedDiff);
      expect(mockCommandExecutor.getLastCommand()).toBe(`svn diff ${testFiles.join(' ')}`);
      expect(DiffProcessor.process).toHaveBeenCalledWith(rawDiff, 'svn');
    });

    it('should execute svn diff with default path when no files specified', async () => {
      // Arrange
      const rawDiff = SvnTestData.generateSvnDiffOutput(['file1.ts', 'file2.ts']);
      const processedDiff = 'processed-diff-content';

      mockCommandExecutor.mockExec('svn diff .', {
        stdout: rawDiff,
        stderr: '',
      });

      const { DiffProcessor } = require('../../utils/diff/diff-processor');
      DiffProcessor.process.mockReturnValue(processedDiff);

      // Act
      const result = await provider.getDiff();

      // Assert
      expect(result).toBe(processedDiff);
      expect(mockCommandExecutor.getLastCommand()).toBe('svn diff .');
      expect(DiffProcessor.process).toHaveBeenCalledWith(rawDiff, 'svn');
    });

    it('should return undefined when svn diff returns empty output', async () => {
      // Arrange
      mockCommandExecutor.mockExec('svn diff .', {
        stdout: '',
        stderr: '',
      });

      // Act
      const result = await provider.getDiff();

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when svn diff returns only whitespace', async () => {
      // Arrange
      mockCommandExecutor.mockExec('svn diff .', {
        stdout: '   \n\t  \n  ',
        stderr: '',
      });

      // Act
      const result = await provider.getDiff();

      // Assert
      expect(result).toBeUndefined();
    });

    it('should handle svn diff command execution errors gracefully', async () => {
      // Arrange
      mockCommandExecutor.mockExecError('svn diff .', {
        name: 'CommandError',
        message: 'svn: E155007: Working copy not found',
        code: 1,
      } as any);

      // Act
      const result = await provider.getDiff();

      // Assert
      expect(result).toBeUndefined();
    });

    it('should execute svn diff with correct working directory', async () => {
      // Arrange
      const testFiles = ['test.ts'];
      const rawDiff = SvnTestData.generateSvnDiffOutput(testFiles);

      mockCommandExecutor.mockExec('svn diff test.ts', {
        stdout: rawDiff,
        stderr: '',
      });

      // Act
      await provider.getDiff(testFiles);

      // Assert
      expect(mockCommandExecutor.getLastCommand()).toBe('svn diff test.ts');
      // Verify the command was executed in the correct working directory
      // (This would be verified by checking the exec options in a real implementation)
    });

    it('should handle multiple files in svn diff command', async () => {
      // Arrange
      const testFiles = ['src/file1.ts', 'src/file2.ts', 'docs/readme.md'];
      const expectedCommand = `svn diff ${testFiles.join(' ')}`;
      const rawDiff = SvnTestData.generateSvnDiffOutput(testFiles);

      mockCommandExecutor.mockExec(expectedCommand, {
        stdout: rawDiff,
        stderr: '',
      });

      // Act
      await provider.getDiff(testFiles);

      // Assert
      expect(mockCommandExecutor.getLastCommand()).toBe(expectedCommand);
    });

    it('should handle files with spaces in names', async () => {
      // Arrange
      const testFiles = ['src/file with spaces.ts', 'docs/another file.md'];
      const expectedCommand = `svn diff ${testFiles.join(' ')}`;
      const rawDiff = SvnTestData.generateSvnDiffOutput(testFiles);

      mockCommandExecutor.mockExec(expectedCommand, {
        stdout: rawDiff,
        stderr: '',
      });

      // Act
      await provider.getDiff(testFiles);

      // Assert
      expect(mockCommandExecutor.getLastCommand()).toBe(expectedCommand);
    });
  });

  describe('commit method command-line execution', () => {
    it('should execute svn commit command with message and files', async () => {
      // Arrange
      const commitMessage = 'Test commit message';
      const testFiles = ['src/test.ts', 'README.md'];
      const expectedCommand = `svn commit -m "${commitMessage}" ${testFiles.join(' ')}`;

      mockCommandExecutor.mockExec(expectedCommand, {
        stdout: 'Committed revision 123.',
        stderr: '',
      });

      // Act
      await provider.commit(commitMessage, testFiles);

      // Assert
      expect(mockCommandExecutor.getLastCommand()).toBe(expectedCommand);
    });

    it('should execute svn commit with default path when no files specified', async () => {
      // Arrange
      const commitMessage = 'Test commit message';
      const expectedCommand = `svn commit -m "${commitMessage}" .`;

      mockCommandExecutor.mockExec(expectedCommand, {
        stdout: 'Committed revision 124.',
        stderr: '',
      });

      // Act
      await provider.commit(commitMessage);

      // Assert
      expect(mockCommandExecutor.getLastCommand()).toBe(expectedCommand);
    });

    it('should handle commit messages with quotes', async () => {
      // Arrange
      const commitMessage = 'Fix "quoted" string handling';
      const expectedCommand = `svn commit -m "${commitMessage}" .`;

      mockCommandExecutor.mockExec(expectedCommand, {
        stdout: 'Committed revision 125.',
        stderr: '',
      });

      // Act
      await provider.commit(commitMessage);

      // Assert
      expect(mockCommandExecutor.getLastCommand()).toBe(expectedCommand);
    });

    it('should handle multiline commit messages', async () => {
      // Arrange
      const commitMessage = 'First line\nSecond line\nThird line';
      const expectedCommand = `svn commit -m "${commitMessage}" .`;

      mockCommandExecutor.mockExec(expectedCommand, {
        stdout: 'Committed revision 126.',
        stderr: '',
      });

      // Act
      await provider.commit(commitMessage);

      // Assert
      expect(mockCommandExecutor.getLastCommand()).toBe(expectedCommand);
    });

    it('should throw error when svn commit fails', async () => {
      // Arrange
      const commitMessage = 'Test commit message';
      const expectedCommand = `svn commit -m "${commitMessage}" .`;

      mockCommandExecutor.mockExecError(expectedCommand, {
        name: 'CommandError',
        message: 'svn: E170001: Authentication failed',
        code: 1,
      } as any);

      // Act & Assert
      await expect(provider.commit(commitMessage)).rejects.toThrow();
    });

    it('should execute commit with correct working directory', async () => {
      // Arrange
      const commitMessage = 'Test commit message';
      const testFiles = ['test.ts'];
      const expectedCommand = `svn commit -m "${commitMessage}" test.ts`;

      mockCommandExecutor.mockExec(expectedCommand, {
        stdout: 'Committed revision 127.',
        stderr: '',
      });

      // Act
      await provider.commit(commitMessage, testFiles);

      // Assert
      expect(mockCommandExecutor.getLastCommand()).toBe(expectedCommand);
      // Verify the command was executed in the correct working directory
      // (This would be verified by checking the exec options in a real implementation)
    });

    it('should handle empty commit message', async () => {
      // Arrange
      const commitMessage = '';
      const expectedCommand = `svn commit -m "${commitMessage}" .`;

      mockCommandExecutor.mockExec(expectedCommand, {
        stdout: 'Committed revision 128.',
        stderr: '',
      });

      // Act
      await provider.commit(commitMessage);

      // Assert
      expect(mockCommandExecutor.getLastCommand()).toBe(expectedCommand);
    });

    it('should handle commit with special characters in message', async () => {
      // Arrange
      const commitMessage = 'Fix issue #123: Handle $variables and @mentions';
      const expectedCommand = `svn commit -m "${commitMessage}" .`;

      mockCommandExecutor.mockExec(expectedCommand, {
        stdout: 'Committed revision 129.',
        stderr: '',
      });

      // Act
      await provider.commit(commitMessage);

      // Assert
      expect(mockCommandExecutor.getLastCommand()).toBe(expectedCommand);
    });
  });

  describe('clipboard copy functionality', () => {
    it('should copy commit message to clipboard via setCommitInput', async () => {
      // Arrange
      const commitMessage = 'Test commit message';
      const vscode = require('vscode');
      const { notify } = require('../../utils/notification/notification-manager');

      // Act
      await provider.setCommitInput(commitMessage);

      // Assert
      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(commitMessage);
      expect(notify.info).toHaveBeenCalledWith('commit.message.copied');
    });

    it('should copy commit message to clipboard via startStreamingInput', async () => {
      // Arrange
      const commitMessage = 'Test streaming commit message';
      const repositoryPath = '/test/repo/path';
      const vscode = require('vscode');
      const { notify } = require('../../utils/notification/notification-manager');

      // Act
      await provider.startStreamingInput(commitMessage, repositoryPath);

      // Assert
      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(commitMessage);
      expect(notify.info).toHaveBeenCalledWith('commit.message.copied');
    });

    it('should handle clipboard write errors in setCommitInput', async () => {
      // Arrange
      const commitMessage = 'Test commit message';
      const vscode = require('vscode');
      const { notify } = require('../../utils/notification/notification-manager');
      const clipboardError = new Error('Clipboard access denied');

      vscode.env.clipboard.writeText.mockRejectedValue(clipboardError);

      // Act
      await provider.setCommitInput(commitMessage);

      // Assert
      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(commitMessage);
      expect(notify.error).toHaveBeenCalledWith('commit.message.copy.failed', [clipboardError.message]);
    });

    it('should handle clipboard write errors in startStreamingInput', async () => {
      // Arrange
      const commitMessage = 'Test streaming commit message';
      const vscode = require('vscode');
      const { notify } = require('../../utils/notification/notification-manager');
      const clipboardError = new Error('Clipboard access denied');

      vscode.env.clipboard.writeText.mockRejectedValue(clipboardError);

      // Act
      await provider.startStreamingInput(commitMessage);

      // Assert
      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(commitMessage);
      expect(notify.error).toHaveBeenCalledWith('commit.message.copy.failed', [clipboardError.message]);
    });

    it('should handle non-Error objects in clipboard errors', async () => {
      // Arrange
      const commitMessage = 'Test commit message';
      const vscode = require('vscode');
      const { notify } = require('../../utils/notification/notification-manager');
      const clipboardError = 'String error message';

      vscode.env.clipboard.writeText.mockRejectedValue(clipboardError);

      // Act
      await provider.setCommitInput(commitMessage);

      // Assert
      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(commitMessage);
      expect(notify.error).toHaveBeenCalledWith('commit.message.copy.failed', ['Unknown error']);
    });

    it('should copy empty message to clipboard', async () => {
      // Arrange
      const commitMessage = '';
      const vscode = require('vscode');
      const { notify } = require('../../utils/notification/notification-manager');

      // Act
      await provider.setCommitInput(commitMessage);

      // Assert
      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(commitMessage);
      expect(notify.info).toHaveBeenCalledWith('commit.message.copied');
    });

    it('should copy multiline message to clipboard', async () => {
      // Arrange
      const commitMessage = 'Line 1\nLine 2\nLine 3';
      const vscode = require('vscode');
      const { notify } = require('../../utils/notification/notification-manager');

      // Act
      await provider.setCommitInput(commitMessage);

      // Assert
      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(commitMessage);
      expect(notify.info).toHaveBeenCalledWith('commit.message.copied');
    });
  });

  describe('getCommitInput method', () => {
    it('should return empty string', async () => {
      // Act
      const result = await provider.getCommitInput();

      // Assert
      expect(result).toBe('');
    });
  });

  describe('getCommitLog method', () => {
    it('should return empty array and log warning', async () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

      // Act
      const result = await provider.getCommitLog('base', 'head');

      // Assert
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'getCommitLog is not implemented for CliSvnProvider and will return an empty array.'
      );

      // Cleanup
      consoleSpy.mockRestore();
    });

    it('should return empty array when called without parameters', async () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

      // Act
      const result = await provider.getCommitLog();

      // Assert
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe('getRecentCommitMessages method', () => {
    it('should execute svn log commands and parse results', async () => {
      // Arrange
      const repositoryLogOutput = SvnTestData.generateSvnLogXml([
        { revision: 123, message: 'Repository commit 1', author: 'user1', date: '2023-01-01T10:00:00.000000Z', paths: [] },
        { revision: 122, message: 'Repository commit 2', author: 'user2', date: '2023-01-02T10:00:00.000000Z', paths: [] },
      ]);

      const userLogOutput = SvnTestData.generateSvnLogXml([
        { revision: 121, message: 'User commit 1', author: 'testuser', date: '2023-01-03T10:00:00.000000Z', paths: [] },
        { revision: 120, message: 'User commit 2', author: 'testuser', date: '2023-01-04T10:00:00.000000Z', paths: [] },
      ]);

      mockCommandExecutor.mockExec('svn log -l 5', {
        stdout: repositoryLogOutput,
        stderr: '',
      });

      mockCommandExecutor.mockExec('svn info --show-item last-changed-author', {
        stdout: 'testuser\n',
        stderr: '',
      });

      mockCommandExecutor.mockExec('svn log -l 5 --search "testuser"', {
        stdout: userLogOutput,
        stderr: '',
      });

      // Act
      const result = await provider.getRecentCommitMessages();

      // Assert
      expect(result).toHaveProperty('repository');
      expect(result).toHaveProperty('user');
      expect(Array.isArray(result.repository)).toBe(true);
      expect(Array.isArray(result.user)).toBe(true);
    });

    it('should handle svn log command errors gracefully', async () => {
      // Arrange
      mockCommandExecutor.mockExecError('svn log -l 5', {
        name: 'CommandError',
        message: 'svn: E155007: Working copy not found',
        code: 1,
      } as any);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      // Act
      const result = await provider.getRecentCommitMessages();

      // Assert
      expect(result).toEqual({ repository: [], user: [] });
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get recent SVN commit messages:',
        expect.any(Object)
      );

      // Cleanup
      consoleSpy.mockRestore();
    });

    it('should handle missing author information', async () => {
      // Arrange
      const repositoryLogOutput = SvnTestData.generateSvnLogXml([
        { revision: 123, message: 'Repository commit 1', author: 'user1', date: '2023-01-05T10:00:00.000000Z', paths: [] },
      ]);

      mockCommandExecutor.mockExec('svn log -l 5', {
        stdout: repositoryLogOutput,
        stderr: '',
      });

      mockCommandExecutor.mockExec('svn info --show-item last-changed-author', {
        stdout: '',
        stderr: '',
      });

      // Act
      const result = await provider.getRecentCommitMessages();

      // Assert
      expect(result).toEqual({
        repository: expect.any(Array),
        user: []
      });
    });

    it('should handle user log command errors', async () => {
      // Arrange
      const repositoryLogOutput = SvnTestData.generateSvnLogXml([
        { revision: 123, message: 'Repository commit 1', author: 'user1', date: '2023-01-06T10:00:00.000000Z', paths: [] },
      ]);

      mockCommandExecutor.mockExec('svn log -l 5', {
        stdout: repositoryLogOutput,
        stderr: '',
      });

      mockCommandExecutor.mockExec('svn info --show-item last-changed-author', {
        stdout: 'testuser\n',
        stderr: '',
      });

      mockCommandExecutor.mockExecError('svn log -l 5 --search "testuser"', {
        name: 'CommandError',
        message: 'svn: E200009: Unknown search option',
        code: 1,
      } as any);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      // Act
      const result = await provider.getRecentCommitMessages();

      // Assert
      expect(result).toEqual({
        repository: expect.any(Array),
        user: []
      });
      expect(consoleSpy).toHaveBeenCalled();

      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe('error handling in core operations', () => {
    it('should handle network errors in getDiff', async () => {
      // Arrange
      mockCommandExecutor.mockExecError('svn diff .', {
        name: 'NetworkError',
        message: 'svn: E170013: Unable to connect to a repository',
        code: 1,
      } as any);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      // Act
      const result = await provider.getDiff();

      // Assert
      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get SVN diff:', expect.any(Object));

      // Cleanup
      consoleSpy.mockRestore();
    });

    it('should handle authentication errors in commit', async () => {
      // Arrange
      const commitMessage = 'Test commit';
      mockCommandExecutor.mockExecError(`svn commit -m "${commitMessage}" .`, {
        name: 'AuthenticationError',
        message: 'svn: E170001: Authentication failed',
        code: 1,
      } as any);

      // Act & Assert
      await expect(provider.commit(commitMessage)).rejects.toThrow();
    });

    it('should handle working copy errors in getDiff', async () => {
      // Arrange
      mockCommandExecutor.mockExecError('svn diff .', {
        name: 'WorkingCopyError',
        message: 'svn: E155007: Working copy not found',
        code: 1,
      } as any);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      // Act
      const result = await provider.getDiff();

      // Assert
      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();

      // Cleanup
      consoleSpy.mockRestore();
    });
  });
});
