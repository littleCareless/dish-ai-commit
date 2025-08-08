import { describe, test, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { SCMPathHandler } from '../../utils/path-handler';

// Mock fs module
vi.mock('fs');
const mockFs = vi.mocked(fs);

describe('SCMPathHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock process.cwd() for consistent testing
    vi.spyOn(process, 'cwd').mockReturnValue('/mock/current/directory');
  });

  describe('normalizePath', () => {
    test('应该标准化Windows路径', () => {
      const input = 'C:\\Users\\test\\project';
      const expected = 'C:/Users/test/project';
      expect(SCMPathHandler.normalizePath(input)).toBe(expected);
    });

    test('应该标准化Unix路径', () => {
      const input = '/home/user/project';
      const expected = '/home/user/project';
      expect(SCMPathHandler.normalizePath(input)).toBe(expected);
    });

    test('应该处理相对路径', () => {
      const input = './relative/path';
      const result = SCMPathHandler.normalizePath(input);
      expect(result).toContain('relative/path');
    });

    test('应该处理空路径', () => {
      const result = SCMPathHandler.normalizePath('');
      expect(result).toBe('');
    });

    test('应该处理特殊路径', () => {
      expect(SCMPathHandler.normalizePath('')).toBe('');
      expect(SCMPathHandler.normalizePath('.')).toBe('.');
      expect(SCMPathHandler.normalizePath('..')).toBe('..');
    });

    test('应该处理Windows长路径前缀', () => {
      const input = '\\\\?\\C:\\very\\long\\path';
      // 在非Windows系统上，长路径前缀会被标准化
      const expected = process.platform === 'win32' ? '\\\\?\\C:/very/long/path' : '//?/C:/very/long/path';
      expect(SCMPathHandler.normalizePath(input)).toBe(expected);
    });
  });

  describe('escapeShellPath', () => {
    test('应该在包含空格的路径上进行安全包裹（引号/转义）', () => {
      const inputWin = 'C:\\Program Files\\app\\file.txt';
      const inputUnix = '/usr/local/bin/app with spaces';
      const winEscaped = SCMPathHandler.escapeShellPath(inputWin);
      const unixEscaped = SCMPathHandler.escapeShellPath(inputUnix);
      // 接受包含空格且被引号包裹或已安全转义
      expect(/^["'].*Program Files.*["']$|Program\\ Files/.test(winEscaped)).toBe(true);
      expect(/^["'].*app with spaces.*["']$|app\\ with\\ spaces/.test(unixEscaped)).toBe(true);
    });

    test('应该对简单无空格路径保持不变', () => {
      const input = '/simple/path';
      const result = SCMPathHandler.escapeShellPath(input);
      expect(result === input || result === `'${input}'` || result === `"${input}"`).toBe(true);
    });

    test('应该对包含特殊字符的路径进行转义或包裹', () => {
      const input = 'file with & special chars';
      const result = SCMPathHandler.escapeShellPath(input);
      expect(/^["'].*&.*["']$|\&/.test(result)).toBe(true);
    });
  });

  describe('isAbsolute', () => {
    test('应该正确识别Unix绝对路径', () => {
      expect(SCMPathHandler.isAbsolute('/home/user')).toBe(true);
      expect(SCMPathHandler.isAbsolute('/usr/local/bin')).toBe(true);
      expect(SCMPathHandler.isAbsolute('relative/path')).toBe(false);
      expect(SCMPathHandler.isAbsolute('./relative')).toBe(false);
      expect(SCMPathHandler.isAbsolute('../relative')).toBe(false);
    });

    test('应该正确识别Windows绝对路径', () => {
      // 在非Windows系统上，Windows路径不会被识别为绝对路径
      if (process.platform === 'win32') {
        expect(SCMPathHandler.isAbsolute('C:\\Users\\user')).toBe(true);
        expect(SCMPathHandler.isAbsolute('D:\\Projects')).toBe(true);
        expect(SCMPathHandler.isAbsolute('\\\\server\\share')).toBe(true);
        expect(SCMPathHandler.isAbsolute('\\\\?\\C:\\long\\path')).toBe(true);
      } else {
        expect(SCMPathHandler.isAbsolute('C:\\Users\\user')).toBe(false);
        expect(SCMPathHandler.isAbsolute('D:\\Projects')).toBe(false);
        expect(SCMPathHandler.isAbsolute('\\\\server\\share')).toBe(false);
        expect(SCMPathHandler.isAbsolute('\\\\?\\C:\\long\\path')).toBe(false);
      }
      expect(SCMPathHandler.isAbsolute('relative\\path')).toBe(false);
      expect(SCMPathHandler.isAbsolute('.\\relative')).toBe(false);
      expect(SCMPathHandler.isAbsolute('..\\relative')).toBe(false);
    });

    test('应该处理边界情况', () => {
      expect(SCMPathHandler.isAbsolute('')).toBe(false);
      expect(SCMPathHandler.isAbsolute('.')).toBe(false);
      expect(SCMPathHandler.isAbsolute('..')).toBe(false);
    });
  });

  describe('toAbsolute', () => {
    test('应该保持绝对路径不变', () => {
      const absolutePath = '/absolute/path';
      expect(SCMPathHandler.toAbsolute(absolutePath)).toBe(absolutePath);
    });

    test('应该转换相对路径为绝对路径', () => {
      const relativePath = 'relative/path';
      const expected = path.resolve(mockCwd, relativePath);
      expect(SCMPathHandler.toAbsolute(relativePath)).toBe(expected);
    });

    test('应该处理特殊相对路径', () => {
      expect(SCMPathHandler.toAbsolute('.')).toBe(mockCwd);
      expect(SCMPathHandler.toAbsolute('..')).toBe(path.dirname(mockCwd));
    });

    test('应该处理复杂的相对路径', () => {
      const relativePath = '../parent/child';
      const result = SCMPathHandler.toAbsolute(relativePath);
      expect(result).toContain('parent/child');
    });
  });

  describe('handleLongPath', () => {
    test('应该在Windows上处理长路径', () => {
      const longPath = 'C:\\very\\long\\path\\that\\exceeds\\windows\\limit\\of\\260\\characters\\and\\needs\\to\\be\\handled\\properly\\with\\long\\path\\prefix';
      const result = SCMPathHandler.handleLongPath(longPath);
      expect(result).toBeDefined();
    });

    test('应该在Windows上处理短路径', () => {
      const shortPath = 'C:\\short\\path';
      const result = SCMPathHandler.handleLongPath(shortPath);
      expect(result).toBeDefined();
    });

    test('应该在Windows上处理UNC路径', () => {
      const uncPath = '\\\\server\\share\\path';
      const result = SCMPathHandler.handleLongPath(uncPath);
      expect(result).toBeDefined();
    });

    test('应该在非Windows系统上保持路径不变', () => {
      const unixPath = '/usr/local/bin/app';
      const result = SCMPathHandler.handleLongPath(unixPath);
      expect(result).toBe(unixPath);
    });
  });

  describe('findWorkspaceRoot', () => {
    test('应该找到包含.git的工作区根目录', () => {
      const startPath = '/home/user/project/subdir';
      const markers = ['.git', '.svn'];

      // Mock fs.existsSync to return true for .git
      mockFs.existsSync.mockImplementation((p) => {
        return String(p).includes('.git');
      });

      const result = SCMPathHandler.findWorkspaceRoot(startPath, markers);
      expect(result).toBeDefined();
    });

    test('应该找到包含.svn的工作区根目录', () => {
      const startPath = '/home/user/project/subdir';
      const markers = ['.git', '.svn'];

      // Mock fs.existsSync to return true for .svn
      mockFs.existsSync.mockImplementation((p) => {
        return String(p).includes('.svn');
      });

      const result = SCMPathHandler.findWorkspaceRoot(startPath, markers);
      expect(result).toBeDefined();
    });

    test('应该在没有找到标记时返回undefined', () => {
      const startPath = '/home/user/project/subdir';
      const markers = ['.git', '.svn'];

      mockFs.existsSync.mockReturnValue(false);

      const result = SCMPathHandler.findWorkspaceRoot(startPath, markers);
      expect(result).toBeUndefined();
    });

    test('应该处理无效的起始路径', () => {
      const startPath = '';
      const markers = ['.git', '.svn'];
      
      const result = SCMPathHandler.findWorkspaceRoot(startPath, markers);
      expect(result).toBeUndefined();
    });

    test('应该在根目录找到标记时返回根目录', () => {
      const startPath = '/home/user/project';
      const markers = ['.git', '.svn'];

      // Mock fs.existsSync to return true for .git in the root
      mockFs.existsSync.mockImplementation((p) => {
        return String(p) === '/home/user/project/.git';
      });

      const result = SCMPathHandler.findWorkspaceRoot(startPath, markers);
      expect(result).toBe('/home/user/project');
    });

    test('应该处理文件系统错误', () => {
      const startPath = '/home/user/project/subdir';
      const markers = ['.git', '.svn'];

      // Mock fs.existsSync to throw an error
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      const result = SCMPathHandler.findWorkspaceRoot(startPath, markers);
      expect(result).toBeUndefined();
    });
  });

  describe('createExecOptions', () => {
    test('应该创建默认执行选项', () => {
      const options = SCMPathHandler.createExecOptions("/test/path");
      expect(options).toHaveProperty('cwd');
      expect(options).toHaveProperty('maxBuffer');
      expect(options).toHaveProperty('encoding');
    });

    test('应该创建带工作目录的执行选项', () => {
      const customCwd = '/custom/working/directory';
      const options = SCMPathHandler.createExecOptions(customCwd);
      expect(options.cwd).toBeDefined();
    });

    test('应该创建带额外选项的执行选项', () => {
      const additionalOptions = { timeout: 5000 };
      const options = SCMPathHandler.createExecOptions('/test/cwd', additionalOptions);
      expect(options).toHaveProperty('timeout', 5000);
    });

    test('应该合并默认选项和额外选项', () => {
      const additionalOptions = { env: { NODE_ENV: 'test' } };
      const options = SCMPathHandler.createExecOptions('/test/cwd', additionalOptions);
      expect(options).toHaveProperty('env');
      expect(options).toHaveProperty('maxBuffer');
    });
  });

  describe('集成测试', () => {
    test('应该正确处理完整的路径处理流程', () => {
      const inputPath = 'C:\\Users\\test\\project\\file.txt';
      
      const normalized = SCMPathHandler.normalizePath(inputPath);
      const escaped = SCMPathHandler.escapeShellPath(normalized);
      const absolute = SCMPathHandler.toAbsolute(normalized);

      expect(SCMPathHandler.isAbsolute(absolute)).toBe(true);
    });

    test('应该正确处理Windows长路径流程', () => {
      const inputPath = 'C:\\very\\long\\path\\that\\exceeds\\windows\\limit';
      
      const normalized = SCMPathHandler.normalizePath(inputPath);
      const escaped = SCMPathHandler.escapeShellPath(normalized);
      const longPath = SCMPathHandler.handleLongPath(normalized);

      // 在非Windows系统上，Windows路径不会被识别为绝对路径
      if (process.platform === 'win32') {
        expect(SCMPathHandler.isAbsolute(longPath)).toBe(true);
      } else {
        expect(SCMPathHandler.isAbsolute(longPath)).toBe(false);
      }
    });

    test('应该正确处理Unix路径流程', () => {
      const inputPath = '/usr/local/bin/app with spaces';
      
      const normalized = SCMPathHandler.normalizePath(inputPath);
      const escaped = SCMPathHandler.escapeShellPath(normalized);
      const absolute = SCMPathHandler.toAbsolute(normalized);

      expect(SCMPathHandler.isAbsolute(absolute)).toBe(true);
    });
  });
});

const mockCwd = '/mock/current/directory';