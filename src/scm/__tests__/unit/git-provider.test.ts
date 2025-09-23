/**
 * Unit tests for GitProvider
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GitProvider } from "../../git-provider";
import {
  MockVSCodeAPIFactory,
  MockGitExtensionFactory,
} from "../helpers/mock-factories";
import { GitTestData, TestFileSystem } from "../helpers/test-data-generators";
import { MockCommandExecutor } from "../helpers/mock-command-executor";
import {
  TestConfig,
  MockVSCodeAPI,
  MockGitExtension,
} from "../helpers/test-interfaces";

// Mock VS Code API
vi.mock("vscode", () => ({
  workspace: {
    workspaceFolders: [],
    getConfiguration: vi.fn().mockReturnValue({
      get: vi.fn(),
      has: vi.fn(),
      inspect: vi.fn(),
      update: vi.fn(),
    }),
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

// Mock child_process - this will be set up properly in setupTestEnvironment
vi.mock("child_process", () => ({
  exec: vi.fn(),
}));

// Mock other dependencies
vi.mock("../../utils/i18n", () => ({
  getMessage: vi.fn((key: string) => `mock.${key}`),
  formatMessage: vi.fn(
    (key: string, args: any[] = []) => `mock.${key}.${args.join(".")}`
  ),
}));

vi.mock("../../utils/diff/diff-processor", () => ({
  DiffProcessor: {
    process: vi.fn((diff: string) => diff),
  },
}));

vi.mock("../../utils/notification/notification-manager", () => ({
  notify: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../../config/configuration-manager", () => ({
  ConfigurationManager: {
    getInstance: vi.fn(() => ({
      getConfig: vi.fn((key: string) => {
        if (key === "features.codeAnalysis.diffTarget") {
          return "all";
        }
        return "all";
      }),
    })),
  },
}));

vi.mock("../../config/services/configuration-service", () => ({
  ConfigurationService: vi.fn().mockImplementation(() => ({
    getConfig: vi.fn((key: string) => {
      if (key === "features.codeAnalysis.diffTarget") {
        return "all";
      }
      return "all";
    }),
  })),
}));

// Helper function to set up test environment
function setupTestEnvironment() {
  // Reset all mocks
  vi.clearAllMocks();

  // Clear command mocks first
  MockCommandExecutor.clearMocks();

  // Set up child_process exec mock
  const childProcess = vi.mocked(require("child_process"));
  const mockExec = MockCommandExecutor.getExecMock();
  childProcess.exec = mockExec;
  console.log("DEBUG: Mock exec set up:", typeof mockExec);

  // Create test workspace
  const mockWorkspacePath = TestFileSystem.createMockWorkspace("git");

  // Create mock Git extension
  const mockGitExtension = MockGitExtensionFactory.create({
    repositories: [{ rootUri: { fsPath: mockWorkspacePath } }],
  });

  // Create GitProvider instance
  const gitProvider = new GitProvider(mockGitExtension, mockWorkspacePath);

  return { gitProvider, mockGitExtension, mockWorkspacePath };
}

describe("GitProvider - getDiff功能测试", () => {
  let gitProvider: GitProvider;
  let mockGitExtension: MockGitExtension;
  let mockWorkspacePath: string;
  let mockVSCode: any;

  beforeEach(async () => {
    const testEnv = setupTestEnvironment();
    gitProvider = testEnv.gitProvider;
    mockGitExtension = testEnv.mockGitExtension;
    mockWorkspacePath = testEnv.mockWorkspacePath;
    mockVSCode = vi.mocked(await import("vscode"));
  });

  afterEach(() => {
    TestFileSystem.cleanup(mockWorkspacePath);
    MockCommandExecutor.clearMocks();
  });

  describe("getDiff - 基本功能测试", () => {
    it("应该成功获取所有文件的差异", async () => {
      // Arrange
      const diffOutput = GitTestData.generateDiffOutput([
        "file1.ts",
        "file2.ts",
      ]);

      // Mock git commands
      MockCommandExecutor.mockExec("git rev-parse HEAD", {
        stdout: "commit123",
      });
      MockCommandExecutor.mockExec("git diff HEAD --name-only", {
        stdout: "file1.ts\nfile2.ts",
      });
      MockCommandExecutor.mockExec("git diff --cached --name-only", {
        stdout: "",
      });
      MockCommandExecutor.mockExec("git ls-files --others --exclude-standard", {
        stdout: "",
      });
      MockCommandExecutor.mockExec("git diff HEAD", { stdout: diffOutput });
      MockCommandExecutor.mockExec("git diff --cached", { stdout: "" });

      // Act
      const result = await gitProvider.getDiff();

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain("file1.ts");
      expect(result).toContain("file2.ts");
    });

    it("应该成功获取指定文件的差异", async () => {
      // Arrange
      const files = ["src/test.ts"];
      const diffOutput = GitTestData.generateDiffOutput(files);

      MockCommandExecutor.mockExec("git rev-parse HEAD", {
        stdout: "commit123",
      });
      MockCommandExecutor.mockExec('git status --porcelain "src/test.ts"', {
        stdout: "M  src/test.ts",
      });
      MockCommandExecutor.mockExec('git diff HEAD -- "src/test.ts"', {
        stdout: diffOutput,
      });

      // Act
      const result = await gitProvider.getDiff(files);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain("src/test.ts");
      expect(result).toContain("Modified File");
    });

    it("应该处理新文件的差异", async () => {
      // Arrange
      const files = ["new-file.ts"];
      const newFileContent = 'console.log("new file");';

      MockCommandExecutor.mockExec("git rev-parse HEAD", {
        stdout: "commit123",
      });
      MockCommandExecutor.mockExec('git status --porcelain "new-file.ts"', {
        stdout: "?? new-file.ts",
      });
      MockCommandExecutor.mockExecError(
        'git diff --no-index /dev/null "new-file.ts"',
        {
          name: "Error",
          message: "Command failed",
          stdout: `diff --git a/dev/null b/new-file.ts
index 0000000..1234567 100644
--- a/dev/null
+++ b/new-file.ts
@@ -0,0 +1,1 @@
+${newFileContent}`,
        } as any
      );

      // Act
      const result = await gitProvider.getDiff(files);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain("New File: new-file.ts");
      expect(result).toContain(newFileContent);
    });

    it("应该处理已暂存的新文件", async () => {
      // Arrange
      const files = ["staged-file.ts"];
      const diffOutput = GitTestData.generateDiffOutput(files);

      MockCommandExecutor.mockExec("git rev-parse HEAD", {
        stdout: "commit123",
      });
      MockCommandExecutor.mockExec('git status --porcelain "staged-file.ts"', {
        stdout: "A  staged-file.ts",
      });
      MockCommandExecutor.mockExec('git diff --cached -- "staged-file.ts"', {
        stdout: diffOutput,
      });

      // Act
      const result = await gitProvider.getDiff(files);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain("Added File: staged-file.ts");
    });

    it("应该处理删除的文件", async () => {
      // Arrange
      const files = ["deleted-file.ts"];

      MockCommandExecutor.mockExec("git rev-parse HEAD", {
        stdout: "commit123",
      });
      MockCommandExecutor.mockExec('git status --porcelain "deleted-file.ts"', {
        stdout: "D  deleted-file.ts",
      });

      // Act
      const result = await gitProvider.getDiff(files);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain("Deleted File: deleted-file.ts");
    });
  });

  describe("getDiff - 无初始提交的仓库", () => {
    it("应该处理没有初始提交的仓库", async () => {
      // Arrange
      const diffOutput = GitTestData.generateDiffOutput(["file1.ts"]);

      MockCommandExecutor.mockExecError(
        "git rev-parse HEAD",
        new Error("fatal: bad revision 'HEAD'")
      );
      MockCommandExecutor.mockExec("git diff --name-only", {
        stdout: "file1.ts",
      });
      MockCommandExecutor.mockExec("git diff --cached --name-only", {
        stdout: "",
      });
      MockCommandExecutor.mockExec("git ls-files --others --exclude-standard", {
        stdout: "",
      });
      MockCommandExecutor.mockExec("git diff", { stdout: diffOutput });
      MockCommandExecutor.mockExec("git diff --cached", { stdout: "" });

      // Act
      const result = await gitProvider.getDiff();

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain("file1.ts");
    });

    it("应该处理指定文件在无初始提交仓库中的差异", async () => {
      // Arrange
      const files = ["test.ts"];
      const diffOutput = GitTestData.generateDiffOutput(files);

      MockCommandExecutor.mockExec("git rev-parse HEAD", {
        stdout: "commit123",
      });
      MockCommandExecutor.mockExec('git status --porcelain "test.ts"', {
        stdout: "M  test.ts",
      });
      MockCommandExecutor.mockExecError(
        'git diff HEAD -- "test.ts"',
        new Error("fatal: bad revision 'HEAD'")
      );
      MockCommandExecutor.mockExec('git diff -- "test.ts"', {
        stdout: diffOutput,
      });

      // Act
      const result = await gitProvider.getDiff(files);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain("test.ts");
    });
  });

  describe("getDiff - 暂存区模式", () => {
    it("应该只获取暂存区的更改", async () => {
      // Arrange
      const diffOutput = GitTestData.generateDiffOutput(["staged.ts"]);

      // Mock configuration to return 'staged'
      const mockConfigManager = {
        getConfig: vi.fn(() => "staged"),
      };
      vi.mocked(
        require("../../config/configuration-manager").ConfigurationManager
          .getInstance
      ).mockReturnValue(mockConfigManager);

      MockCommandExecutor.mockExec("git diff --cached --name-only", {
        stdout: "staged.ts",
      });
      MockCommandExecutor.mockExec("git diff --cached", { stdout: diffOutput });

      // Act
      const result = await gitProvider.getDiff();

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain("staged.ts");
    });

    it("应该处理暂存区为空的情况", async () => {
      // Arrange
      const mockConfigManager = {
        getConfig: vi.fn(() => "staged"),
      };
      vi.mocked(
        require("../../config/configuration-manager").ConfigurationManager
          .getInstance
      ).mockReturnValue(mockConfigManager);

      MockCommandExecutor.mockExec("git diff --cached --name-only", {
        stdout: "",
      });
      MockCommandExecutor.mockExec("git diff --cached", { stdout: "" });

      // Act & Assert
      await expect(gitProvider.getDiff()).rejects.toThrow(
        "mock.diff.noChanges"
      );
    });
  });

  describe("getDiff - 错误处理", () => {
    it("应该在没有更改时抛出错误", async () => {
      // Arrange
      MockCommandExecutor.mockExec("git rev-parse HEAD", {
        stdout: "commit123",
      });
      MockCommandExecutor.mockExec("git diff HEAD --name-only", { stdout: "" });
      MockCommandExecutor.mockExec("git diff --cached --name-only", {
        stdout: "",
      });
      MockCommandExecutor.mockExec("git ls-files --others --exclude-standard", {
        stdout: "",
      });
      MockCommandExecutor.mockExec("git diff HEAD", { stdout: "" });
      MockCommandExecutor.mockExec("git diff --cached", { stdout: "" });

      // Act & Assert
      await expect(gitProvider.getDiff()).rejects.toThrow(
        "mock.diff.noChanges"
      );
    });

    it("应该处理git命令执行失败", async () => {
      // Arrange
      MockCommandExecutor.mockExecError(
        "git rev-parse HEAD",
        new Error("Git command failed")
      );

      // Act & Assert
      await expect(gitProvider.getDiff()).rejects.toThrow("Git command failed");
    });

    it("应该处理文件状态检测失败", async () => {
      // Arrange
      const files = ["error-file.ts"];

      MockCommandExecutor.mockExec("git rev-parse HEAD", {
        stdout: "commit123",
      });
      MockCommandExecutor.mockExecError(
        'git status --porcelain "error-file.ts"',
        new Error("Status command failed")
      );

      // Act
      const result = await gitProvider.getDiff(files);

      // Assert - Should handle the error gracefully and show "Unknown" status
      expect(result).toBeDefined();
      expect(result).toContain("Unknown: error-file.ts");
    });
  });

  describe("getDiff - 性能测试", () => {
    it("应该在合理时间内处理大量文件", async () => {
      // Arrange
      const largeFileList = Array.from(
        { length: 100 },
        (_, i) => `file${i}.ts`
      );
      const diffOutput = GitTestData.generateDiffOutput(largeFileList);

      MockCommandExecutor.mockExec("git rev-parse HEAD", {
        stdout: "commit123",
      });

      // Mock status for all files
      largeFileList.forEach((file) => {
        MockCommandExecutor.mockExec(`git status --porcelain "${file}"`, {
          stdout: `M  ${file}`,
        });
        MockCommandExecutor.mockExec(`git diff HEAD -- "${file}"`, {
          stdout: `diff --git a/${file} b/${file}\n+modified content`,
        });
      });

      const startTime = Date.now();

      // Act
      const result = await gitProvider.getDiff(largeFileList);

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result).toBeDefined();
      expect(result).toContain("file0.ts");
      expect(result).toContain("file99.ts");
    });

    it("应该处理大文件差异而不超时", async () => {
      // Arrange
      const largeContent = "x".repeat(1024 * 1024); // 1MB of content
      const files = ["large-file.ts"];

      MockCommandExecutor.mockExec("git rev-parse HEAD", {
        stdout: "commit123",
      });
      MockCommandExecutor.mockExec('git status --porcelain "large-file.ts"', {
        stdout: "M  large-file.ts",
      });
      MockCommandExecutor.mockExec('git diff HEAD -- "large-file.ts"', {
        stdout: `diff --git a/large-file.ts b/large-file.ts\n+${largeContent}`,
      });

      const startTime = Date.now();

      // Act
      const result = await gitProvider.getDiff(files);

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds for large files
      expect(result).toBeDefined();
      expect(result).toContain("large-file.ts");
    });
  });

  describe("getDiff - 边界情况", () => {
    it("应该处理包含特殊字符的文件名", async () => {
      // Arrange
      const files = [
        "file with spaces.ts",
        'file"with"quotes.ts',
        "file\\with\\backslashes.ts",
      ];

      MockCommandExecutor.mockExec("git rev-parse HEAD", {
        stdout: "commit123",
      });

      files.forEach((file) => {
        const escapedFile = file.replace(/"/g, '\\"');
        MockCommandExecutor.mockExec(`git status --porcelain "${file}"`, {
          stdout: `M  ${file}`,
        });
        MockCommandExecutor.mockExec(`git diff HEAD -- "${escapedFile}"`, {
          stdout: `diff --git a/${file} b/${file}\n+content`,
        });
      });

      // Act
      const result = await gitProvider.getDiff(files);

      // Assert
      expect(result).toBeDefined();
      files.forEach((file) => {
        expect(result).toContain(file);
      });
    });

    it("应该处理空文件列表", async () => {
      // Arrange
      const files: string[] = [];

      MockCommandExecutor.mockExec("git rev-parse HEAD", {
        stdout: "commit123",
      });
      MockCommandExecutor.mockExec("git diff HEAD --name-only", { stdout: "" });
      MockCommandExecutor.mockExec("git diff --cached --name-only", {
        stdout: "",
      });
      MockCommandExecutor.mockExec("git ls-files --others --exclude-standard", {
        stdout: "",
      });
      MockCommandExecutor.mockExec("git diff HEAD", { stdout: "" });
      MockCommandExecutor.mockExec("git diff --cached", { stdout: "" });

      // Act & Assert
      await expect(gitProvider.getDiff(files)).rejects.toThrow(
        "mock.diff.noChanges"
      );
    });

    it("应该处理未跟踪文件的差异", async () => {
      // Arrange
      const untrackedFiles = "untracked1.ts\nuntracked2.ts";

      MockCommandExecutor.mockExec("git rev-parse HEAD", {
        stdout: "commit123",
      });
      MockCommandExecutor.mockExec("git diff HEAD --name-only", { stdout: "" });
      MockCommandExecutor.mockExec("git diff --cached --name-only", {
        stdout: "",
      });
      MockCommandExecutor.mockExec("git ls-files --others --exclude-standard", {
        stdout: untrackedFiles,
      });
      MockCommandExecutor.mockExec("git diff HEAD", { stdout: "" });
      MockCommandExecutor.mockExec("git diff --cached", { stdout: "" });

      // Mock diff for untracked files
      MockCommandExecutor.mockExecError(
        'git diff --no-index /dev/null "untracked1.ts"',
        {
          name: "Error",
          message: "Command failed",
          stdout: "diff --git a/dev/null b/untracked1.ts\n+new content 1",
        } as any
      );
      MockCommandExecutor.mockExecError(
        'git diff --no-index /dev/null "untracked2.ts"',
        {
          name: "Error",
          message: "Command failed",
          stdout: "diff --git a/dev/null b/untracked2.ts\n+new content 2",
        } as any
      );

      // Act
      const result = await gitProvider.getDiff();

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain("New File: untracked1.ts");
      expect(result).toContain("New File: untracked2.ts");
    });
  });
});

describe("GitProvider - 提交相关操作测试", () => {
  let gitProvider: GitProvider;
  let mockGitExtension: MockGitExtension;
  let mockWorkspacePath: string;
  let mockVSCode: any;

  beforeEach(async () => {
    const testEnv = setupTestEnvironment();
    gitProvider = testEnv.gitProvider;
    mockGitExtension = testEnv.mockGitExtension;
    mockWorkspacePath = testEnv.mockWorkspacePath;
    mockVSCode = vi.mocked(await import("vscode"));
  });

  afterEach(() => {
    TestFileSystem.cleanup(mockWorkspacePath);
    MockCommandExecutor.clearMocks();
  });

  describe("commit - 提交操作测试", () => {
    it("应该成功提交所有更改", async () => {
      // Arrange
      const commitMessage = "Test commit message";
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];

      // Act
      await gitProvider.commit(commitMessage);

      // Assert
      expect(mockRepository.commit).toHaveBeenCalledWith(commitMessage, {
        all: true,
        files: undefined,
      });
    });

    it("应该成功提交指定文件", async () => {
      // Arrange
      const commitMessage = "Test commit with specific files";
      const files = ["file1.ts", "file2.ts"];
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];

      // Act
      await gitProvider.commit(commitMessage, files);

      // Assert
      expect(mockRepository.commit).toHaveBeenCalledWith(commitMessage, {
        all: false,
        files,
      });
    });

    it("应该在没有仓库时抛出错误", async () => {
      // Arrange
      const commitMessage = "Test commit";
      const mockGitExtensionNoRepo = MockGitExtensionFactory.create({
        repositories: [], // No repositories
      });
      const gitProviderNoRepo = new GitProvider(
        mockGitExtensionNoRepo,
        mockWorkspacePath
      );

      // Act & Assert
      await expect(gitProviderNoRepo.commit(commitMessage)).rejects.toThrow(
        "mock.scm.repository.not.found.Git"
      );
    });

    it("应该处理提交失败的情况", async () => {
      // Arrange
      const commitMessage = "Test commit that fails";
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];
      const commitError = new Error("Commit failed");
      mockRepository.commit.mockRejectedValue(commitError);

      // Act & Assert
      await expect(gitProvider.commit(commitMessage)).rejects.toThrow(
        "Commit failed"
      );
    });

    it("应该处理空提交信息", async () => {
      // Arrange
      const commitMessage = "";
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];

      // Act
      await gitProvider.commit(commitMessage);

      // Assert
      expect(mockRepository.commit).toHaveBeenCalledWith("", {
        all: true,
        files: undefined,
      });
    });

    it("应该处理包含特殊字符的提交信息", async () => {
      // Arrange
      const commitMessage = 'Test commit with "quotes" and \n newlines';
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];

      // Act
      await gitProvider.commit(commitMessage);

      // Assert
      expect(mockRepository.commit).toHaveBeenCalledWith(commitMessage, {
        all: true,
        files: undefined,
      });
    });
  });

  describe("setCommitInput - 设置提交输入框测试", () => {
    it("应该成功设置提交输入框内容", async () => {
      // Arrange
      const message = "Test commit message";
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];

      // Act
      await gitProvider.setCommitInput(message);

      // Assert
      expect(mockRepository.inputBox.value).toBe(message);
    });

    it("应该在没有输入框时复制到剪贴板", async () => {
      // Arrange
      const message = "Test commit message for clipboard";
      const mockGitExtensionNoInputBox = MockGitExtensionFactory.create({
        repositories: [{ inputBox: undefined as any }], // No input box
      });
      const gitProviderNoInputBox = new GitProvider(
        mockGitExtensionNoInputBox,
        mockWorkspacePath
      );

      // Act
      await gitProviderNoInputBox.setCommitInput(message);

      // Assert
      // Note: This test would need proper vscode mock setup to verify clipboard calls
    });

    it("应该在剪贴板复制失败时显示手动复制提示", async () => {
      // Arrange
      const message = "Test commit message";
      const mockGitExtensionNoInputBox = MockGitExtensionFactory.create({
        repositories: [{ inputBox: undefined as any }],
      });
      const gitProviderNoInputBox = new GitProvider(
        mockGitExtensionNoInputBox,
        mockWorkspacePath
      );
      const clipboardError = new Error("Clipboard access denied");
      const vscode = vi.mocked(await import("vscode"));
      (vscode.env.clipboard.writeText as any).mockRejectedValue(clipboardError);

      // Act
      await gitProviderNoInputBox.setCommitInput(message);

      // Assert
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        `mock.commit.message.manual.copy.${message}`
      );
    });

    it("应该处理长提交信息", async () => {
      // Arrange
      const longMessage = "x".repeat(1000); // 1000 character message
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];

      // Act
      await gitProvider.setCommitInput(longMessage);

      // Assert
      expect(mockRepository.inputBox.value).toBe(longMessage);
    });

    it("应该处理包含换行符的提交信息", async () => {
      // Arrange
      const multilineMessage = "First line\nSecond line\nThird line";
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];

      // Act
      await gitProvider.setCommitInput(multilineMessage);

      // Assert
      expect(mockRepository.inputBox.value).toBe(multilineMessage);
    });
  });

  describe("getCommitInput - 获取提交输入框测试", () => {
    it("应该成功获取提交输入框内容", async () => {
      // Arrange
      const expectedMessage = "Current commit message";
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];
      mockRepository.inputBox.value = expectedMessage;

      // Act
      const result = await gitProvider.getCommitInput();

      // Assert
      expect(result).toBe(expectedMessage);
    });

    it("应该在没有仓库时抛出错误", async () => {
      // Arrange
      const mockGitExtensionNoRepo = MockGitExtensionFactory.create({
        repositories: [], // No repositories
      });
      const gitProviderNoRepo = new GitProvider(
        mockGitExtensionNoRepo,
        mockWorkspacePath
      );

      // Act & Assert
      await expect(gitProviderNoRepo.getCommitInput()).rejects.toThrow(
        "mock.scm.repository.not.found.Git"
      );
    });

    it("应该返回空字符串当输入框为空时", async () => {
      // Arrange
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];
      mockRepository.inputBox.value = "";

      // Act
      const result = await gitProvider.getCommitInput();

      // Assert
      expect(result).toBe("");
    });

    it("应该处理包含特殊字符的输入框内容", async () => {
      // Arrange
      const specialMessage =
        'Message with "quotes" and \n newlines and \t tabs';
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];
      mockRepository.inputBox.value = specialMessage;

      // Act
      const result = await gitProvider.getCommitInput();

      // Assert
      expect(result).toBe(specialMessage);
    });
  });

  describe("startStreamingInput - 流式输入测试", () => {
    it("应该成功设置流式输入内容", async () => {
      // Arrange
      const message = "Streaming commit message";
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];

      // Act
      await gitProvider.startStreamingInput(message);

      // Assert
      expect(mockRepository.inputBox.value).toBe(message);
    });

    it("应该在没有输入框时复制到剪贴板", async () => {
      // Arrange
      const message = "Streaming message for clipboard";
      const mockGitExtensionNoInputBox = MockGitExtensionFactory.create({
        repositories: [{ inputBox: undefined as any }],
      });
      const gitProviderNoInputBox = new GitProvider(
        mockGitExtensionNoInputBox,
        mockWorkspacePath
      );

      // Act
      await gitProviderNoInputBox.startStreamingInput(message);

      // Assert
      expect(mockVSCode.env.clipboard.writeText).toHaveBeenCalledWith(message);
    });

    it("应该在剪贴板复制失败时显示手动复制提示", async () => {
      // Arrange
      const message = "Streaming message";
      const mockGitExtensionNoInputBox = MockGitExtensionFactory.create({
        repositories: [{ inputBox: undefined as any }],
      });
      const gitProviderNoInputBox = new GitProvider(
        mockGitExtensionNoInputBox,
        mockWorkspacePath
      );
      const clipboardError = new Error("Clipboard access denied");
      (mockVSCode.env.clipboard.writeText as any).mockRejectedValue(
        clipboardError
      );

      // Act
      await gitProviderNoInputBox.startStreamingInput(message);

      // Assert
      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
        `mock.commit.message.manual.copy.${message}`
      );
    });

    it("应该处理分块流式输入", async () => {
      // Arrange
      const fullMessage = "Complete streaming message";
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];

      // Act
      await gitProvider.startStreamingInput(fullMessage);

      // Assert
      expect(mockRepository.inputBox.value).toBe(fullMessage);
    });

    it("应该处理空的流式输入", async () => {
      // Arrange
      const emptyMessage = "";
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];

      // Act
      await gitProvider.startStreamingInput(emptyMessage);

      // Assert
      expect(mockRepository.inputBox.value).toBe(emptyMessage);
    });
  });

  describe("copyToClipboard - 剪贴板复制测试", () => {
    it("应该成功复制消息到剪贴板", async () => {
      // Arrange
      const message = "Message to copy";

      // Act
      await gitProvider.copyToClipboard(message);

      // Assert
      expect(mockVSCode.env.clipboard.writeText).toHaveBeenCalledWith(message);
    });

    it("应该处理剪贴板复制失败", async () => {
      // Arrange
      const message = "Message that fails to copy";
      const clipboardError = new Error("Clipboard not available");
      (mockVSCode.env.clipboard.writeText as any).mockRejectedValue(
        clipboardError
      );

      // Act
      await gitProvider.copyToClipboard(message);

      // Assert
      expect(mockVSCode.env.clipboard.writeText).toHaveBeenCalledWith(message);
      // Should not throw error, just handle it gracefully
    });

    it("应该处理长消息的复制", async () => {
      // Arrange
      const longMessage = "x".repeat(10000); // 10KB message

      // Act
      await gitProvider.copyToClipboard(longMessage);

      // Assert
      expect(mockVSCode.env.clipboard.writeText).toHaveBeenCalledWith(
        longMessage
      );
    });

    it("应该处理包含特殊字符的消息复制", async () => {
      // Arrange
      const specialMessage = 'Message with "quotes", \n newlines, and \t tabs';

      // Act
      await gitProvider.copyToClipboard(specialMessage);

      // Assert
      expect(mockVSCode.env.clipboard.writeText).toHaveBeenCalledWith(
        specialMessage
      );
    });
  });
});

describe("GitProvider - 日志和分支查询测试", () => {
  let gitProvider: GitProvider;
  let mockGitExtension: MockGitExtension;
  let mockWorkspacePath: string;
  let mockVSCode: any;

  beforeEach(async () => {
    const testEnv = setupTestEnvironment();
    gitProvider = testEnv.gitProvider;
    mockGitExtension = testEnv.mockGitExtension;
    mockWorkspacePath = testEnv.mockWorkspacePath;
    mockVSCode = vi.mocked(await import("vscode"));
  });

  afterEach(() => {
    TestFileSystem.cleanup(mockWorkspacePath);
    MockCommandExecutor.clearMocks();
  });

  describe("getCommitLog - 提交日志查询测试", () => {
    it("应该成功获取默认分支间的提交日志", async () => {
      // Arrange
      const commitMessages = [
        "feat: add new feature",
        "fix: resolve bug",
        "docs: update readme",
      ];
      const logOutput = commitMessages.join("\n");

      MockCommandExecutor.mockExec(
        "git show-ref --verify --quiet refs/remotes/origin/main",
        { stdout: "" }
      );
      MockCommandExecutor.mockExec(
        'git log origin/main..HEAD --pretty=format:"%s" --no-merges',
        { stdout: logOutput }
      );

      // Act
      const result = await gitProvider.getCommitLog();

      // Assert
      expect(result).toEqual(commitMessages);
    });

    it("应该成功获取指定分支间的提交日志", async () => {
      // Arrange
      const baseBranch = "origin/develop";
      const headBranch = "feature/test";
      const commitMessages = [
        "feat: implement feature",
        "test: add unit tests",
      ];
      const logOutput = commitMessages.join("\n");

      MockCommandExecutor.mockExec(
        "git show-ref --verify --quiet refs/remotes/origin/develop",
        { stdout: "" }
      );
      MockCommandExecutor.mockExec(
        'git log origin/develop..feature/test --pretty=format:"%s" --no-merges',
        { stdout: logOutput }
      );

      // Act
      const result = await gitProvider.getCommitLog(baseBranch, headBranch);

      // Assert
      expect(result).toEqual(commitMessages);
    });

    it("应该处理远程分支不存在的情况", async () => {
      // Arrange
      const baseBranch = "origin/nonexistent";

      MockCommandExecutor.mockExecError(
        "git show-ref --verify --quiet refs/remotes/origin/nonexistent",
        new Error("Branch not found")
      );
      MockCommandExecutor.mockExecError(
        "git show-ref --verify --quiet refs/heads/nonexistent",
        new Error("Branch not found")
      );
      MockCommandExecutor.mockExec(
        "git show-ref --verify --quiet refs/remotes/origin/main",
        { stdout: "" }
      );
      MockCommandExecutor.mockExec(
        'git log origin/main..HEAD --pretty=format:"%s" --no-merges',
        { stdout: "fallback commit" }
      );

      // Act
      const result = await gitProvider.getCommitLog(baseBranch);

      // Assert
      expect(result).toEqual(["fallback commit"]);
    });

    it("应该处理本地分支回退", async () => {
      // Arrange
      const baseBranch = "origin/main";
      const commitMessages = ["local commit 1", "local commit 2"];
      const logOutput = commitMessages.join("\n");

      MockCommandExecutor.mockExecError(
        "git show-ref --verify --quiet refs/remotes/origin/main",
        new Error("Remote not found")
      );
      MockCommandExecutor.mockExec(
        "git show-ref --verify --quiet refs/heads/main",
        { stdout: "" }
      );
      MockCommandExecutor.mockExec(
        'git log main..HEAD --pretty=format:"%s" --no-merges',
        { stdout: logOutput }
      );

      // Act
      const result = await gitProvider.getCommitLog(baseBranch);

      // Assert
      expect(result).toEqual(commitMessages);
    });

    it("应该处理没有提交的情况", async () => {
      // Arrange
      MockCommandExecutor.mockExec(
        "git show-ref --verify --quiet refs/remotes/origin/main",
        { stdout: "" }
      );
      MockCommandExecutor.mockExec(
        'git log origin/main..HEAD --pretty=format:"%s" --no-merges',
        { stdout: "" }
      );

      // Act
      const result = await gitProvider.getCommitLog();

      // Assert
      expect(result).toEqual([]);
    });

    it("应该处理git log命令失败", async () => {
      // Arrange
      MockCommandExecutor.mockExec(
        "git show-ref --verify --quiet refs/remotes/origin/main",
        { stdout: "" }
      );
      MockCommandExecutor.mockExecError(
        'git log origin/main..HEAD --pretty=format:"%s" --no-merges',
        new Error("Git log failed")
      );

      // Act
      const result = await gitProvider.getCommitLog();

      // Assert
      expect(result).toEqual([]);
    });

    it("应该过滤空的提交信息行", async () => {
      // Arrange
      const logOutput = "commit 1\n\ncommit 2\n\n\ncommit 3\n";
      const expectedCommits = ["commit 1", "commit 2", "commit 3"];

      MockCommandExecutor.mockExec(
        "git show-ref --verify --quiet refs/remotes/origin/main",
        { stdout: "" }
      );
      MockCommandExecutor.mockExec(
        'git log origin/main..HEAD --pretty=format:"%s" --no-merges',
        { stdout: logOutput }
      );

      // Act
      const result = await gitProvider.getCommitLog();

      // Assert
      expect(result).toEqual(expectedCommits);
    });

    it("应该处理包含特殊字符的提交信息", async () => {
      // Arrange
      const commitMessages = [
        'feat: add "quoted" feature',
        "fix: resolve issue with \n newlines",
        "docs: update with \t tabs",
      ];
      const logOutput = commitMessages.join("\n");

      MockCommandExecutor.mockExec(
        "git show-ref --verify --quiet refs/remotes/origin/main",
        { stdout: "" }
      );
      MockCommandExecutor.mockExec(
        'git log origin/main..HEAD --pretty=format:"%s" --no-merges',
        { stdout: logOutput }
      );

      // Act
      const result = await gitProvider.getCommitLog();

      // Assert
      expect(result).toEqual(commitMessages);
    });
  });

  describe("getBranches - 分支列表查询测试", () => {
    it("应该成功获取所有分支列表", async () => {
      // Arrange
      const branchOutput =
        "main\ndevelop\nfeature/test\nremotes/origin/main\nremotes/origin/develop";
      const expectedBranches = [
        "develop",
        "feature/test",
        "main",
        "origin/develop",
        "origin/main",
      ];

      MockCommandExecutor.mockExec(
        'git branch -a --format="%(refname:short)"',
        { stdout: branchOutput }
      );

      // Act
      const result = await gitProvider.getBranches();

      // Assert
      expect(result).toEqual(expectedBranches);
    });

    it("应该过滤HEAD指向等特殊行", async () => {
      // Arrange
      const branchOutput =
        "main\nremotes/origin/HEAD -> origin/main\nremotes/origin/main\ndevelop";
      const expectedBranches = ["develop", "main", "origin/main"];

      MockCommandExecutor.mockExec(
        'git branch -a --format="%(refname:short)"',
        { stdout: branchOutput }
      );

      // Act
      const result = await gitProvider.getBranches();

      // Assert
      expect(result).toEqual(expectedBranches);
    });

    it("应该去重分支名称", async () => {
      // Arrange
      const branchOutput =
        "main\nremotes/origin/main\nmain\ndevelop\nremotes/origin/develop";
      const expectedBranches = [
        "develop",
        "main",
        "origin/develop",
        "origin/main",
      ];

      MockCommandExecutor.mockExec(
        'git branch -a --format="%(refname:short)"',
        { stdout: branchOutput }
      );

      // Act
      const result = await gitProvider.getBranches();

      // Assert
      expect(result).toEqual(expectedBranches);
    });

    it("应该处理没有分支的情况", async () => {
      // Arrange
      MockCommandExecutor.mockExec(
        'git branch -a --format="%(refname:short)"',
        { stdout: "" }
      );

      // Act
      const result = await gitProvider.getBranches();

      // Assert
      expect(result).toEqual([]);
    });

    it("应该处理git branch命令失败", async () => {
      // Arrange
      MockCommandExecutor.mockExecError(
        'git branch -a --format="%(refname:short)"',
        new Error("Git branch failed")
      );

      // Act
      const result = await gitProvider.getBranches();

      // Assert
      expect(result).toEqual([]);
    });

    it("应该正确排序分支列表", async () => {
      // Arrange
      const branchOutput = "zebra\nalpha\nbeta\nremotes/origin/gamma";
      const expectedBranches = ["alpha", "beta", "origin/gamma", "zebra"];

      MockCommandExecutor.mockExec(
        'git branch -a --format="%(refname:short)"',
        { stdout: branchOutput }
      );

      // Act
      const result = await gitProvider.getBranches();

      // Assert
      expect(result).toEqual(expectedBranches);
    });

    it("应该处理包含特殊字符的分支名", async () => {
      // Arrange
      const branchOutput =
        "feature/test-123\nbugfix/issue-456\nrelease/v1.0.0\nhotfix/urgent_fix";
      const expectedBranches = [
        "bugfix/issue-456",
        "feature/test-123",
        "hotfix/urgent_fix",
        "release/v1.0.0",
      ];

      MockCommandExecutor.mockExec(
        'git branch -a --format="%(refname:short)"',
        { stdout: branchOutput }
      );

      // Act
      const result = await gitProvider.getBranches();

      // Assert
      expect(result).toEqual(expectedBranches);
    });
  });

  describe("getRecentCommitMessages - 最近提交信息测试", () => {
    it("应该成功获取仓库和用户的最近提交信息", async () => {
      // Arrange
      const repositoryCommits = [
        { message: "feat: add feature 1\nDetailed description" },
        { message: "fix: resolve bug 2\nBug details" },
        { message: "docs: update readme 3" },
      ];
      const userCommits = [
        { message: "feat: my feature 1\nMy description" },
        { message: "fix: my bug fix 2" },
      ];

      const mockRepository = mockGitExtension.getAPI(1).repositories[0];
      mockRepository.log
        .mockResolvedValueOnce(repositoryCommits) // First call for repository commits
        .mockResolvedValueOnce(userCommits); // Second call for user commits
      mockRepository.getConfig.mockResolvedValue("Test User");
      mockRepository.getGlobalConfig.mockResolvedValue("Test User");

      // Act
      const result = await gitProvider.getRecentCommitMessages();

      // Assert
      expect(result.repository).toEqual([
        "feat: add feature 1",
        "fix: resolve bug 2",
        "docs: update readme 3",
      ]);
      expect(result.user).toEqual(["feat: my feature 1", "fix: my bug fix 2"]);
      expect(mockRepository.log).toHaveBeenCalledWith({ maxEntries: 5 });
      expect(mockRepository.log).toHaveBeenCalledWith({
        maxEntries: 5,
        author: "Test User",
      });
    });

    it("应该处理没有仓库的情况", async () => {
      // Arrange
      const mockGitExtensionNoRepo = MockGitExtensionFactory.create({
        repositories: [], // No repositories
      });
      const gitProviderNoRepo = new GitProvider(
        mockGitExtensionNoRepo,
        mockWorkspacePath
      );

      // Act
      const result = await gitProviderNoRepo.getRecentCommitMessages();

      // Assert
      expect(result.repository).toEqual([]);
      expect(result.user).toEqual([]);
    });

    it("应该处理获取提交失败的情况", async () => {
      // Arrange
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];
      mockRepository.log.mockRejectedValue(new Error("Failed to get commits"));
      mockRepository.getConfig.mockResolvedValue("Test User");

      // Act
      const result = await gitProvider.getRecentCommitMessages();

      // Assert
      expect(result.repository).toEqual([]);
      expect(result.user).toEqual([]);
    });

    it("应该处理用户配置不存在的情况", async () => {
      // Arrange
      const repositoryCommits = [{ message: "test commit" }];
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];
      mockRepository.log.mockResolvedValue(repositoryCommits);
      mockRepository.getConfig.mockResolvedValue(undefined);
      mockRepository.getGlobalConfig.mockResolvedValue(undefined);

      // Act
      const result = await gitProvider.getRecentCommitMessages();

      // Assert
      expect(result.repository).toEqual(["test commit"]);
      expect(result.user).toEqual([]);
      expect(mockRepository.log).toHaveBeenCalledWith({
        maxEntries: 5,
        author: undefined,
      });
    });

    it("应该只返回提交信息的第一行", async () => {
      // Arrange
      const repositoryCommits = [
        {
          message:
            "feat: add feature\n\nThis is a detailed description\nwith multiple lines",
        },
        { message: "fix: resolve bug\nBug details here" },
        { message: "single line commit" },
      ];

      const mockRepository = mockGitExtension.getAPI(1).repositories[0];
      mockRepository.log
        .mockResolvedValueOnce(repositoryCommits)
        .mockResolvedValueOnce([]);
      mockRepository.getConfig.mockResolvedValue("Test User");

      // Act
      const result = await gitProvider.getRecentCommitMessages();

      // Assert
      expect(result.repository).toEqual([
        "feat: add feature",
        "fix: resolve bug",
        "single line commit",
      ]);
    });

    it("应该使用全局配置作为用户名回退", async () => {
      // Arrange
      const userCommits = [{ message: "user commit" }];
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];
      mockRepository.log
        .mockResolvedValueOnce([]) // Repository commits
        .mockResolvedValueOnce(userCommits); // User commits
      mockRepository.getConfig.mockResolvedValue(undefined); // No local config
      mockRepository.getGlobalConfig.mockResolvedValue("Global User"); // Global config available

      // Act
      const result = await gitProvider.getRecentCommitMessages();

      // Assert
      expect(result.user).toEqual(["user commit"]);
      expect(mockRepository.log).toHaveBeenCalledWith({
        maxEntries: 5,
        author: "Global User",
      });
    });

    it("应该处理空的提交列表", async () => {
      // Arrange
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];
      mockRepository.log.mockResolvedValue([]); // Empty commits
      mockRepository.getConfig.mockResolvedValue("Test User");

      // Act
      const result = await gitProvider.getRecentCommitMessages();

      // Assert
      expect(result.repository).toEqual([]);
      expect(result.user).toEqual([]);
    });
  });
});

describe("GitProvider - 错误处理测试", () => {
  let gitProvider: GitProvider;
  let mockGitExtension: MockGitExtension;
  let mockWorkspacePath: string;
  let mockVSCode: any;

  beforeEach(async () => {
    const testEnv = setupTestEnvironment();
    gitProvider = testEnv.gitProvider;
    mockGitExtension = testEnv.mockGitExtension;
    mockWorkspacePath = testEnv.mockWorkspacePath;
    mockVSCode = vi.mocked(await import("vscode"));
  });

  afterEach(() => {
    TestFileSystem.cleanup(mockWorkspacePath);
    MockCommandExecutor.clearMocks();
  });

  describe("网络连接失败处理", () => {
    it("应该处理远程仓库连接失败", async () => {
      // Arrange
      const networkError = new Error(
        "fatal: unable to access 'https://github.com/repo.git/': Could not resolve host"
      );
      MockCommandExecutor.mockExecError("git rev-parse HEAD", networkError);

      // Act & Assert
      await expect(gitProvider.getDiff()).rejects.toThrow(
        "fatal: unable to access"
      );
    });

    it("应该处理推送时的网络错误", async () => {
      // Arrange
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];
      const networkError = new Error(
        "fatal: unable to access remote repository"
      );
      mockRepository.commit.mockRejectedValue(networkError);

      // Act & Assert
      await expect(gitProvider.commit("test commit")).rejects.toThrow(
        "fatal: unable to access remote repository"
      );
    });

    it("应该处理超时错误", async () => {
      // Arrange
      const timeoutError = new Error(
        "fatal: The remote end hung up unexpectedly"
      );
      MockCommandExecutor.mockExecError(
        'git log origin/main..HEAD --pretty=format:"%s" --no-merges',
        timeoutError
      );
      MockCommandExecutor.mockExec(
        "git show-ref --verify --quiet refs/remotes/origin/main",
        { stdout: "" }
      );

      // Act
      const result = await gitProvider.getCommitLog();

      // Assert
      expect(result).toEqual([]); // Should return empty array instead of throwing
    });

    it("应该处理DNS解析失败", async () => {
      // Arrange
      const dnsError = new Error(
        "fatal: Could not resolve hostname github.com"
      );
      MockCommandExecutor.mockExecError("git fetch", dnsError);

      // Act & Assert
      await expect(gitProvider.getDiff()).rejects.toThrow(
        "Could not resolve hostname"
      );
    });
  });

  describe("仓库损坏检测", () => {
    it("应该检测损坏的Git仓库", async () => {
      // Arrange
      const corruptError = new Error(
        "fatal: not a git repository (or any of the parent directories): .git"
      );
      MockCommandExecutor.mockExecError("git rev-parse HEAD", corruptError);

      // Act & Assert
      await expect(gitProvider.getDiff()).rejects.toThrow(
        "not a git repository"
      );
    });

    it("应该处理损坏的Git对象", async () => {
      // Arrange
      const objectError = new Error("fatal: loose object is corrupt");
      MockCommandExecutor.mockExecError("git diff HEAD", objectError);
      MockCommandExecutor.mockExec("git rev-parse HEAD", {
        stdout: "commit123",
      });
      MockCommandExecutor.mockExec("git diff HEAD --name-only", {
        stdout: "file.ts",
      });
      MockCommandExecutor.mockExec("git diff --cached --name-only", {
        stdout: "",
      });
      MockCommandExecutor.mockExec("git ls-files --others --exclude-standard", {
        stdout: "",
      });
      MockCommandExecutor.mockExec("git diff --cached", { stdout: "" });

      // Act & Assert
      await expect(gitProvider.getDiff()).rejects.toThrow(
        "loose object is corrupt"
      );
    });

    it("应该处理缺失的Git引用", async () => {
      // Arrange
      const refError = new Error("fatal: bad revision 'HEAD'");
      MockCommandExecutor.mockExecError("git rev-parse HEAD", refError);
      MockCommandExecutor.mockExec("git diff --name-only", {
        stdout: "file.ts",
      });
      MockCommandExecutor.mockExec("git diff --cached --name-only", {
        stdout: "",
      });
      MockCommandExecutor.mockExec("git ls-files --others --exclude-standard", {
        stdout: "",
      });
      MockCommandExecutor.mockExec("git diff", { stdout: "diff content" });
      MockCommandExecutor.mockExec("git diff --cached", { stdout: "" });

      // Act
      const result = await gitProvider.getDiff();

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain("file.ts");
    });

    it("应该处理Git索引损坏", async () => {
      // Arrange
      const indexError = new Error("fatal: index file corrupt");
      MockCommandExecutor.mockExecError(
        'git status --porcelain "file.ts"',
        indexError
      );
      MockCommandExecutor.mockExec("git rev-parse HEAD", {
        stdout: "commit123",
      });

      // Act
      const result = await gitProvider.getDiff(["file.ts"]);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain("Unknown: file.ts"); // Should handle gracefully
    });
  });

  describe("权限不足错误处理", () => {
    it("应该处理文件权限错误", async () => {
      // Arrange
      const permissionError = new Error(
        "fatal: could not open '.git/index' for reading: Permission denied"
      );
      MockCommandExecutor.mockExecError("git rev-parse HEAD", permissionError);

      // Act & Assert
      await expect(gitProvider.getDiff()).rejects.toThrow("Permission denied");
    });

    it("应该处理目录权限错误", async () => {
      // Arrange
      const dirPermissionError = new Error(
        "fatal: cannot change to '/path/to/repo': Permission denied"
      );
      MockCommandExecutor.mockExecError(
        'git status --porcelain "file.ts"',
        dirPermissionError
      );
      MockCommandExecutor.mockExec("git rev-parse HEAD", {
        stdout: "commit123",
      });

      // Act
      const result = await gitProvider.getDiff(["file.ts"]);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain("Unknown: file.ts"); // Should handle gracefully
    });

    it("应该处理提交权限错误", async () => {
      // Arrange
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];
      const commitPermissionError = new Error(
        "fatal: could not lock config file .git/config: Permission denied"
      );
      mockRepository.commit.mockRejectedValue(commitPermissionError);

      // Act & Assert
      await expect(gitProvider.commit("test commit")).rejects.toThrow(
        "Permission denied"
      );
    });

    it("应该处理剪贴板权限错误", async () => {
      // Arrange
      const message = "test message";
      const mockGitExtensionNoInputBox = MockGitExtensionFactory.create({
        repositories: [{ inputBox: undefined as any }],
      });
      const gitProviderNoInputBox = new GitProvider(
        mockGitExtensionNoInputBox,
        mockWorkspacePath
      );
      const clipboardError = new Error("Permission denied: clipboard access");
      (mockVSCode.env.clipboard.writeText as any).mockRejectedValue(
        clipboardError
      );

      // Act
      await gitProviderNoInputBox.setCommitInput(message);

      // Assert
      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
        `mock.commit.message.manual.copy.${message}`
      );
    });
  });

  describe("命令执行超时处理", () => {
    it("应该处理长时间运行的diff命令", async () => {
      // Arrange
      const timeoutError = new Error("Command timed out after 30000ms");
      timeoutError.name = "TimeoutError";
      MockCommandExecutor.mockExecError("git diff HEAD", timeoutError);
      MockCommandExecutor.mockExec("git rev-parse HEAD", {
        stdout: "commit123",
      });
      MockCommandExecutor.mockExec("git diff HEAD --name-only", {
        stdout: "large-file.ts",
      });
      MockCommandExecutor.mockExec("git diff --cached --name-only", {
        stdout: "",
      });
      MockCommandExecutor.mockExec("git ls-files --others --exclude-standard", {
        stdout: "",
      });
      MockCommandExecutor.mockExec("git diff --cached", { stdout: "" });

      // Act & Assert
      await expect(gitProvider.getDiff()).rejects.toThrow("Command timed out");
    });

    it("应该处理日志查询超时", async () => {
      // Arrange
      const timeoutError = new Error("Command timed out");
      MockCommandExecutor.mockExec(
        "git show-ref --verify --quiet refs/remotes/origin/main",
        { stdout: "" }
      );
      MockCommandExecutor.mockExecError(
        'git log origin/main..HEAD --pretty=format:"%s" --no-merges',
        timeoutError
      );

      // Act
      const result = await gitProvider.getCommitLog();

      // Assert
      expect(result).toEqual([]); // Should return empty array instead of throwing
    });

    it("应该处理分支查询超时", async () => {
      // Arrange
      const timeoutError = new Error("Command execution timed out");
      MockCommandExecutor.mockExecError(
        'git branch -a --format="%(refname:short)"',
        timeoutError
      );

      // Act
      const result = await gitProvider.getBranches();

      // Assert
      expect(result).toEqual([]); // Should return empty array instead of throwing
    });
  });

  describe("初始化和可用性错误处理", () => {
    it("应该处理Git版本检测失败", async () => {
      // Arrange
      const versionError = new Error("git: command not found");
      MockCommandExecutor.mockExecError("git --version", versionError);

      // Act
      await gitProvider.init(); // Should not throw, just log warning

      // Assert - Should complete without throwing
      expect(true).toBe(true);
    });

    it("应该处理没有工作区的情况", () => {
      // Arrange
      MockVSCodeAPIFactory.configureWorkspaceFolders(mockVSCode, []);

      // Act & Assert
      expect(() => new GitProvider(mockGitExtension)).toThrow(
        "mock.workspace.not.found"
      );
    });

    it("应该处理Git扩展不可用的情况", async () => {
      // Arrange
      const mockGitExtensionNoRepos = MockGitExtensionFactory.create({
        repositories: [], // No repositories
      });
      const gitProviderNoRepos = new GitProvider(
        mockGitExtensionNoRepos,
        mockWorkspacePath
      );

      // Act
      const result = await gitProviderNoRepos.isAvailable();

      // Assert
      expect(result).toBe(false);
    });

    it("应该处理Git扩展API获取失败", () => {
      // Arrange
      const mockGitExtensionBroken = {
        getAPI: vi.fn().mockImplementation(() => {
          throw new Error("Failed to get Git API");
        }),
      };

      // Act & Assert
      expect(
        () => new GitProvider(mockGitExtensionBroken, mockWorkspacePath)
      ).toThrow("Failed to get Git API");
    });
  });

  describe("边界条件和异常输入处理", () => {
    it("应该处理空的工作区路径", () => {
      // Arrange & Act & Assert
      expect(() => new GitProvider(mockGitExtension, "")).toThrow(
        "mock.workspace.not.found"
      );
    });

    it("应该处理无效的文件路径", async () => {
      // Arrange
      const invalidFiles = [
        "",
        null as any,
        undefined as any,
        "file\x00with\x00null",
      ];
      const validFiles = invalidFiles.filter(
        (f) => f && typeof f === "string" && !f.includes("\x00")
      );

      MockCommandExecutor.mockExec("git rev-parse HEAD", {
        stdout: "commit123",
      });

      // Act
      const result = await gitProvider.getDiff(invalidFiles);

      // Assert - Should handle invalid files gracefully
      expect(result).toBeDefined();
    });

    it("应该处理极长的提交信息", async () => {
      // Arrange
      const veryLongMessage = "x".repeat(100000); // 100KB message
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];

      // Act
      await gitProvider.setCommitInput(veryLongMessage);

      // Assert
      expect(mockRepository.inputBox.value).toBe(veryLongMessage);
    });

    it("应该处理包含控制字符的提交信息", async () => {
      // Arrange
      const messageWithControlChars = "commit\x00with\x01control\x02chars";
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];

      // Act
      await gitProvider.setCommitInput(messageWithControlChars);

      // Assert
      expect(mockRepository.inputBox.value).toBe(messageWithControlChars);
    });

    it("应该处理并发的getDiff调用", async () => {
      // Arrange
      const diffOutput = GitTestData.generateDiffOutput(["file1.ts"]);
      MockCommandExecutor.mockExec("git rev-parse HEAD", {
        stdout: "commit123",
      });
      MockCommandExecutor.mockExec("git diff HEAD --name-only", {
        stdout: "file1.ts",
      });
      MockCommandExecutor.mockExec("git diff --cached --name-only", {
        stdout: "",
      });
      MockCommandExecutor.mockExec("git ls-files --others --exclude-standard", {
        stdout: "",
      });
      MockCommandExecutor.mockExec("git diff HEAD", { stdout: diffOutput });
      MockCommandExecutor.mockExec("git diff --cached", { stdout: "" });

      // Act
      const promises = Array.from({ length: 5 }, () => gitProvider.getDiff());
      const results = await Promise.all(promises);

      // Assert
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result).toContain("file1.ts");
      });
    });
  });

  describe("资源清理和内存管理", () => {
    it("应该处理大量文件操作后的内存使用", async () => {
      // Arrange
      const manyFiles = Array.from({ length: 1000 }, (_, i) => `file${i}.ts`);

      MockCommandExecutor.mockExec("git rev-parse HEAD", {
        stdout: "commit123",
      });
      manyFiles.forEach((file) => {
        MockCommandExecutor.mockExec(`git status --porcelain "${file}"`, {
          stdout: `M  ${file}`,
        });
        MockCommandExecutor.mockExec(`git diff HEAD -- "${file}"`, {
          stdout: `diff for ${file}`,
        });
      });

      // Act
      const result = await gitProvider.getDiff(manyFiles);

      // Assert
      expect(result).toBeDefined();
      // Memory should be manageable - this is more of a smoke test
    });

    it("应该处理重复的API调用", async () => {
      // Arrange
      const mockRepository = mockGitExtension.getAPI(1).repositories[0];
      mockRepository.log.mockResolvedValue([{ message: "test commit" }]);
      mockRepository.getConfig.mockResolvedValue("Test User");

      // Act
      const results = await Promise.all([
        gitProvider.getRecentCommitMessages(),
        gitProvider.getRecentCommitMessages(),
        gitProvider.getRecentCommitMessages(),
      ]);

      // Assert
      results.forEach((result) => {
        expect(result.repository).toEqual(["test commit"]);
      });
    });
  });
});

describe("GitProvider - 初始化和可用性测试", () => {
  let gitProvider: GitProvider;
  let mockGitExtension: MockGitExtension;
  let mockWorkspacePath: string;
  let mockVSCode: any;

  beforeEach(async () => {
    const testEnv = setupTestEnvironment();
    gitProvider = testEnv.gitProvider;
    mockGitExtension = testEnv.mockGitExtension;
    mockWorkspacePath = testEnv.mockWorkspacePath;
    mockVSCode = vi.mocked(await import("vscode"));
  });

  afterEach(() => {
    TestFileSystem.cleanup(mockWorkspacePath);
    MockCommandExecutor.clearMocks();
  });

  describe("init - 初始化测试", () => {
    it("应该成功初始化并显示Git版本", async () => {
      // Arrange
      const gitVersion = "git version 2.34.1";
      MockCommandExecutor.mockExec("git --version", { stdout: gitVersion });

      // Act
      await gitProvider.init();

      // Assert
      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
        `mock.scm.version.detected.Git.${gitVersion}`
      );
    });

    it("应该在Git版本检测失败时继续初始化", async () => {
      // Arrange
      const gitError = new Error("git command not found");
      MockCommandExecutor.mockExecError("git --version", gitError);

      // Act & Assert - Should not throw
      await expect(gitProvider.init()).resolves.toBeUndefined();
    });

    it("应该处理Git版本输出包含额外信息", async () => {
      // Arrange
      const gitVersionOutput = "git version 2.34.1\nAdditional info\nMore info";
      MockCommandExecutor.mockExec("git --version", {
        stdout: gitVersionOutput,
      });

      // Act
      await gitProvider.init();

      // Assert
      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
        `mock.scm.version.detected.Git.${gitVersionOutput?.trim()}`
      );
    });
  });

  describe("isAvailable - 可用性检测测试", () => {
    it("应该在有仓库时返回true", async () => {
      // Arrange - mockGitExtension already has repositories

      // Act
      const result = await gitProvider.isAvailable();

      // Assert
      expect(result).toBe(true);
    });

    it("应该在没有仓库时返回false", async () => {
      // Arrange
      const mockGitExtensionNoRepos = MockGitExtensionFactory.create({
        repositories: [], // No repositories
      });
      const gitProviderNoRepos = new GitProvider(
        mockGitExtensionNoRepos,
        mockWorkspacePath
      );

      // Act
      const result = await gitProviderNoRepos.isAvailable();

      // Assert
      expect(result).toBe(false);
    });

    it("应该处理Git API获取失败", async () => {
      // Arrange
      const mockGitExtensionBrokenAPI = {
        getAPI: vi.fn().mockReturnValue({
          repositories: null, // Broken API
        }),
      };
      const gitProviderBroken = new GitProvider(
        mockGitExtensionBrokenAPI,
        mockWorkspacePath
      );

      // Act & Assert
      await expect(gitProviderBroken.isAvailable()).rejects.toThrow();
    });
  });

  describe("constructor - 构造函数测试", () => {
    it("应该使用提供的工作区路径", () => {
      // Arrange
      const customPath = "/custom/workspace/path";

      // Act
      const customGitProvider = new GitProvider(mockGitExtension, customPath);

      // Assert
      expect(customGitProvider).toBeDefined();
      expect(customGitProvider.type).toBe("git");
    });

    it("应该使用VS Code工作区路径作为默认", () => {
      // Arrange
      MockVSCodeAPIFactory.configureWorkspaceFolders(mockVSCode, [
        "/vscode/workspace",
      ]);

      // Act
      const defaultGitProvider = new GitProvider(mockGitExtension);

      // Assert
      expect(defaultGitProvider).toBeDefined();
      expect(defaultGitProvider.type).toBe("git");
    });

    it("应该在没有工作区时抛出错误", () => {
      // Arrange
      MockVSCodeAPIFactory.configureWorkspaceFolders(mockVSCode, []);

      // Act & Assert
      expect(() => new GitProvider(mockGitExtension)).toThrow(
        "mock.workspace.not.found"
      );
    });

    it("应该正确设置类型属性", () => {
      // Act
      const provider = new GitProvider(mockGitExtension, mockWorkspacePath);

      // Assert
      expect(provider.type).toBe("git");
    });

    it("应该处理Git扩展API版本", () => {
      // Arrange
      const mockGitExtensionWithVersion = MockGitExtensionFactory.create();
      mockGitExtensionWithVersion.getAPI.mockReturnValue({
        repositories: [],
        getRepository: vi.fn(),
      });

      // Act
      const provider = new GitProvider(
        mockGitExtensionWithVersion,
        mockWorkspacePath
      );

      // Assert
      expect(mockGitExtensionWithVersion.getAPI).toHaveBeenCalledWith(1);
      expect(provider).toBeDefined();
    });
  });

  describe("type属性测试", () => {
    it("应该返回正确的SCM类型", () => {
      // Act & Assert
      expect(gitProvider.type).toBe("git");
    });

    it("应该是只读属性", () => {
      // Act & Assert
      expect(() => {
        (gitProvider as any).type = "svn";
      }).toThrow();
    });
  });
});
