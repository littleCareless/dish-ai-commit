import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SCMUtils } from '../../utils/scm-utils';
import { SCMLogger, LogLevel } from '../../utils/scm-logger';
import { PathUtils } from '../../utils/path-utils';
import { CommandExecutor } from '../../utils/command-executor';

/**
 * 重构后组件的单元测试
 * 测试新创建的工具类和基础类的功能
 */

describe('SCMUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseSvnLog', () => {
    it('should parse SVN log correctly', () => {
      const logOutput = `------------------------------------------------------------------------
r123 | author1 | 2023-01-01 12:00:00 +0000 | 1 line

First commit message
------------------------------------------------------------------------
r124 | author2 | 2023-01-02 12:00:00 +0000 | 1 line

Second commit message
------------------------------------------------------------------------`;

      const result = SCMUtils.parseSvnLog(logOutput);
      
      expect(result).toEqual([
        'First commit message',
        'Second commit message'
      ]);
    });

    it('should handle empty log', () => {
      const result = SCMUtils.parseSvnLog('');
      expect(result).toEqual([]);
    });

    it('should handle malformed log entries', () => {
      const logOutput = `------------------------------------------------------------------------
Invalid entry without proper format
------------------------------------------------------------------------`;

      const result = SCMUtils.parseSvnLog(logOutput);
      expect(result).toEqual([]);
    });
  });

  describe('parseXmlSvnLogs', () => {
    it('should parse XML SVN logs correctly', () => {
      const xmlOutput = `<?xml version="1.0" encoding="UTF-8"?>
<log>
  <logentry revision="123">
    <author>author1</author>
    <date>2023-01-01T12:00:00.000000Z</date>
    <msg>First commit message</msg>
  </logentry>
  <logentry revision="124">
    <author>author2</author>
    <date>2023-01-02T12:00:00.000000Z</date>
    <msg>Second commit message</msg>
  </logentry>
</log>`;

      const result = SCMUtils.parseXmlSvnLogs(xmlOutput);
      
      expect(result).toEqual([
        'First commit message',
        'Second commit message'
      ]);
    });
  });

  describe('validateFilePaths', () => {
    it('should filter out invalid paths', () => {
      const files = [
        '/valid/path/file1.txt',
        null,
        undefined,
        '',
        '/valid/path/file2.txt',
        123 as any
      ];

      const result = SCMUtils.validateFilePaths(files);
      
      expect(result).toEqual([
        '/valid/path/file1.txt',
        '/valid/path/file2.txt'
      ]);
    });

    it('should return empty array for undefined input', () => {
      const result = SCMUtils.validateFilePaths(undefined);
      expect(result).toEqual([]);
    });
  });

  describe('sanitizeForShell', () => {
    it('should escape dangerous characters', () => {
      const input = 'file;name&with|dangerous`chars$';
      const result = SCMUtils.sanitizeForShell(input);
      
      expect(result).toBe('file\\;name\\&with\\|dangerous\\`chars\\$');
    });

    it('should handle normal strings without changes', () => {
      const input = 'normal-file_name.txt';
      const result = SCMUtils.sanitizeForShell(input);
      
      expect(result).toBe(input);
    });
  });

  describe('isValidCommitMessage', () => {
    it('should validate commit messages correctly', () => {
      expect(SCMUtils.isValidCommitMessage('Valid commit message')).toBe(true);
      expect(SCMUtils.isValidCommitMessage('')).toBe(false);
      expect(SCMUtils.isValidCommitMessage('   ')).toBe(false);
      expect(SCMUtils.isValidCommitMessage(null as any)).toBe(false);
      expect(SCMUtils.isValidCommitMessage(undefined as any)).toBe(false);
    });
  });
});

