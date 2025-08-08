/**
 * Mock command executor for simulating child_process.exec calls
 */

import { vi } from 'vitest';
import { CommandResult, CommandError } from './test-interfaces';
import { GitTestData, SvnTestData } from './test-data-generators';

/**
 * Mock command executor class
 */
export class MockCommandExecutor {
  private static commandMocks = new Map<string, CommandResult | CommandError>();
  private static commandPatterns = new Map<RegExp, (match: RegExpMatchArray) => CommandResult | CommandError>();
  private static defaultBehavior: 'success' | 'failure' = 'success';

  /**
   * Mock a specific command with a result
   */
  static mockExec(command: string, result: CommandResult): void {
    this.commandMocks.set(command, result);
  }

  /**
   * Mock a command with an error
   */
  static mockExecError(command: string, error: CommandError): void {
    this.commandMocks.set(command, error);
  }

  /**
   * Mock commands matching a pattern
   */
  static mockExecPattern(
    pattern: RegExp,
    handler: (match: RegExpMatchArray) => CommandResult | CommandError
  ): void {
    this.commandPatterns.set(pattern, handler);
  }

  /**
   * Set default behavior for unmocked commands
   */
  static setDefaultBehavior(behavior: 'success' | 'failure'): void {
    this.defaultBehavior = behavior;
  }

  /**
   * Clear all mocks
   */
  static clearMocks(): void {
    this.commandMocks.clear();
    this.commandPatterns.clear();
    this.defaultBehavior = 'success';
  }

  /**
   * Get the mock implementation for child_process.exec
   */
  static getExecMock() {
    return vi.fn().mockImplementation((command: string, options: any, callback?: Function) => {
      const actualCallback = typeof options === 'function' ? options : callback;
      const result = this.executeCommand(command);
      
      // Always use callback style - promisify will handle the Promise wrapping
      setTimeout(() => {
        if (result instanceof Error) {
          actualCallback(result);
        } else {
          // child_process.exec callback signature: (error, stdout, stderr)
          actualCallback(null, result.stdout || '', result.stderr || '');
        }
      }, 0);
    });
  }

  /**
   * Execute a command and return the mocked result
   */
  private static executeCommand(command: string): CommandResult | CommandError {
    // Check exact command matches first
    if (this.commandMocks.has(command)) {
      return this.commandMocks.get(command)!;
    }

    // Check pattern matches (later-registered patterns take precedence)
    const patternEntries = Array.from(this.commandPatterns.entries()).reverse();
    for (const [pattern, handler] of patternEntries) {
      const match = command.match(pattern);
      if (match) {
        return handler(match);
      }
    }

    // Debug: log unmocked commands
    console.warn(`Unmocked command: "${command}"`);
    console.warn(`Available mocks:`, Array.from(this.commandMocks.keys()));

    // Default behavior for unmocked commands
    if (this.defaultBehavior === 'failure') {
      const error = new Error(`Command not found: ${command}`) as CommandError;
      error.code = 127;
      return error;
    }

    return { stdout: '', stderr: '' };
  }

  /**
   * Setup common Git command mocks
   */
  static setupGitMocks(): void {
    // Git version check
    this.mockExec('git --version', {
      stdout: 'git version 2.34.1',
      stderr: '',
    });

    // Git config commands
    this.mockExecPattern(/^git config --get (.+)$/, (match) => {
      const key = match[1];
      const config = GitTestData.generateGitConfig();
      return {
        stdout: config[key] || '',
        stderr: '',
      };
    });

    // Git status
    this.mockExec('git status --porcelain', {
      stdout: GitTestData.generateGitStatus([
        { path: 'src/test.ts', status: 'M' },
        { path: 'README.md', status: 'A' },
      ]),
      stderr: '',
    });

    // Git diff
    this.mockExecPattern(/^git diff/, () => ({
      stdout: GitTestData.generateDiffOutput(['src/test.ts', 'README.md']),
      stderr: '',
    }));

    // Git log
    this.mockExecPattern(/^git log/, (match) => {
      const commits = GitTestData.generateCommitLog(5);
      const fullCommand = (match as any).input || match[0];
      const format = fullCommand.includes('--oneline') ? '--oneline' : 'default';
      return {
        stdout: GitTestData.generateGitLogFormatted(commits, format),
        stderr: '',
      };
    });

    // Git branch
    this.mockExec('git branch', {
      stdout: GitTestData.generateBranchListOutput(['main', 'develop', 'feature/test']),
      stderr: '',
    });

    // Git commit
    this.mockExecPattern(/^git commit/, () => ({
      stdout: '[main abc1234] Test commit message',
      stderr: '',
    }));

    // Git add
    this.mockExecPattern(/^git add/, () => ({
      stdout: '',
      stderr: '',
    }));

    // Git push
    this.mockExecPattern(/^git push/, () => ({
      stdout: 'To origin\n   abc1234..def5678  main -> main',
      stderr: '',
    }));

    // Git pull
    this.mockExecPattern(/^git pull/, () => ({
      stdout: 'Already up to date.',
      stderr: '',
    }));
  }

