import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SvnUtils } from '../../svn-utils';

// Mock i18n functions
vi.mock('../../../utils/i18n', () => ({
  getMessage: vi.fn((key: string) => key),
  formatMessage: vi.fn((key: string, args: any[]) => `${key}: ${args.join(', ')}`),
}));

describe('SvnUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset the initialized state
    (SvnUtils as any).initialized = false;
    (SvnUtils as any).config = undefined;
    (SvnUtils as any).svnPath = 'svn';

    // Mock process.env
    process.env.NODE_ENV = 'test';
    process.env.PATH = '/usr/bin:/bin';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('8.1 SVN配置和初始化测试', () => {
    describe('环境变量设置', () => {
      it('应该在环境配置无效时抛出错误', async () => {
        // Arrange
        (SvnUtils as any).config = undefined;

        // Act & Assert
        expect(() => (SvnUtils as any).getEnvironmentConfig()).toThrow();
      });
    });
  });

  describe('8.2 SVN作者信息提取测试', () => {
    describe('认证信息解析逻辑', () => {
      it('应该正确解析认证输出中的凭据', () => {
        // Arrange
        const authOutput = `Credentials cache in '/Users/test/.subversion/auth' contains:

Authentication realm: <https://svn.example.com:443> Example SVN Server
Username: john.doe
Passtype: simple

Authentication realm: <https://other.example.com:443> Other SVN Server
Username: jane.smith
Passtype: simple`;

        // Act
        const credentials = (SvnUtils as any).parseCredentials(authOutput);

        // Assert
        expect(credentials).toHaveLength(2);
        expect(credentials[0]).toEqual({
          username: 'john.doe',
          realm: 'https://svn.example.com:443'
        });
        expect(credentials[1]).toEqual({
          username: 'jane.smith',
          realm: 'https://other.example.com:443'
        });
      });

      it('应该正确提取主机名', () => {
        // Act & Assert
        expect((SvnUtils as any).extractHostWithoutPort('https://svn.example.com:443')).toBe('svn.example.com');
        expect((SvnUtils as any).extractHostWithoutPort('http://svn.example.com')).toBe('svn.example.com');
        expect((SvnUtils as any).extractHostWithoutPort('svn://svn.example.com:3690')).toBe('svn.example.com');
        expect((SvnUtils as any).extractHostWithoutPort('svn.example.com')).toBe('svn.example.com');
        expect((SvnUtils as any).extractHostWithoutPort('')).toBe('');
      });

      it('应该找到匹配的认证凭据', () => {
        // Arrange
        const credentials = [
          { username: 'john.doe', realm: 'https://svn.example.com:443' },
          { username: 'jane.smith', realm: 'https://other.example.com:443' }
        ];
        const repoUrl = 'https://svn.example.com/repo/trunk';

        // Act
        const result = (SvnUtils as any).findMatchingCredential(credentials, repoUrl);

        // Assert
        expect(result).toBe('john.doe');
      });

      it('应该在没有匹配凭据时返回第一个用户名', () => {
        // Arrange
        const credentials = [
          { username: 'john.doe', realm: 'https://svn.example.com:443' },
          { username: 'jane.smith', realm: 'https://other.example.com:443' }
        ];
        const repoUrl = 'https://different.example.com/repo/trunk';

        // Act
        const result = (SvnUtils as any).findMatchingCredential(credentials, repoUrl);

        // Assert
        expect(result).toBe('john.doe');
      });
    });
  });

  describe('8.3 SVN根目录查找测试', () => {
    describe('边界情况处理', () => {
      it('应该处理空路径', async () => {
        // Act
        const result = await SvnUtils.findSvnRoot('');

        // Assert
        expect(result).toBeUndefined();
      });

      it('应该处理根路径', async () => {
        // Arrange
        const startPath = '/';

        // Mock fs.promises.stat using vi.mock
        vi.doMock('fs', () => ({
          promises: {
            stat: vi.fn().mockImplementation((path: string) => {
              return Promise.reject(new Error('ENOENT: no such file or directory'));
            })
          }
        }));

        // Act
        const result = await SvnUtils.findSvnRoot(startPath);

        // Assert
        expect(result).toBeUndefined();
      });
    });
  });
});