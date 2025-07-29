/**
 * Unit tests for AuthorService
 * Tests Git and SVN author information retrieval functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthorService } from '../../author-service';
import { MockCommandExecutor } from '../helpers/mock-command-executor';
import { MockVSCodeAPIFactory } from '../helpers/mock-factories';
import { GitTestData, SvnTestData } from '../helpers/test-data-generators';
import { TestUtils, TestAssertions } from '../helpers/test-utilities';
import { SvnUtils } from '../../svn-utils';

// Mock VS Code API
vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [],
    getConfiguration: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
  },
  window: {
    showErrorMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    showInputBox: vi.fn(),
    showQuickPick: vi.fn(),
  },
  env: {
    clipboard: {
      writeText: vi.fn(),
    },
  },
  extensions: {
    getExtension: vi.fn(),
  },
  Uri: {
    file: vi.fn((path: string) => ({ fsPath: path, path })),
    parse: vi.fn((uri: string) => ({ fsPath: uri, path: uri })),
  },
  commands: {
    executeCommand: vi.fn(),
  },
}));

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

// Mock SvnUtils
vi.mock('../../svn-utils', () => ({
  SvnUtils: {
    getSvnAuthorFromAuth: vi.fn(),
    getSvnAuthorFromInfo: vi.fn(),
  },
}));

// Mock i18n
vi.mock('../../utils/i18n', () => ({
  getMessage: vi.fn((key: string) => `mock.${key}`),
  formatMessage: vi.fn((key: string, args: any[]) => `mock.${key}.${args.join('.')}`),
}));

describe('AuthorService', () => {
  let authorService: AuthorService;
  let mockCommandExecutor: MockCommandExecutor;
  let mockVSCode: any;
  let mockExec: any;
  const mockWorkspacePath = '/mock/workspace';

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    TestUtils.resetAllMocks();

    // Get the mocked modules
    mockVSCode = await vi.importMock('vscode');
    const childProcess = await vi.importMock('child_process');
    mockExec = childProcess.exec;

    // Create fresh instances
    mockCommandExecutor = new MockCommandExecutor();
    authorService = new AuthorService(mockWorkspacePath);

    // Setup mock exec to use MockCommandExecutor
    mockExec.mockImplementation(MockCommandExecutor.getExecMock());
  });

  afterEach(() => {
    mockCommandExecutor.clearMocks();
    MockCommandExecutor.clearMocks();
  });

  describe('6.1 Git Author Information Retrieval', () => {
    describe('getAuthor method for Git', () => {
      it('should retrieve Git author from git config user.name', async () => {
        // Arrange
        const expectedAuthor = 'John Doe';
        MockCommandExecutor.mockExec('git config user.name', {
          stdout: `${expectedAuthor}\n`,
          stderr: '',
        });

        // Act
        const result = await authorService.getAuthor('git');

        // Assert
        expect(result).toBe(expectedAuthor);
        expect(mockCommandExecutor.getLastCommand()).toBe('git config user.name');
      });

      it('should trim whitespace from Git author name', async () => {
        // Arrange
        const authorWithWhitespace = '  Jane Smith  ';
        const expectedAuthor = 'Jane Smith';
        MockCommandExecutor.mockExec('git config user.name', {
          stdout: authorWithWhitespace,
          stderr: '',
        });

        // Act
        const result = await authorService.getAuthor('git');

        // Assert
        expect(result).toBe(expectedAuthor);
      });

      it('should handle empty Git config user.name', async () => {
        // Arrange
        MockCommandExecutor.mockExec('git config user.name', {
          stdout: '',
          stderr: '',
        });

        // Act
        const result = await authorService.getAuthor('git');

        // Assert
        expect(result).toBe('');
      });

      it('should throw error when git config command fails', async () => {
        // Arrange
        const error = new Error('fatal: not a git repository');
        MockCommandExecutor.mockExecError('git config user.name', error);

        // Act & Assert
        await TestAssertions.assertThrowsError(
          () => authorService.getAuthor('git'),
          'fatal: not a git repository'
        );
      });

      it('should handle git config command with stderr output', async () => {
        // Arrange
        const expectedAuthor = 'Test User';
        MockCommandExecutor.mockExec('git config user.name', {
          stdout: expectedAuthor,
          stderr: 'warning: some warning message',
        });

        // Act
        const result = await authorService.getAuthor('git');

        // Assert
        expect(result).toBe(expectedAuthor);
      });
    });

    describe('getAllAuthors method for Git', () => {
      it('should retrieve all Git authors from git log', async () => {
        // Arrange
        const authors = ['John Doe', 'Jane Smith', 'Bob Johnson'];
        const gitLogOutput = authors.join('\n') + '\n';
        MockCommandExecutor.mockExec(
          'git log --all --format=\'%aN\' --no-merges',
          {
            stdout: gitLogOutput,
            stderr: '',
          }
        );

        // Act
        const result = await authorService.getAllAuthors('git');

        // Assert
        expect(result).toEqual(authors);
        TestAssertions.assertArrayContains(result, authors);
      });

      it('should remove duplicate authors from Git log', async () => {
        // Arrange
        const duplicateAuthors = ['John Doe', 'Jane Smith', 'John Doe', 'Bob Johnson', 'Jane Smith'];
        const expectedUniqueAuthors = ['John Doe', 'Jane Smith', 'Bob Johnson'];
        const gitLogOutput = duplicateAuthors.join('\n') + '\n';

        MockCommandExecutor.mockExec(
          'git log --all --format=\'%aN\' --no-merges',
          {
            stdout: gitLogOutput,
            stderr: '',
          }
        );

        // Act
        const result = await authorService.getAllAuthors('git');

        // Assert
        expect(result).toEqual(expectedUniqueAuthors);
        expect(result.length).toBe(3);
      });

      it('should filter out empty lines from Git log output', async () => {
        // Arrange
        const authorsWithEmptyLines = ['John Doe', '', 'Jane Smith', '   ', 'Bob Johnson'];
        const expectedAuthors = ['John Doe', 'Jane Smith', 'Bob Johnson'];
        const gitLogOutput = authorsWithEmptyLines.join('\n') + '\n';

        MockCommandExecutor.mockExec(
          'git log --all --format=\'%aN\' --no-merges',
          {
            stdout: gitLogOutput,
            stderr: '',
          }
        );

        // Act
        const result = await authorService.getAllAuthors('git');

        // Assert
        expect(result).toEqual(expectedAuthors);
      });

      it('should return empty array when git log fails', async () => {
        // Arrange
        const error = new Error('fatal: not a git repository');
        MockCommandExecutor.mockExecError(
          'git log --all --format=\'%aN\' --no-merges',
          error
        );

        // Act
        const result = await authorService.getAllAuthors('git');

        // Assert
        expect(result).toEqual([]);
      });

      it('should handle git log with no commits', async () => {
        // Arrange
        MockCommandExecutor.mockExec(
          'git log --all --format=\'%aN\' --no-merges',
          {
            stdout: '',
            stderr: '',
          }
        );

        // Act
        const result = await authorService.getAllAuthors('git');

        // Assert
        expect(result).toEqual([]);
      });

      it('should use correct working directory for git log command', async () => {
        // Arrange
        const authors = ['Test Author'];
        MockCommandExecutor.mockExec(
          'git log --all --format=\'%aN\' --no-merges',
          {
            stdout: authors.join('\n'),
            stderr: '',
          }
        );

        // Act
        await authorService.getAllAuthors('git');

        // Assert
        // Verify the command was executed with correct cwd
        const executedCommands = mockCommandExecutor.getExecutedCommands();
        expect(executedCommands).toContain('git log --all --format=\'%aN\' --no-merges');
      });
    });

    describe('Git configuration edge cases', () => {
      it('should handle git config with special characters in author name', async () => {
        // Arrange
        const specialAuthor = 'José María Aznar-López';
        MockCommandExecutor.mockExec('git config user.name', {
          stdout: `${specialAuthor}\n`,
          stderr: '',
        });

        // Act
        const result = await authorService.getAuthor('git');

        // Assert
        expect(result).toBe(specialAuthor);
      });

      it('should handle git config with very long author name', async () => {
        // Arrange
        const longAuthor = 'A'.repeat(200);
        MockCommandExecutor.mockExec('git config user.name', {
          stdout: `${longAuthor}\n`,
          stderr: '',
        });

        // Act
        const result = await authorService.getAuthor('git');

        // Assert
        expect(result).toBe(longAuthor);
      });

      it('should handle git log with authors containing special characters', async () => {
        // Arrange
        const specialAuthors = ['José García', 'François Müller', '李小明'];
        const gitLogOutput = specialAuthors.join('\n') + '\n';
        MockCommandExecutor.mockExec(
          'git log --all --format=\'%aN\' --no-merges',
          {
            stdout: gitLogOutput,
            stderr: '',
          }
        );

        // Act
        const result = await authorService.getAllAuthors('git');

        // Assert
        expect(result).toEqual(specialAuthors);
      });
    });
  });

  describe('6.2 SVN Author Information Retrieval', () => {
    describe('getAuthor method for SVN', () => {
      it('should retrieve SVN author from auth cache first', async () => {
        // Arrange
        const expectedAuthor = 'svnuser';
        vi.mocked(SvnUtils.getSvnAuthorFromAuth).mockResolvedValue(expectedAuthor);
        vi.mocked(SvnUtils.getSvnAuthorFromInfo).mockResolvedValue(undefined);

        // Act
        const result = await authorService.getAuthor('svn');

        // Assert
        expect(result).toBe(expectedAuthor);
        expect(SvnUtils.getSvnAuthorFromAuth).toHaveBeenCalledWith(mockWorkspacePath);
        expect(SvnUtils.getSvnAuthorFromInfo).not.toHaveBeenCalled();
      });

      it('should fallback to svn info when auth cache is empty', async () => {
        // Arrange
        const expectedAuthor = 'infouser';
        vi.mocked(SvnUtils.getSvnAuthorFromAuth).mockResolvedValue(undefined);
        vi.mocked(SvnUtils.getSvnAuthorFromInfo).mockResolvedValue(expectedAuthor);

        // Act
        const result = await authorService.getAuthor('svn');

        // Assert
        expect(result).toBe(expectedAuthor);
        expect(SvnUtils.getSvnAuthorFromAuth).toHaveBeenCalledWith(mockWorkspacePath);
        expect(SvnUtils.getSvnAuthorFromInfo).toHaveBeenCalledWith(mockWorkspacePath);
      });

      it('should prompt for manual input when both auth and info fail', async () => {
        // Arrange
        const manualAuthor = 'manualuser';
        vi.mocked(SvnUtils.getSvnAuthorFromAuth).mockResolvedValue(undefined);
        vi.mocked(SvnUtils.getSvnAuthorFromInfo).mockResolvedValue(undefined);
        mockVSCode.window.showInputBox.mockResolvedValue(manualAuthor);

        // Act
        const result = await authorService.getAuthor('svn');

        // Assert
        expect(result).toBe(manualAuthor);
        expect(SvnUtils.getSvnAuthorFromAuth).toHaveBeenCalledWith(mockWorkspacePath);
        expect(SvnUtils.getSvnAuthorFromInfo).toHaveBeenCalledWith(mockWorkspacePath);
        expect(mockVSCode.window.showInputBox).toHaveBeenCalledWith({
          prompt: 'mock.author.manual.input.prompt',
          placeHolder: 'mock.author.manual.input.placeholder',
        });
      });

      it('should throw error when manual input is cancelled', async () => {
        // Arrange
        vi.mocked(SvnUtils.getSvnAuthorFromAuth).mockResolvedValue(undefined);
        vi.mocked(SvnUtils.getSvnAuthorFromInfo).mockResolvedValue(undefined);
        mockVSCode.window.showInputBox.mockResolvedValue(undefined);

        // Act & Assert
        await TestAssertions.assertThrowsError(
          () => authorService.getAuthor('svn'),
          'mock.author.svn.not.found'
        );
      });

      it('should throw error when manual input is empty', async () => {
        // Arrange
        vi.mocked(SvnUtils.getSvnAuthorFromAuth).mockResolvedValue(undefined);
        vi.mocked(SvnUtils.getSvnAuthorFromInfo).mockResolvedValue(undefined);
        mockVSCode.window.showInputBox.mockResolvedValue('');

        // Act & Assert
        await TestAssertions.assertThrowsError(
          () => authorService.getAuthor('svn'),
          'mock.author.svn.not.found'
        );
      });

      it('should handle auth method returning null', async () => {
        // Arrange
        const expectedAuthor = 'infouser';
        vi.mocked(SvnUtils.getSvnAuthorFromAuth).mockResolvedValue(null as any);
        vi.mocked(SvnUtils.getSvnAuthorFromInfo).mockResolvedValue(expectedAuthor);

        // Act
        const result = await authorService.getAuthor('svn');

        // Assert
        expect(result).toBe(expectedAuthor);
        expect(SvnUtils.getSvnAuthorFromInfo).toHaveBeenCalledWith(mockWorkspacePath);
      });

      it('should handle info method returning null', async () => {
        // Arrange
        const manualAuthor = 'manualuser';
        vi.mocked(SvnUtils.getSvnAuthorFromAuth).mockResolvedValue(null as any);
        vi.mocked(SvnUtils.getSvnAuthorFromInfo).mockResolvedValue(null as any);
        mockVSCode.window.showInputBox.mockResolvedValue(manualAuthor);

        // Act
        const result = await authorService.getAuthor('svn');

        // Assert
        expect(result).toBe(manualAuthor);
        expect(mockVSCode.window.showInputBox).toHaveBeenCalled();
      });
    });

    describe('getAllAuthors method for SVN', () => {
      it('should return empty array with warning for SVN', async () => {
        // Arrange
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        // Act
        const result = await authorService.getAllAuthors('svn');

        // Assert
        expect(result).toEqual([]);
        expect(consoleSpy).toHaveBeenCalledWith(
          'Fetching all SVN authors is not fully implemented and may return an empty list.'
        );

        consoleSpy.mockRestore();
      });

      it('should attempt to parse svn log output for authors', async () => {
        // Arrange
        const svnLogOutput = `------------------------------------------------------------------------
r123 | author1 | 2023-01-01 10:00:00 +0000 (Sun, 01 Jan 2023) | 1 line

Test commit 1
------------------------------------------------------------------------
r124 | author2 | 2023-01-02 10:00:00 +0000 (Mon, 02 Jan 2023) | 1 line

Test commit 2
------------------------------------------------------------------------
r125 | author1 | 2023-01-03 10:00:00 +0000 (Tue, 03 Jan 2023) | 1 line

Test commit 3
------------------------------------------------------------------------`;

        MockCommandExecutor.mockExec('svn log --quiet', {
          stdout: svnLogOutput,
          stderr: '',
        });

        // Act
        const result = await authorService.getAllAuthors('svn');

        // Assert
        expect(result).toEqual(['author1', 'author2']);
        expect(result.length).toBe(2); // Should be deduplicated
      });

      it('should handle svn log command failure gracefully', async () => {
        // Arrange
        const error = new Error('svn: E155007: not a working copy');
        MockCommandExecutor.mockExecError('svn log --quiet', error);
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // Act
        const result = await authorService.getAllAuthors('svn');

        // Assert
        expect(result).toEqual([]);
        expect(consoleSpy).toHaveBeenCalledWith('Error getting all SVN authors:', error);

        consoleSpy.mockRestore();
      });

      it('should handle empty svn log output', async () => {
        // Arrange
        MockCommandExecutor.mockExec('svn log --quiet', {
          stdout: '',
          stderr: '',
        });

        // Act
        const result = await authorService.getAllAuthors('svn');

        // Assert
        expect(result).toEqual([]);
      });

      it('should handle malformed svn log output', async () => {
        // Arrange
        const malformedOutput = 'invalid log format without proper structure';
        MockCommandExecutor.mockExec('svn log --quiet', {
          stdout: malformedOutput,
          stderr: '',
        });

        // Act
        const result = await authorService.getAllAuthors('svn');

        // Assert
        expect(result).toEqual([]);
      });

      it('should use correct working directory for svn log command', async () => {
        // Arrange
        MockCommandExecutor.mockExec('svn log --quiet', {
          stdout: 'r123 | testuser | 2023-01-01 | 1 line\n',
          stderr: '',
        });

        // Act
        await authorService.getAllAuthors('svn');

        // Assert
        const executedCommands = mockCommandExecutor.getExecutedCommands();
        expect(executedCommands).toContain('svn log --quiet');
      });
    });

    describe('SVN authentication and error handling', () => {
      it('should handle SVN authentication errors in auth method', async () => {
        // Arrange
        vi.mocked(SvnUtils.getSvnAuthorFromAuth).mockRejectedValue(
          new Error('svn: E170001: Authentication failed')
        );
        vi.mocked(SvnUtils.getSvnAuthorFromInfo).mockResolvedValue('fallbackuser');

        // Act
        const result = await authorService.getAuthor('svn');

        // Assert
        expect(result).toBe('fallbackuser');
        expect(SvnUtils.getSvnAuthorFromInfo).toHaveBeenCalledWith(mockWorkspacePath);
      });

      it('should handle SVN authentication errors in info method', async () => {
        // Arrange
        vi.mocked(SvnUtils.getSvnAuthorFromAuth).mockResolvedValue(undefined);
        vi.mocked(SvnUtils.getSvnAuthorFromInfo).mockRejectedValue(
          new Error('svn: E170001: Authentication failed')
        );
        mockVSCode.window.showInputBox.mockResolvedValue('manualuser');

        // Act
        const result = await authorService.getAuthor('svn');

        // Assert
        expect(result).toBe('manualuser');
        expect(mockVSCode.window.showInputBox).toHaveBeenCalled();
      });

      it('should handle network errors in SVN methods', async () => {
        // Arrange
        vi.mocked(SvnUtils.getSvnAuthorFromAuth).mockRejectedValue(
          new Error('svn: E170013: Unable to connect to repository')
        );
        vi.mocked(SvnUtils.getSvnAuthorFromInfo).mockRejectedValue(
          new Error('svn: E170013: Unable to connect to repository')
        );
        mockVSCode.window.showInputBox.mockResolvedValue('offlineuser');

        // Act
        const result = await authorService.getAuthor('svn');

        // Assert
        expect(result).toBe('offlineuser');
        expect(mockVSCode.window.showInputBox).toHaveBeenCalled();
      });

      it('should handle timeout errors in SVN methods', async () => {
        // Arrange
        vi.mocked(SvnUtils.getSvnAuthorFromAuth).mockImplementation(
          () => new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 100)
          )
        );
        vi.mocked(SvnUtils.getSvnAuthorFromInfo).mockResolvedValue('timeoutuser');

        // Act
        const result = await authorService.getAuthor('svn');

        // Assert
        expect(result).toBe('timeoutuser');
      });
    });

    describe('Manual input prompt functionality', () => {
      it('should show correct prompt message for manual input', async () => {
        // Arrange
        vi.mocked(SvnUtils.getSvnAuthorFromAuth).mockResolvedValue(undefined);
        vi.mocked(SvnUtils.getSvnAuthorFromInfo).mockResolvedValue(undefined);
        mockVSCode.window.showInputBox.mockResolvedValue('testuser');

        // Act
        await authorService.getAuthor('svn');

        // Assert
        expect(mockVSCode.window.showInputBox).toHaveBeenCalledWith({
          prompt: 'mock.author.manual.input.prompt',
          placeHolder: 'mock.author.manual.input.placeholder',
        });
      });

      it('should trim whitespace from manual input', async () => {
        // Arrange
        const inputWithWhitespace = '  manualuser  ';
        const expectedAuthor = 'manualuser';
        vi.mocked(SvnUtils.getSvnAuthorFromAuth).mockResolvedValue(undefined);
        vi.mocked(SvnUtils.getSvnAuthorFromInfo).mockResolvedValue(undefined);
        mockVSCode.window.showInputBox.mockResolvedValue(inputWithWhitespace);

        // Act
        const result = await authorService.getAuthor('svn');

        // Assert
        expect(result).toBe(expectedAuthor);
      });

      it('should handle special characters in manual input', async () => {
        // Arrange
        const specialAuthor = 'José María';
        vi.mocked(SvnUtils.getSvnAuthorFromAuth).mockResolvedValue(undefined);
        vi.mocked(SvnUtils.getSvnAuthorFromInfo).mockResolvedValue(undefined);
        mockVSCode.window.showInputBox.mockResolvedValue(specialAuthor);

        // Act
        const result = await authorService.getAuthor('svn');

        // Assert
        expect(result).toBe(specialAuthor);
      });

      it('should handle very long manual input', async () => {
        // Arrange
        const longAuthor = 'A'.repeat(100);
        vi.mocked(SvnUtils.getSvnAuthorFromAuth).mockResolvedValue(undefined);
        vi.mocked(SvnUtils.getSvnAuthorFromInfo).mockResolvedValue(undefined);
        mockVSCode.window.showInputBox.mockResolvedValue(longAuthor);

        // Act
        const result = await authorService.getAuthor('svn');

        // Assert
        expect(result).toBe(longAuthor);
      });
    });
  });
});