/**
 * Unit tests for commit log strategies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestFileSystem } from '../helpers/test-data-generators';

// Mock child_process and util
const mockExecAsync = vi.hoisted(() => vi.fn());

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: vi.fn(() => mockExecAsync),
}));

// Now import after mocking
import {
  GitCommitStrategy,
  SvnCommitStrategy,
  getLastWeekPeriod
} from '../../commit-log-strategy';

describe('GitCommitStrategy', () => {
  let gitStrategy: GitCommitStrategy;
  let testWorkspacePath: string;

  beforeEach(() => {
    gitStrategy = new GitCommitStrategy();
    testWorkspacePath = TestFileSystem.createTempGitRepo();
    vi.clearAllMocks();
  });

  afterEach(() => {
    TestFileSystem.cleanup(testWorkspacePath);
  });

  describe('getCommits', () => {
    it('should get commits for a specific author and time period', async () => {
      // Arrange
      const period = {
        startDate: '2024-01-01',
        endDate: '2024-01-07'
      };
      const author = 'Test Author';
      const expectedCommits = [
        '=== abc1234 ===',
        'Author: Test Author',
        'Date: Mon Jan 1 10:00:00 2024 +0000',
        '',
        'Test commit message',
        '',
        '=== def5678 ===',
        'Author: Test Author',
        'Date: Tue Jan 2 11:00:00 2024 +0000',
        '',
        'Another test commit',
        ''
      ];

      mockExecAsync.mockResolvedValue({
        stdout: expectedCommits.join('\n'),
        stderr: ''
      });

      // Act
      const result = await gitStrategy.getCommits(testWorkspacePath, period, author);

      // Assert
      expect(result).toEqual(expectedCommits.filter(line => line.trim()));
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('git log'),
        expect.objectContaining({ cwd: testWorkspacePath })
      );
    });

    it('should use last week period when period is null', async () => {
      // Arrange
      const author = 'Test Author';
      const expectedCommits = ['=== abc1234 ===', 'Author: Test Author', 'Test commit'];

      mockExecAsync.mockResolvedValue({
        stdout: expectedCommits.join('\n'),
        stderr: ''
      });

      // Act
      const result = await gitStrategy.getCommits(testWorkspacePath, null, author);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('git log'),
        expect.objectContaining({ cwd: testWorkspacePath })
      );
    });

    it('should handle empty commit results', async () => {
      // Arrange
      const period = { startDate: '2024-01-01', endDate: '2024-01-07' };
      const author = 'Nonexistent Author';

      mockExecAsync.mockResolvedValue({
        stdout: '',
        stderr: ''
      });

      // Act
      const result = await gitStrategy.getCommits(testWorkspacePath, period, author);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle Date objects in period', async () => {
      // Arrange
      const period = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07')
      };
      const author = 'Test Author';

      mockExecAsync.mockResolvedValue({
        stdout: '=== abc1234 ===\nAuthor: Test Author\nTest commit\n',
        stderr: ''
      });

      // Act
      const result = await gitStrategy.getCommits(testWorkspacePath, period, author);

      // Assert
      expect(result).toBeDefined();
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('--since="2024-01-01"'),
        expect.any(Object)
      );
    });

    it('should handle command execution errors', async () => {
      // Arrange
      const period = { startDate: '2024-01-01', endDate: '2024-01-07' };
      const author = 'Test Author';
      const error = new Error('Git command failed');

      mockExecAsync.mockRejectedValue(error);

      // Act & Assert
      await expect(gitStrategy.getCommits(testWorkspacePath, period, author))
        .rejects.toThrow('Git command failed');
    });
  });

  describe('getCommitsForUsers', () => {
    it('should get commits for multiple users using regex', async () => {
      // Arrange
      const period = { startDate: '2024-01-01', endDate: '2024-01-07' };
      const users = ['User1', 'User2', 'User3'];
      const expectedCommits = [
        '=== abc1234 ===',
        'Author: User1',
        'Date: Mon Jan 1 10:00:00 2024 +0000',
        '',
        'Commit by User1',
        '',
        '=== def5678 ===',
        'Author: User2',
        'Date: Tue Jan 2 11:00:00 2024 +0000',
        '',
        'Commit by User2',
        ''
      ];

      mockExecAsync.mockResolvedValue({
        stdout: expectedCommits.join('\n'),
        stderr: ''
      });

      // Act
      const result = await gitStrategy.getCommitsForUsers(testWorkspacePath, period, users);

      // Assert
      expect(result).toEqual(expectedCommits.filter(line => line.trim()));
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('--author="User1\\|User2\\|User3"'),
        expect.any(Object)
      );
    });

    it('should return empty array for empty users list', async () => {
      // Arrange
      const period = { startDate: '2024-01-01', endDate: '2024-01-07' };
      const users: string[] = [];

      // Act
      const result = await gitStrategy.getCommitsForUsers(testWorkspacePath, period, users);

      // Assert
      expect(result).toEqual([]);
      expect(mockExecAsync).not.toHaveBeenCalled();
    });

    it('should fallback to individual queries when regex fails', async () => {
      // Arrange
      const period = { startDate: '2024-01-01', endDate: '2024-01-07' };
      const users = ['User1', 'User2'];

      // Mock console.error to suppress error output during test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      mockExecAsync
        .mockRejectedValueOnce(new Error('Regex not supported')) // First call (regex) fails
        .mockResolvedValueOnce({ // Second call (User1) succeeds
          stdout: '=== abc1234 ===\nAuthor: User1\nCommit by User1\n',
          stderr: ''
        })
        .mockResolvedValueOnce({ // Third call (User2) succeeds
          stdout: '=== def5678 ===\nAuthor: User2\nCommit by User2\n',
          stderr: ''
        });

      // Act
      const result = await gitStrategy.getCommitsForUsers(testWorkspacePath, period, users);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(mockExecAsync).toHaveBeenCalledTimes(3); // 1 regex attempt + 2 individual queries
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error getting commits for multiple users with regex, falling back to individual queries:',
        expect.any(Error)
      );

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });
});

describe('SvnCommitStrategy', () => {
  let svnStrategy: SvnCommitStrategy;
  let testWorkspacePath: string;

  beforeEach(() => {
    svnStrategy = new SvnCommitStrategy();
    testWorkspacePath = TestFileSystem.createTempSvnRepo();
    vi.clearAllMocks();
  });

  afterEach(() => {
    TestFileSystem.cleanup(testWorkspacePath);
  });

  describe('getCommits', () => {
    it('should get commits for a specific author and time period', async () => {
      // Arrange
      const period = {
        startDate: '2024-01-01',
        endDate: '2024-01-07'
      };
      const author = 'testuser';
      const xmlOutput = `<?xml version="1.0" encoding="UTF-8"?>
<log>
<logentry revision="123">
<author>testuser</author>
<date>2024-01-01T10:00:00.000000Z</date>
<msg>First commit by testuser</msg>
<paths>
<path action="M">/trunk/file1.txt</path>
</paths>
</logentry>
<logentry revision="124">
<author>testuser</author>
<date>2024-01-02T11:00:00.000000Z</date>
<msg>Second commit by testuser</msg>
<paths>
<path action="A">/trunk/file2.txt</path>
</paths>
</logentry>
</log>`;

      mockExecAsync.mockResolvedValue({
        stdout: xmlOutput,
        stderr: ''
      });

      // Act
      const result = await svnStrategy.getCommits(testWorkspacePath, period, author);

      // Assert
      expect(result).toEqual([
        'First commit by testuser',
        'Second commit by testuser'
      ]);
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('svn log'),
        expect.objectContaining({ cwd: testWorkspacePath })
      );
    });

    it('should handle empty XML results', async () => {
      // Arrange
      const period = { startDate: '2024-01-01', endDate: '2024-01-07' };
      const author = 'nonexistent';
      const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<log>
</log>`;

      mockExecAsync.mockResolvedValue({
        stdout: emptyXml,
        stderr: ''
      });

      // Act
      const result = await svnStrategy.getCommits(testWorkspacePath, period, author);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle command execution errors', async () => {
      // Arrange
      const period = { startDate: '2024-01-01', endDate: '2024-01-07' };
      const author = 'testuser';
      const error = new Error('SVN command failed');

      mockExecAsync.mockRejectedValue(error);

      // Act & Assert
      await expect(svnStrategy.getCommits(testWorkspacePath, period, author))
        .rejects.toThrow('SVN command failed');
    });
  });

  describe('getCommitsForUsers', () => {
    it('should get commits for multiple users', async () => {
      // Arrange
      const period = { startDate: '2024-01-01', endDate: '2024-01-07' };
      const users = ['user1', 'user2'];

      const xmlOutput1 = `<?xml version="1.0" encoding="UTF-8"?>
<log>
<logentry revision="123">
<author>user1</author>
<date>2024-01-01T10:00:00.000000Z</date>
<msg>Commit by user1</msg>
</logentry>
</log>`;

      const xmlOutput2 = `<?xml version="1.0" encoding="UTF-8"?>
<log>
<logentry revision="124">
<author>user2</author>
<date>2024-01-02T11:00:00.000000Z</date>
<msg>Commit by user2</msg>
</logentry>
</log>`;

      mockExecAsync
        .mockResolvedValueOnce({ stdout: xmlOutput1, stderr: '' })
        .mockResolvedValueOnce({ stdout: xmlOutput2, stderr: '' });

      // Act
      const result = await svnStrategy.getCommitsForUsers(testWorkspacePath, period, users);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContain('Commit by user1');
      expect(result).toContain('Commit by user2');
      expect(mockExecAsync).toHaveBeenCalledTimes(2);
    });

    it('should return empty array for empty users list', async () => {
      // Arrange
      const period = { startDate: '2024-01-01', endDate: '2024-01-07' };
      const users: string[] = [];

      // Act
      const result = await svnStrategy.getCommitsForUsers(testWorkspacePath, period, users);

      // Assert
      expect(result).toEqual([]);
      expect(mockExecAsync).not.toHaveBeenCalled();
    });
  });

  describe('XML parsing', () => {
    it('should parse XML with multiple log entries correctly', async () => {
      // Arrange
      const period = { startDate: '2024-01-01', endDate: '2024-01-07' };
      const author = 'testuser';
      const multiEntryXml = `<?xml version="1.0" encoding="UTF-8"?>
<log>
<logentry revision="123">
<author>testuser</author>
<date>2024-01-01T10:00:00.000000Z</date>
<msg>First commit</msg>
<paths>
<path action="M">/trunk/file1.txt</path>
</paths>
</logentry>
<logentry revision="124">
<author>testuser</author>
<date>2024-01-02T11:00:00.000000Z</date>
<msg>Second commit</msg>
<paths>
<path action="A">/trunk/file2.txt</path>
</paths>
</logentry>
<logentry revision="125">
<author>testuser</author>
<date>2024-01-03T12:00:00.000000Z</date>
<msg>Third commit</msg>
<paths>
<path action="D">/trunk/file3.txt</path>
</paths>
</logentry>
</log>`;

      mockExecAsync.mockResolvedValue({
        stdout: multiEntryXml,
        stderr: ''
      });

      // Act
      const result = await svnStrategy.getCommits(testWorkspacePath, period, author);

      // Assert
      expect(result).toHaveLength(3);
      expect(result).toContain('First commit');
      expect(result).toContain('Second commit');
      expect(result).toContain('Third commit');
    });

    it('should handle XML with empty messages', async () => {
      // Arrange
      const period = { startDate: '2024-01-01', endDate: '2024-01-07' };
      const author = 'testuser';
      const xmlWithEmptyMessage = `<?xml version="1.0" encoding="UTF-8"?>
<log>
<logentry revision="123">
<author>testuser</author>
<date>2024-01-01T10:00:00.000000Z</date>
<msg></msg>
<paths>
<path action="M">/trunk/file1.txt</path>
</paths>
</logentry>
<logentry revision="124">
<author>testuser</author>
<date>2024-01-02T11:00:00.000000Z</date>
<msg>   </msg>
<paths>
<path action="A">/trunk/file2.txt</path>
</paths>
</logentry>
<logentry revision="125">
<author>testuser</author>
<date>2024-01-03T12:00:00.000000Z</date>
<msg>Valid message</msg>
<paths>
<path action="D">/trunk/file3.txt</path>
</paths>
</logentry>
</log>`;

      mockExecAsync.mockResolvedValue({
        stdout: xmlWithEmptyMessage,
        stderr: ''
      });

      // Act
      const result = await svnStrategy.getCommits(testWorkspacePath, period, author);

      // Assert
      expect(result).toHaveLength(1); // Only the entry with valid message
      expect(result).toContain('Valid message');
    });
  });
});

describe('getLastWeekPeriod', () => {
  it('should return a period representing last week (Monday to Sunday)', () => {
    // Act
    const period = getLastWeekPeriod();

    // Assert
    expect(period).toBeDefined();
    expect(period.startDate).toBeDefined();
    expect(period.endDate).toBeDefined();

    // Convert to Date objects for comparison
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);

    // Verify it's a 6-day span (Monday to Sunday)
    const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysDiff).toBe(6);

    // Verify start date is a Monday (getDay() returns 1 for Monday)
    expect(startDate.getDay()).toBe(1);

    // Verify end date is a Sunday (getDay() returns 0 for Sunday)
    expect(endDate.getDay()).toBe(0);

    // Verify it's in the past
    const now = new Date();
    expect(endDate.getTime()).toBeLessThan(now.getTime());
  });

  it('should return consistent results when called multiple times', () => {
    // Act
    const period1 = getLastWeekPeriod();
    const period2 = getLastWeekPeriod();

    // Assert
    expect(period1.startDate).toEqual(period2.startDate);
    expect(period1.endDate).toEqual(period2.endDate);
  });
});