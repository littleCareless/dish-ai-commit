import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as path from "path";
import * as fs from "fs";
import { ImprovedPathUtils } from "../../utils/improved-path-utils";

// Mock Node.js modules
vi.mock("fs");
vi.mock("child_process");

const mockFs = vi.mocked(fs);

describe("ImprovedPathUtils", () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 恢复原始平台
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      writable: true,
    });
  });

  describe("normalizePath", () => {
    it("应该标准化Unix路径", () => {
      const input = "/home/user//project/../project/src";
      const expected = "/home/user/project/src";
      expect(ImprovedPathUtils.normalizePath(input)).toBe(expected);
    });

    it("应该标准化Windows路径", () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      const input = "C:\\Users\\user\\\\project\\..\\project\\src";
      const expected = "C:\\Users\\user\\project\\src";
      expect(ImprovedPathUtils.normalizePath(input)).toBe(expected);
    });

    it("应该处理Windows长路径前缀", () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      const input =
        "\\\\?\\C:\\very\\long\\path\\that\\exceeds\\normal\\limits";
      const result = ImprovedPathUtils.normalizePath(input);
      expect(result).toContain("\\\\?\\");
      expect(result).toContain("C:\\very\\long\\path");
    });

    it("应该处理Unicode字符路径", () => {
      const input = "/home/用户/项目/测试文件夹";
      const result = ImprovedPathUtils.normalizePath(input);
      expect(result).toBe("/home/用户/项目/测试文件夹");
    });

    it("应该处理空路径和特殊情况", () => {
      expect(ImprovedPathUtils.normalizePath("")).toBe(".");
      expect(ImprovedPathUtils.normalizePath(".")).toBe(".");
      expect(ImprovedPathUtils.normalizePath("..")).toBe("..");
    });

    it("应该处理相对路径", () => {
      const input = "./src/../lib/utils";
      const expected = "lib/utils";
      expect(ImprovedPathUtils.normalizePath(input)).toBe(expected);
    });
  });

  describe("escapeShellPath", () => {
    it("应该转义Unix特殊字符", () => {
      Object.defineProperty(process, "platform", { value: "linux" });
      const testCases = [
        { input: "file with spaces.txt", expected: "'file with spaces.txt'" },
        { input: "file$with$vars.txt", expected: "'file$with$vars.txt'" },
        {
          input: "file`with`backticks.txt",
          expected: "'file`with`backticks.txt'",
        },
        {
          input: "file!with!exclamation.txt",
          expected: "'file!with!exclamation.txt'",
        },
        {
          input: "file*with*wildcards.txt",
          expected: "'file*with*wildcards.txt'",
        },
        {
          input: "file?with?question.txt",
          expected: "'file?with?question.txt'",
        },
        {
          input: "file[with]brackets.txt",
          expected: "'file[with]brackets.txt'",
        },
        { input: "file{with}braces.txt", expected: "'file{with}braces.txt'" },
        { input: "file|with|pipes.txt", expected: "'file|with|pipes.txt'" },
        {
          input: "file&with&ampersand.txt",
          expected: "'file&with&ampersand.txt'",
        },
        {
          input: "file;with;semicolon.txt",
          expected: "'file;with;semicolon.txt'",
        },
        { input: "file<with>angles.txt", expected: "'file<with>angles.txt'" },
        { input: "file(with)parens.txt", expected: "'file(with)parens.txt'" },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(ImprovedPathUtils.escapeShellPath(input)).toBe(expected);
      });
    });

    it("应该转义Windows特殊字符", () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      const testCases = [
        { input: "file with spaces.txt", expected: '"file with spaces.txt"' },
        { input: "file%with%percent.txt", expected: '"file%with%percent.txt"' },
        {
          input: "file!with!exclamation.txt",
          expected: '"file!with!exclamation.txt"',
        },
        { input: "file^with^caret.txt", expected: '"file^with^caret.txt"' },
        {
          input: "file&with&ampersand.txt",
          expected: '"file&with&ampersand.txt"',
        },
        { input: "file|with|pipes.txt", expected: '"file|with|pipes.txt"' },
        { input: "file<with>angles.txt", expected: '"file<with>angles.txt"' },
        { input: "file(with)parens.txt", expected: '"file(with)parens.txt"' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(ImprovedPathUtils.escapeShellPath(input)).toBe(expected);
      });
    });

    it("应该处理包含引号的路径", () => {
      Object.defineProperty(process, "platform", { value: "linux" });
      const input = 'file"with"quotes.txt';
      const result = ImprovedPathUtils.escapeShellPath(input);
      expect(result).toBe("'file\"with\"quotes.txt'");
    });

    it("应该处理Unicode文件名", () => {
      const input = "测试文件.txt";
      const result = ImprovedPathUtils.escapeShellPath(input);
      expect(result).toContain("测试文件.txt");
    });

    it("应该处理简单路径不添加引号", () => {
      const input = "simple-file.txt";
      expect(ImprovedPathUtils.escapeShellPath(input)).toBe("simple-file.txt");
    });
  });

  describe("isAbsolute", () => {
    it("应该正确识别Unix绝对路径", () => {
      Object.defineProperty(process, "platform", { value: "linux" });
      expect(ImprovedPathUtils.isAbsolute("/home/user")).toBe(true);
      expect(ImprovedPathUtils.isAbsolute("/usr/local/bin")).toBe(true);
      expect(ImprovedPathUtils.isAbsolute("relative/path")).toBe(false);
      expect(ImprovedPathUtils.isAbsolute("./relative")).toBe(false);
      expect(ImprovedPathUtils.isAbsolute("../relative")).toBe(false);
    });

    it("应该正确识别Windows绝对路径", () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      expect(ImprovedPathUtils.isAbsolute("C:\\Users\\user")).toBe(true);
      expect(ImprovedPathUtils.isAbsolute("D:\\Projects")).toBe(true);
      expect(ImprovedPathUtils.isAbsolute("\\\\server\\share")).toBe(true);
      expect(ImprovedPathUtils.isAbsolute("\\\\?\\C:\\long\\path")).toBe(true);
      expect(ImprovedPathUtils.isAbsolute("relative\\path")).toBe(false);
      expect(ImprovedPathUtils.isAbsolute(".\\relative")).toBe(false);
      expect(ImprovedPathUtils.isAbsolute("..\\relative")).toBe(false);
    });

    it("应该处理空路径和特殊情况", () => {
      expect(ImprovedPathUtils.isAbsolute("")).toBe(false);
      expect(ImprovedPathUtils.isAbsolute(".")).toBe(false);
      expect(ImprovedPathUtils.isAbsolute("..")).toBe(false);
    });
  });

  describe("toAbsolute", () => {
    const mockCwd = "/current/working/directory";

    beforeEach(() => {
      vi.spyOn(process, "cwd").mockReturnValue(mockCwd);
    });

    it("应该保持绝对路径不变", () => {
      const absolutePath = "/home/user/project";
      expect(ImprovedPathUtils.toAbsolute(absolutePath)).toBe(absolutePath);
    });

    it("应该将相对路径转换为绝对路径", () => {
      const relativePath = "src/utils";
      const expected = path.resolve(mockCwd, relativePath);
      expect(ImprovedPathUtils.toAbsolute(relativePath)).toBe(expected);
    });

    it("应该处理当前目录和父目录引用", () => {
      expect(ImprovedPathUtils.toAbsolute(".")).toBe(mockCwd);
      expect(ImprovedPathUtils.toAbsolute("..")).toBe(path.dirname(mockCwd));
    });

    it("应该处理Windows路径", () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      vi.spyOn(process, "cwd").mockReturnValue(
        "C:\\current\\working\\directory"
      );

      const relativePath = "src\\utils";
      const result = ImprovedPathUtils.toAbsolute(relativePath);
      expect(result).toContain("C:\\current\\working\\directory");
      expect(result).toContain("src\\utils");
    });
  });

  describe("handleLongPath", () => {
    it("应该为Windows长路径添加前缀", () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      const longPath =
        "C:\\" +
        "very\\".repeat(50) +
        "long\\path\\that\\exceeds\\260\\characters";
      const result = ImprovedPathUtils.handleLongPath(longPath);
      expect(result).toMatch(/^\\\\?\\/);
      expect(result).toContain(longPath);
    });

    it("应该保持已有长路径前缀", () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      const longPath = "\\\\?\\C:\\already\\prefixed\\long\\path";
      const result = ImprovedPathUtils.handleLongPath(longPath);
      expect(result).toBe(longPath);
    });

    it("应该在非Windows平台上保持路径不变", () => {
      Object.defineProperty(process, "platform", { value: "linux" });
      const longPath = "/very/long/path/that/would/be/long/on/windows";
      const result = ImprovedPathUtils.handleLongPath(longPath);
      expect(result).toBe(longPath);
    });

    it("应该处理短路径不添加前缀", () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      const shortPath = "C:\\short\\path";
      const result = ImprovedPathUtils.handleLongPath(shortPath);
      expect(result).toBe(shortPath);
    });

    it("应该处理UNC路径", () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      const uncPath =
        "\\\\server\\share\\very\\long\\path\\" + "folder\\".repeat(30);
      const result = ImprovedPathUtils.handleLongPath(uncPath);
      expect(result).toMatch(/^\\\\?\\/);
    });
  });

  describe("findWorkspaceRoot", () => {
    const mockExistsSync = vi.fn();

    beforeEach(() => {
      mockFs.existsSync = mockExistsSync;
    });

    it("应该找到包含.git的工作区根目录", () => {
      const startPath = "/home/user/project/src/utils";
      const markers = [".git", ".svn", "package.json"];
      mockExistsSync
        .mockReturnValueOnce(false) // /home/user/project/src/utils/.git
        .mockReturnValueOnce(false) // /home/user/project/src/utils/.svn
        .mockReturnValueOnce(false) // /home/user/project/src/utils/package.json
        .mockReturnValueOnce(true); // /home/user/project/src/.git

      const result = ImprovedPathUtils.findWorkspaceRoot(startPath, markers);
      expect(result).toBe("/home/user/project/src");
    });

    it("应该找到包含.svn的工作区根目录", () => {
      const startPath = "/home/user/project/src/utils";
      const markers = [".git", ".svn", "package.json"];
      mockExistsSync
        .mockReturnValueOnce(false) // .git
        .mockReturnValueOnce(true); // .svn

      const result = ImprovedPathUtils.findWorkspaceRoot(startPath, markers);
      expect(result).toBe("/home/user/project/src/utils");
    });

    it("应该找到包含package.json的工作区根目录", () => {
      const startPath = "/home/user/project/src/utils";
      const markers = [".git", ".svn", "package.json"];
      mockExistsSync
        .mockReturnValueOnce(false) // .git
        .mockReturnValueOnce(false) // .svn
        .mockReturnValueOnce(true); // package.json

      const result = ImprovedPathUtils.findWorkspaceRoot(startPath, markers);
      expect(result).toBe("/home/user/project/src/utils");
    });

    it("应该在找不到工作区根目录时返回undefined", () => {
      const startPath = "/home/user/project";
      const markers = [".git", ".svn", "package.json"];
      mockExistsSync.mockReturnValue(false);

      const result = ImprovedPathUtils.findWorkspaceRoot(startPath, markers);
      expect(result).toBeUndefined();
    });

    it("应该防止无限循环", () => {
      const startPath = "/";
      const markers = [".git", ".svn", "package.json"];
      mockExistsSync.mockReturnValue(false);

      const result = ImprovedPathUtils.findWorkspaceRoot(startPath, markers);
      expect(result).toBeUndefined();
    });

    it("应该处理Windows路径", async () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      const startPath = "C:\\Users\\user\\project\\src";
      const markers = [".git", ".svn", "package.json"];
      mockExistsSync
        .mockReturnValueOnce(false) // C:\Users\user\project\src\.git
        .mockReturnValueOnce(false) // C:\Users\user\project\src\.svn
        .mockReturnValueOnce(false) // C:\Users\user\project\src\package.json
        .mockReturnValueOnce(true); // C:\Users\user\project\.git

      const result = await ImprovedPathUtils.findWorkspaceRoot(startPath, markers);
      expect(result).toBe("C:\\Users\\user\\project");
    });

    it("应该处理相对路径", async () => {
      const startPath = "./src/utils";
      const markers = [".git", ".svn", "package.json"];
      mockExistsSync.mockReturnValue(false);

      const result = await ImprovedPathUtils.findWorkspaceRoot(
        startPath,
        markers
      );
      expect(result).toBeUndefined();
    });
  });

  describe("createExecOptions", () => {
    it("应该创建默认执行选项", () => {
      const options = ImprovedPathUtils.createExecOptions();

      expect(options.encoding).toBe("utf8");
      expect(options.maxBuffer).toBe(50 * 1024 * 1024); // 50MB
      expect(options.cwd).toBe(process.cwd());
      expect(options.env).toBeDefined();
    });

    it("应该使用自定义工作目录", () => {
      const customCwd = "/custom/working/directory";
      const options = ImprovedPathUtils.createExecOptions(customCwd);

      expect(options.cwd).toBe(customCwd);
    });

    it("应该合并环境变量", () => {
      const options = ImprovedPathUtils.createExecOptions();

      expect(options.env).toEqual(expect.objectContaining(process.env));
    });

    it("应该设置正确的缓冲区大小", () => {
      const options = ImprovedPathUtils.createExecOptions();

      expect(options.maxBuffer).toBe(52428800); // 50MB in bytes
    });

    it("应该设置UTF-8编码", () => {
      const options = ImprovedPathUtils.createExecOptions();

      expect(options.encoding).toBe("utf8");
    });
  });

  describe("跨平台集成测试", () => {
    it("应该在Linux上正确处理完整路径工作流", () => {
      Object.defineProperty(process, "platform", { value: "linux" });

      const inputPath = "/home/用户/项目/../项目/src/文件 with spaces.ts";
      const normalized = ImprovedPathUtils.normalizePath(inputPath);
      const escaped = ImprovedPathUtils.escapeShellPath(normalized);
      const absolute = ImprovedPathUtils.toAbsolute(normalized);

      expect(normalized).toBe("/home/用户/项目/src/文件 with spaces.ts");
      expect(escaped).toBe("'/home/用户/项目/src/文件 with spaces.ts'");
      expect(ImprovedPathUtils.isAbsolute(absolute)).toBe(true);
    });

    it("应该在Windows上正确处理完整路径工作流", () => {
      Object.defineProperty(process, "platform", { value: "win32" });

      const inputPath =
        "C:\\Users\\用户\\项目\\..\\项目\\src\\文件 with spaces.ts";
      const normalized = ImprovedPathUtils.normalizePath(inputPath);
      const escaped = ImprovedPathUtils.escapeShellPath(normalized);
      const longPath = ImprovedPathUtils.handleLongPath(normalized);

      expect(normalized).toBe("C:/Users/用户/项目/src/文件 with spaces.ts");
      expect(escaped).toBe("C:/Users/用户/项目/src/文件 with spaces.ts");
      expect(ImprovedPathUtils.isAbsolute(longPath)).toBe(true);
    });

    it("应该在macOS上正确处理完整路径工作流", () => {
      Object.defineProperty(process, "platform", { value: "darwin" });

      const inputPath = "/Users/用户/项目/../项目/src/文件 with spaces.ts";
      const normalized = ImprovedPathUtils.normalizePath(inputPath);
      const escaped = ImprovedPathUtils.escapeShellPath(normalized);
      const absolute = ImprovedPathUtils.toAbsolute(normalized);

      expect(normalized).toBe("/Users/用户/项目/src/文件 with spaces.ts");
      expect(escaped).toBe("'/Users/用户/项目/src/文件 with spaces.ts'");
      expect(ImprovedPathUtils.isAbsolute(absolute)).toBe(true);
    });
  });

  describe("边界情况和错误处理", () => {
    it("应该处理极长的路径", () => {
      const veryLongPath =
        "/home/" + "very-long-directory-name/".repeat(100) + "file.txt";
      const normalized = ImprovedPathUtils.normalizePath(veryLongPath);
      const escaped = ImprovedPathUtils.escapeShellPath(normalized);

      expect(normalized).toBeDefined();
      expect(escaped).toBeDefined();
      expect(escaped.length).toBeGreaterThan(veryLongPath.length);
    });

    it("应该处理包含所有特殊字符的路径", () => {
      Object.defineProperty(process, "platform", { value: "linux" });
      const specialPath =
        "/home/user/file with spaces & symbols $`!*?[]{}|;<>().txt";
      const escaped = ImprovedPathUtils.escapeShellPath(specialPath);

      expect(escaped).toContain("'");
      expect(escaped).toContain(specialPath);
    });

    it("应该处理空字符串和null值", () => {
      expect(() => ImprovedPathUtils.normalizePath("")).not.toThrow();
      expect(() => ImprovedPathUtils.escapeShellPath("")).not.toThrow();
      expect(() => ImprovedPathUtils.isAbsolute("")).not.toThrow();
    });

    it("应该处理Unicode控制字符", () => {
      const pathWithControlChars = "/home/user/file\u0000\u0001\u0002.txt";
      const normalized = ImprovedPathUtils.normalizePath(pathWithControlChars);
      const escaped = ImprovedPathUtils.escapeShellPath(normalized);

      expect(normalized).toBeDefined();
      expect(escaped).toBeDefined();
    });

    it("应该处理非常深的目录结构", () => {
      const deepPath = "/" + "level/".repeat(50) + "file.txt";
      const normalized = ImprovedPathUtils.normalizePath(deepPath);

      expect(normalized).toBeDefined();
      expect(normalized.split("/").length).toBeGreaterThan(50);
    });
  });

  describe("性能测试", () => {
    it("应该在合理时间内处理大量路径", () => {
      const paths = Array.from(
        { length: 1000 },
        (_, i) => `/home/user/project/src/file${i}.ts`
      );

      const startTime = Date.now();
      paths.forEach((p) => {
        ImprovedPathUtils.normalizePath(p);
        ImprovedPathUtils.escapeShellPath(p);
        ImprovedPathUtils.isAbsolute(p);
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });

    it("应该高效处理重复路径操作", () => {
      const testPath = "/home/user/project/src/utils/file.ts";

      const startTime = Date.now();
      for (let i = 0; i < 10000; i++) {
        ImprovedPathUtils.normalizePath(testPath);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // 应该在0.5秒内完成
    });
  });

  describe("安全性测试", () => {
    it("应该防止命令注入攻击", () => {
      const maliciousPath = '/home/user/file; rm -rf /; echo "hacked"';
      const escaped = ImprovedPathUtils.escapeShellPath(maliciousPath);

      // 检查是否被引号包围，而不是检查内容
      expect(escaped.startsWith("'") && escaped.endsWith("'")).toBe(true);
      // 确保路径被正确引用，防止命令注入
      expect(escaped).not.toBe(maliciousPath);
    });

    it("应该安全处理包含引号的路径", () => {
      const pathWithQuotes = '/home/user/"malicious"file.txt';
      const escaped = ImprovedPathUtils.escapeShellPath(pathWithQuotes);

      expect(escaped).toBeDefined();
      expect(escaped).toContain(pathWithQuotes);
    });

    it("应该安全处理包含反斜杠的路径", () => {
      const pathWithBackslashes = "/home/user/file\\with\\backslashes.txt";
      const escaped = ImprovedPathUtils.escapeShellPath(pathWithBackslashes);

      expect(escaped).toBeDefined();
      expect(escaped).toContain(pathWithBackslashes);
    });
  });
});