  /**
   * Setup common SVN command mocks
   */
  static setupSvnMocks(): void {
    // SVN version check
    this.mockExec('svn --version', {
      stdout: 'svn, version 1.14.1 (r1886195)',
      stderr: '',
    });

    // SVN info
    this.mockExec('svn info', {
      stdout: SvnTestData.generateSvnInfo(),
      stderr: '',
    });

    // SVN status
    this.mockExec('svn status', {
      stdout: SvnTestData.generateSvnStatus([
        { path: 'src/test.ts', status: 'M' },
        { path: 'README.md', status: 'A' },
      ]),
      stderr: '',
    });

    // SVN diff
    this.mockExecPattern(/^svn diff/, () => ({
      stdout: SvnTestData.generateSvnDiffOutput(['src/test.ts', 'README.md']),
      stderr: '',
    }));

    // SVN log
    this.mockExecPattern(/^svn log/, () => {
      const commits = SvnTestData.generateSvnCommitLog(5);
      return {
        stdout: SvnTestData.generateSvnLogXml(commits),
        stderr: '',
      };
    });

    // SVN commit
    this.mockExecPattern(/^svn commit/, () => ({
      stdout: 'Committed revision 124.',
      stderr: '',
    }));

    // SVN add
    this.mockExecPattern(/^svn add/, () => ({
      stdout: 'A         src/test.ts',
      stderr: '',
    }));

    // SVN update
    this.mockExecPattern(/^svn update/, () => ({
      stdout: 'At revision 123.',
      stderr: '',
    }));

    // SVN list
    this.mockExecPattern(/^svn list/, () => ({
      stdout: SvnTestData.generateSvnList(['src/', 'README.md', 'package.json']),
      stderr: '',
    }));
  }

  /**
   * Setup error scenarios for testing
   */
  static setupErrorScenarios(): void {
    // Network errors
    this.mockExecError('git push origin main', {
      name: 'NetworkError',
      message: 'fatal: unable to access repository: Could not resolve host',
      code: 128,
    } as CommandError);

    this.mockExecError('svn update', {
      name: 'NetworkError', 
      message: 'svn: E170013: Unable to connect to a repository',
      code: 1,
    } as CommandError);

    // Permission errors
    this.mockExecError('git commit -m "test"', {
      name: 'PermissionError',
      message: 'error: insufficient permission for adding an object to repository database',
      code: 128,
    } as CommandError);

    // Authentication errors
    this.mockExecError('svn commit -m "test"', {
      name: 'AuthenticationError',
      message: 'svn: E170001: Authentication failed',
      code: 1,
    } as CommandError);

    // Repository corruption
    this.mockExecError('git status', {
      name: 'CorruptionError',
      message: 'fatal: not a git repository (or any of the parent directories): .git',
      code: 128,
    } as CommandError);

    // Timeout simulation
    this.mockExecPattern(/^git clone.*large-repo/, () => {
      const error = new Error('Command timed out') as CommandError;
      error.code = 124;
      return error;
    });
  }

  /**
   * Setup command availability checks
   */
  static setupAvailabilityChecks(): void {
    // Git available
    this.mockExec('which git', {
      stdout: '/usr/bin/git',
      stderr: '',
    });

    // SVN available
    this.mockExec('which svn', {
      stdout: '/usr/bin/svn',
      stderr: '',
    });

    // Command not found scenarios
    this.mockExecError('which nonexistent-command', {
      name: 'CommandNotFoundError',
      message: 'which: nonexistent-command: not found',
      code: 1,
    } as CommandError);
  }

  /**
   * Setup performance testing scenarios
   */
  static setupPerformanceScenarios(): void {
    // Large diff output
    this.mockExecPattern(/^git diff.*--large-file/, () => ({
      stdout: Array.from({ length: 10000 }, (_, i) => `+Line ${i + 1}`).join('\n'),
      stderr: '',
    }));

    // Large log output
    this.mockExecPattern(/^git log.*--large-history/, () => {
      const commits = GitTestData.generateCommitLog(1000);
      return {
        stdout: GitTestData.generateGitLogFormatted(commits),
        stderr: '',
      };
    });

    // Slow command simulation
    this.mockExecPattern(/^.*--slow/, () => {
      return new Promise<CommandResult>((resolve) => {
        setTimeout(() => {
          resolve({ stdout: 'Slow operation completed', stderr: '' });
        }, 2000);
      }) as any;
    });
  }

  /**
   * Setup all common mocks
   */
  static setupAllMocks(): void {
    this.clearMocks();
    this.setupGitMocks();
    this.setupSvnMocks();
    this.setupAvailabilityChecks();
    this.setupErrorScenarios();
    this.setupPerformanceScenarios();
  }

  /**
   * Create a mock that simulates command execution delay
   */
  static createDelayedMock(delay: number, result: CommandResult): any {
    return () => new Promise((resolve) => {
      setTimeout(() => resolve(result), delay);
    });
  }

  /**
   * Create a mock that fails after a certain number of calls
   */
  static createFailAfterMock(
    successCount: number,
    successResult: CommandResult,
    errorResult: CommandError
  ): any {
    let callCount = 0;
    return () => {
      callCount++;
      if (callCount <= successCount) {
        return Promise.resolve(successResult);
      } else {
        return Promise.reject(errorResult);
      }
    };
  }

  /**
   * Create a mock that alternates between success and failure
   */
  static createAlternatingMock(
    successResult: CommandResult,
    errorResult: CommandError
  ): any {
    let callCount = 0;
    return () => {
      callCount++;
      if (callCount % 2 === 1) {
        return Promise.resolve(successResult);
      } else {
        return Promise.reject(errorResult);
      }
    };
  }

  /**
   * Get execution statistics for testing
   */
  static getExecutionStats(): {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageExecutionTime: number;
  } {
    // This would be implemented to track actual execution statistics
    // For now, return mock data
    return {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageExecutionTime: 0,
    };
  }
}