describe('SCMLogger', () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // 重置配置
    SCMLogger.configure({
      enabled: true,
      minLevel: LogLevel.Info,
      showInfoInProduction: false
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('basic logging', () => {
    it('should log info messages', () => {
      SCMLogger.info('Test info message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SCM]'),
        expect.stringContaining('[INFO]'),
        expect.stringContaining('Test info message')
      );
    });

    it('should log warning messages', () => {
      SCMLogger.warn('Test warning message');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARNING]'),
        expect.stringContaining('Test warning message')
      );
    });

    it('should log error messages', () => {
      SCMLogger.error('Test error message');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.stringContaining('Test error message')
      );
    });
  });

  describe('configuration', () => {
    it('should respect enabled configuration', () => {
      SCMLogger.configure({ enabled: false });
      SCMLogger.info('Should not be logged');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should respect minimum log level', () => {
      SCMLogger.configure({ minLevel: LogLevel.Error });
      
      SCMLogger.info('Should not be logged');
      SCMLogger.warn('Should not be logged');
      SCMLogger.error('Should be logged');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('context logging', () => {
    it('should create context logger correctly', () => {
      const contextLogger = SCMLogger.createContextLogger('TEST');
      
      contextLogger.info('Test message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TEST]'),
        expect.stringContaining('Test message')
      );
    });
  });
});

describe('PathUtils', () => {
  describe('normalizeFilePaths', () => {
    it('should normalize multiple file paths', () => {
      const files = ['/path/to/file1.txt', '\\path\\to\\file2.txt'];
      const result = PathUtils.normalizeFilePaths(files);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('/path/to/file1.txt');
    });

    it('should filter out invalid paths', () => {
      const files = ['/valid/path.txt', '', null as any];
      const result = PathUtils.normalizeFilePaths(files);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('/valid/path.txt');
    });
  });

  describe('getCommonParentDirectory', () => {
    it('should find common parent directory', () => {
      const files = [
        '/project/src/file1.ts',
        '/project/src/utils/file2.ts',
        '/project/src/components/file3.ts'
      ];
      
      const result = PathUtils.getCommonParentDirectory(files);
      expect(result).toBe('/project/src');
    });

    it('should handle single file', () => {
      const files = ['/project/src/file1.ts'];
      const result = PathUtils.getCommonParentDirectory(files);
      
      expect(result).toBe('/project/src');
    });

    it('should handle empty array', () => {
      const result = PathUtils.getCommonParentDirectory([]);
      expect(result).toBeUndefined();
    });
  });

  describe('cleanupPaths', () => {
    it('should remove duplicates and nested paths', () => {
      const paths = [
        '/project/src',
        '/project/src/file1.ts',
        '/project/src',
        '/project/tests'
      ];
      
      const result = PathUtils.cleanupPaths(paths);
      
      expect(result).toEqual(['/project/src', '/project/tests']);
    });
  });

  describe('isScmDirectory', () => {
    it('should identify SCM directories', () => {
      expect(PathUtils.isScmDirectory('/project/.git')).toBe(true);
      expect(PathUtils.isScmDirectory('/project/.svn')).toBe(true);
      expect(PathUtils.isScmDirectory('/project/src')).toBe(false);
    });
  });
});

describe('CommandExecutor', () => {
  describe('basic execution', () => {
    it('should execute simple commands', async () => {
      const result = await CommandExecutor.execute('echo "test"');
      
      expect(result.success).toBe(true);
      expect(result.stdout.trim()).toBe('test');
    });

    it('should handle command failures', async () => {
      const result = await CommandExecutor.execute('nonexistent-command');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('command availability check', () => {
    it('should check if command is available', async () => {
      const result = await CommandExecutor.isCommandAvailable('echo');
      expect(result).toBe(true);
    });

    it('should return false for unavailable commands', async () => {
      const result = await CommandExecutor.isCommandAvailable('definitely-not-a-command');
      expect(result).toBe(false);
    });
  });

  describe('directory-specific executor', () => {
    it('should create directory-specific executor', async () => {
      const executor = CommandExecutor.createForDirectory('/tmp');
      
      const result = await executor.execute('pwd');
      expect(result.success).toBe(true);
    });
  });
});