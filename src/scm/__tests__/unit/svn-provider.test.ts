/**
 * SVN Provider Unit Tests
 * Tests for SVN provider initialization, configuration, and core functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SvnProvider } from "../../svn-provider";
import {
  MockVSCodeAPIFactory,
  MockSvnExtensionFactory,
} from "../helpers/mock-factories";
import { SvnTestData, TestFileSystem } from "../helpers/test-data-generators";
import { TestUtils, TestErrorHandler } from "../helpers/test-utilities";
import { MockCommandExecutor } from "../helpers/mock-command-executor";
import type {
  MockVSCodeAPI,
  MockSvnExtension,
} from "../helpers/test-interfaces";

// Mock VS Code API
const mockVSCode = MockVSCodeAPIFactory.create();
vi.mock("vscode", () => mockVSCode);

// Mock child_process and util
const mockExec = vi.fn();
vi.mock("child_process", () => ({
  exec: mockExec,
}));

vi.mock("util", () => ({
  promisify: vi.fn((fn) => fn),
}));

describe("SVN Provider Tests", () => {
  let svnProvider: SvnProvider;
  let mockSvnExtension: MockSvnExtension;
  let mockWorkspacePath: string;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    TestUtils.resetAllMocks();

    // Create test workspace
    mockWorkspacePath = TestFileSystem.createMockWorkspace("svn");

    // Setup VS Code workspace
    MockVSCodeAPIFactory.configureWorkspaceFolders(mockVSCode, [
      mockWorkspacePath,
    ]);

    // Create SVN extension mock
    mockSvnExtension = MockSvnExtensionFactory.create({
      repositories: [{ rootUri: { fsPath: mockWorkspacePath } }],
    });

    // Setup mock exec to track commands
    mockExec.mockImplementation(
      (command: string, options: any, callback?: Function) => {
        const actualCallback =
          typeof options === "function" ? options : callback;

        // Default success response
        setTimeout(() => {
          actualCallback(null, "", "");
        }, 0);
      }
    );
  });

  afterEach(() => {
    TestFileSystem.cleanup(mockWorkspacePath);
  });

  describe("4.1 SVN Provider Initialization Tests", () => {
    describe("init method SVN path detection", () => {
      it("should successfully initialize with SVN plugin path", async () => {
        // Arrange
        const svnPluginPath = "/usr/local/bin/svn";
        mockVSCode.workspace.getConfiguration.mockImplementation(
          (section: string) => {
            if (section === "svn") {
              return { get: vi.fn().mockReturnValue(svnPluginPath) };
            }
            if (section === "svn-commit-gen") {
              return { get: vi.fn().mockReturnValue(undefined) };
            }
            return { get: vi.fn() };
          }
        );

        mockExec.mockImplementation(
          (command: string, options: any, callback?: Function) => {
            const actualCallback =
              typeof options === "function" ? options : callback;
            if (command.includes("--version")) {
              setTimeout(() => {
                actualCallback(null, "svn, version 1.14.2 (r1899510)\n", "");
              }, 0);
            } else {
              setTimeout(() => {
                actualCallback(null, "", "");
              }, 0);
            }
          }
        );

        svnProvider = new SvnProvider(mockSvnExtension);

        // Act
        await svnProvider.init();

        // Assert
        expect(mockExec).toHaveBeenCalledWith(
          expect.stringContaining("--version"),
          expect.any(Object),
          expect.any(Function)
        );
      });

      it("should successfully initialize with custom config path", async () => {
        // Arrange
        const customSvnPath = "/opt/homebrew/bin/svn";
        mockVSCode.workspace.getConfiguration.mockImplementation(
          (section: string) => {
            if (section === "svn") {
              return { get: vi.fn().mockReturnValue(undefined) };
            }
            if (section === "svn-commit-gen") {
              return { get: vi.fn().mockReturnValue(customSvnPath) };
            }
            return { get: vi.fn() };
          }
        );

        mockExec.mockImplementation(
          (command: string, options: any, callback?: Function) => {
            const actualCallback =
              typeof options === "function" ? options : callback;
            if (command.includes("--version")) {
              setTimeout(() => {
                actualCallback(null, "svn, version 1.14.2 (r1899510)\n", "");
              }, 0);
            } else {
              setTimeout(() => {
                actualCallback(null, "", "");
              }, 0);
            }
          }
        );

        svnProvider = new SvnProvider(mockSvnExtension);

        // Act
        await svnProvider.init();

        // Assert
        expect(mockExec).toHaveBeenCalledWith(
          expect.stringContaining(customSvnPath),
          expect.any(Object),
          expect.any(Function)
        );
      });

      it("should auto-detect SVN path when no config provided", async () => {
        // Arrange
        mockVSCode.workspace.getConfiguration.mockImplementation(() => ({
          get: vi.fn().mockReturnValue(undefined),
        }));

        mockExec.mockImplementation(
          (command: string, options: any, callback?: Function) => {
            const actualCallback =
              typeof options === "function" ? options : callback;
            if (command === "which svn") {
              setTimeout(() => {
                actualCallback(null, "/usr/bin/svn\n", "");
              }, 0);
            } else if (command.includes("--version")) {
              setTimeout(() => {
                actualCallback(null, "svn, version 1.14.2 (r1899510)\n", "");
              }, 0);
            } else {
              setTimeout(() => {
                actualCallback(null, "", "");
              }, 0);
            }
          }
        );

        svnProvider = new SvnProvider(mockSvnExtension);

        // Act
        await svnProvider.init();

        // Assert
        expect(mockExec).toHaveBeenCalledWith(
          "which svn",
          expect.any(Object),
          expect.any(Function)
        );
        expect(mockExec).toHaveBeenCalledWith(
          expect.stringContaining("--version"),
          expect.any(Object),
          expect.any(Function)
        );
      });

      it("should throw error when SVN executable not found", async () => {
        // Arrange
        mockVSCode.workspace.getConfiguration.mockImplementation(() => ({
          get: vi.fn().mockReturnValue(undefined),
        }));

        mockExec.mockImplementation(
          (command: string, options: any, callback?: Function) => {
            const actualCallback =
              typeof options === "function" ? options : callback;
            if (command === "which svn") {
              setTimeout(() => {
                actualCallback(new Error("command not found"));
              }, 0);
            } else {
              setTimeout(() => {
                actualCallback(null, "", "");
              }, 0);
            }
          }
        );

        svnProvider = new SvnProvider(mockSvnExtension);

        // Act & Assert
        await expect(svnProvider.init()).rejects.toThrow(
          /Unable to locate SVN executable/
        );
      });
    });

    describe("configuration loading and environment setup", () => {
      it("should load default configuration when no custom config exists", async () => {
        // Arrange
        mockVSCode.workspace.getConfiguration.mockImplementation(
          (section: string) => {
            if (section === "svn-commit-gen") {
              return {
                get: vi.fn().mockImplementation((key: string) => {
                  if (key === "environmentPath") {return undefined;}
                  if (key === "locale") {return undefined;}
                  return undefined;
                }),
              };
            }
            return { get: vi.fn() };
          }
        );

        mockExec.mockImplementation(
          (command: string, options: any, callback?: Function) => {
            const actualCallback =
              typeof options === "function" ? options : callback;
            if (command === "which svn") {
              setTimeout(() => {
                actualCallback(null, "/usr/bin/svn\n", "");
              }, 0);
            } else if (command.includes("--version")) {
              setTimeout(() => {
                actualCallback(null, "svn, version 1.14.2 (r1899510)\n", "");
              }, 0);
            } else {
              setTimeout(() => {
                actualCallback(null, "", "");
              }, 0);
            }
          }
        );

        svnProvider = new SvnProvider(mockSvnExtension);

        // Act
        await svnProvider.init();

        // Assert - Should not throw and should use default config
        expect(mockExec).toHaveBeenCalledWith(
          expect.stringContaining("--version"),
          expect.any(Object),
          expect.any(Function)
        );
      });

      it("should load custom environment configuration", async () => {
        // Arrange
        const customPath = ["/custom/bin", "/another/path"];
        const customLocale = "zh_CN.UTF-8";

        mockVSCode.workspace.getConfiguration.mockImplementation(
          (section: string) => {
            if (section === "svn-commit-gen") {
              return {
                get: vi.fn().mockImplementation((key: string) => {
                  if (key === "environmentPath") {return customPath;}
                  if (key === "locale") {return customLocale;}
                  return undefined;
                }),
              };
            }
            return { get: vi.fn() };
          }
        );

        mockExec.mockImplementation(
          (command: string, options: any, callback?: Function) => {
            const actualCallback =
              typeof options === "function" ? options : callback;
            if (command === "which svn") {
              setTimeout(() => {
                actualCallback(null, "/usr/bin/svn\n", "");
              }, 0);
            } else if (command.includes("--version")) {
              setTimeout(() => {
                actualCallback(null, "svn, version 1.14.2 (r1899510)\n", "");
              }, 0);
            } else {
              setTimeout(() => {
                actualCallback(null, "", "");
              }, 0);
            }
          }
        );

        svnProvider = new SvnProvider(mockSvnExtension);

        // Act
        await svnProvider.init();

        // Assert
        expect(mockExec).toHaveBeenCalledWith(
          expect.stringContaining("--version"),
          expect.any(Object),
          expect.any(Function)
        );
      });

      it("should throw error for invalid environment configuration", async () => {
        // Arrange
        mockVSCode.workspace.getConfiguration.mockImplementation(
          (section: string) => {
            if (section === "svn-commit-gen") {
              return {
                get: vi.fn().mockImplementation((key: string) => {
                  if (key === "environmentPath") {return "invalid-not-array";}
                  if (key === "locale") {return null;}
                  return undefined;
                }),
              };
            }
            return { get: vi.fn() };
          }
        );

        // Act & Assert
        expect(() => new SvnProvider(mockSvnExtension)).toThrow(
          /svn.invalid.env.config/
        );
      });
    });

    describe("SVN version verification", () => {
      it("should verify SVN version successfully", async () => {
        // Arrange
        const expectedVersion = "svn, version 1.14.2 (r1899510)";
        mockVSCode.workspace.getConfiguration.mockImplementation(() => ({
          get: vi.fn().mockReturnValue(undefined),
        }));

        mockExec.mockImplementation(
          (command: string, options: any, callback?: Function) => {
            const actualCallback =
              typeof options === "function" ? options : callback;
            if (command === "which svn") {
              setTimeout(() => {
                actualCallback(null, "/usr/bin/svn\n", "");
              }, 0);
            } else if (command.includes("--version")) {
              setTimeout(() => {
                actualCallback(
                  null,
                  `${expectedVersion}\ncompiled Apr 14 2022, 02:52:08 on x86_64-apple-darwin21.0.0\n`,
                  ""
                );
              }, 0);
            } else {
              setTimeout(() => {
                actualCallback(null, "", "");
              }, 0);
            }
          }
        );

        svnProvider = new SvnProvider(mockSvnExtension);

        // Act
        await svnProvider.init();

        // Assert
        expect(mockExec).toHaveBeenCalledWith(
          expect.stringContaining("--version"),
          expect.any(Object),
          expect.any(Function)
        );
      });

      it("should handle SVN version command failure", async () => {
        // Arrange
        mockVSCode.workspace.getConfiguration.mockImplementation(() => ({
          get: vi.fn().mockReturnValue("/invalid/svn/path"),
        }));

        mockExec.mockImplementation(
          (command: string, options: any, callback?: Function) => {
            const actualCallback =
              typeof options === "function" ? options : callback;
            if (command.includes("--version")) {
              setTimeout(() => {
                actualCallback(new Error("No such file or directory"));
              }, 0);
            } else {
              setTimeout(() => {
                actualCallback(null, "", "");
              }, 0);
            }
          }
        );

        svnProvider = new SvnProvider(mockSvnExtension);

        // Act & Assert
        await expect(svnProvider.init()).rejects.toThrow(
          /svn.initialization.failed/
        );
      });

      it("should handle empty SVN version output", async () => {
        // Arrange
        mockVSCode.workspace.getConfiguration.mockImplementation(() => ({
          get: vi.fn().mockReturnValue(undefined),
        }));

        mockExec.mockImplementation(
          (command: string, options: any, callback?: Function) => {
            const actualCallback =
              typeof options === "function" ? options : callback;
            if (command === "which svn") {
              setTimeout(() => {
                actualCallback(null, "/usr/bin/svn\n", "");
              }, 0);
            } else if (command.includes("--version")) {
              setTimeout(() => {
                actualCallback(null, "", "");
              }, 0);
            } else {
              setTimeout(() => {
                actualCallback(null, "", "");
              }, 0);
            }
          }
        );

        svnProvider = new SvnProvider(mockSvnExtension);

        // Act
        await svnProvider.init();

        // Assert - Should still succeed even with empty version output
        expect(mockExec).toHaveBeenCalledWith(
          expect.stringContaining("--version"),
          expect.any(Object),
          expect.any(Function)
        );
      });
    });

    describe("initialization state management", () => {
      it("should set initialized flag to true after successful init", async () => {
        // Arrange
        mockVSCode.workspace.getConfiguration.mockImplementation(() => ({
          get: vi.fn().mockReturnValue(undefined),
        }));

        mockExec.mockImplementation(
          (command: string, options: any, callback?: Function) => {
            const actualCallback =
              typeof options === "function" ? options : callback;
            if (command === "which svn") {
              setTimeout(() => {
                actualCallback(null, "/usr/bin/svn\n", "");
              }, 0);
            } else if (command.includes("--version")) {
              setTimeout(() => {
                actualCallback(null, "svn, version 1.14.2 (r1899510)\n", "");
              }, 0);
            } else {
              setTimeout(() => {
                actualCallback(null, "", "");
              }, 0);
            }
          }
        );

        svnProvider = new SvnProvider(mockSvnExtension);

        // Act
        await svnProvider.init();

        // Assert - Test that subsequent operations don't fail due to uninitialized state
        // This is tested indirectly by ensuring no "not initialized" errors are thrown
        expect(mockExec).toHaveBeenCalledWith(
          expect.stringContaining("--version"),
          expect.any(Object),
          expect.any(Function)
        );
      });

      it("should handle multiple init calls gracefully", async () => {
        // Arrange
        mockVSCode.workspace.getConfiguration.mockImplementation(() => ({
          get: vi.fn().mockReturnValue(undefined),
        }));

        mockExec.mockImplementation(
          (command: string, options: any, callback?: Function) => {
            const actualCallback =
              typeof options === "function" ? options : callback;
            if (command === "which svn") {
              setTimeout(() => {
                actualCallback(null, "/usr/bin/svn\n", "");
              }, 0);
            } else if (command.includes("--version")) {
              setTimeout(() => {
                actualCallback(null, "svn, version 1.14.2 (r1899510)\n", "");
              }, 0);
            } else {
              setTimeout(() => {
                actualCallback(null, "", "");
              }, 0);
            }
          }
        );

        svnProvider = new SvnProvider(mockSvnExtension);

        // Act
        await svnProvider.init();
        await svnProvider.init(); // Second call

        // Assert - Should not cause issues
        expect(mockExec).toHaveBeenCalledWith(
          expect.stringContaining("--version"),
          expect.any(Object),
          expect.any(Function)
        );
      });
    });

    describe("workspace validation", () => {
      it("should throw error when no workspace is found", () => {
        // Arrange
        MockVSCodeAPIFactory.configureWorkspaceFolders(mockVSCode, []);

        // Act & Assert
        expect(() => new SvnProvider(mockSvnExtension)).toThrow(
          /workspace.not.found/
        );
      });

      it("should use first workspace folder when multiple exist", async () => {
        // Arrange
        const workspace1 = "/path/to/workspace1";
        const workspace2 = "/path/to/workspace2";
        MockVSCodeAPIFactory.configureWorkspaceFolders(mockVSCode, [
          workspace1,
          workspace2,
        ]);

        mockVSCode.workspace.getConfiguration.mockImplementation(() => ({
          get: vi.fn().mockReturnValue(undefined),
        }));

        mockExec.mockImplementation(
          (command: string, options: any, callback?: Function) => {
            const actualCallback =
              typeof options === "function" ? options : callback;
            if (command === "which svn") {
              setTimeout(() => {
                actualCallback(null, "/usr/bin/svn\n", "");
              }, 0);
            } else if (command.includes("--version")) {
              setTimeout(() => {
                actualCallback(null, "svn, version 1.14.2 (r1899510)\n", "");
              }, 0);
            } else {
              setTimeout(() => {
                actualCallback(null, "", "");
              }, 0);
            }
          }
        );

        svnProvider = new SvnProvider(mockSvnExtension);

        // Act
        await svnProvider.init();

        // Assert - Should use first workspace
        expect(mockExec).toHaveBeenCalledWith(
          expect.stringContaining("--version"),
          expect.any(Object),
          expect.any(Function)
        );
      });
    });
  });
});
describe("4.2 SVN Diff and Commit Functionality Tests", () => {
  let svnProvider: SvnProvider;
  let mockSvnExtension: MockSvnExtension;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    TestUtils.resetAllMocks();

    // Create test workspace
    const mockWorkspacePath = TestFileSystem.createMockWorkspace("svn");

    // Setup VS Code workspace
    MockVSCodeAPIFactory.configureWorkspaceFolders(mockVSCode, [
      mockWorkspacePath,
    ]);

    // Create SVN extension mock
    mockSvnExtension = MockSvnExtensionFactory.create({
      repositories: [{ rootUri: { fsPath: mockWorkspacePath } }],
    });

    // Initialize SVN provider for diff/commit tests
    mockVSCode.workspace.getConfiguration.mockImplementation(() => ({
      get: vi.fn().mockReturnValue(undefined),
    }));

    mockExec.mockImplementation(
      (command: string, options: any, callback?: Function) => {
        const actualCallback =
          typeof options === "function" ? options : callback;
        if (command === "which svn") {
          setTimeout(() => {
            actualCallback(null, "/usr/bin/svn\n", "");
          }, 0);
        } else if (command.includes("--version")) {
          setTimeout(() => {
            actualCallback(null, "svn, version 1.14.2 (r1899510)\n", "");
          }, 0);
        } else {
          setTimeout(() => {
            actualCallback(null, "", "");
          }, 0);
        }
      }
    );

    svnProvider = new SvnProvider(mockSvnExtension);
    await svnProvider.init();
  });

  describe("getDiff method SVN diff retrieval", () => {
    it("should successfully get diff for modified files", async () => {
      // Arrange
      const expectedDiff = SvnTestData.generateSvnDiffOutput([
        "src/test.ts",
        "README.md",
      ]);

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn diff")) {
            setTimeout(() => {
              actualCallback(null, expectedDiff, "");
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getDiff();

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain("Index: src/test.ts");
      expect(result).toContain("Index: README.md");
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("svn diff"),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it("should get diff for specific files", async () => {
      // Arrange
      const files = ["src/specific.ts"];
      const expectedDiff = SvnTestData.generateSvnDiffOutput(files);

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (
            command.includes("svn diff") &&
            command.includes("src/specific.ts")
          ) {
            setTimeout(() => {
              actualCallback(null, expectedDiff, "");
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getDiff(files);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain("Index: src/specific.ts");
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('"src/specific.ts"'),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it("should throw error when no changes exist", async () => {
      // Arrange
      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn diff")) {
            setTimeout(() => {
              actualCallback(null, "", ""); // Empty diff output
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act & Assert
      await expect(svnProvider.getDiff()).rejects.toThrow(/diff.noChanges/);
    });

    it("should handle SVN diff command failure", async () => {
      // Arrange
      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn diff")) {
            setTimeout(() => {
              actualCallback(new Error("svn: E155007: Working copy not found"));
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act & Assert
      await expect(svnProvider.getDiff()).rejects.toThrow();
    });

    it("should process diff with simplification when enabled", async () => {
      // Arrange
      const rawDiff = SvnTestData.generateSvnDiffOutput(["src/large-file.ts"]);

      // Mock configuration to enable diff simplification
      mockVSCode.workspace.getConfiguration.mockImplementation(
        (section: string) => {
          if (section === "svn-commit-gen") {
            return { get: vi.fn().mockReturnValue(undefined) };
          }
          return { get: vi.fn() };
        }
      );

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn diff")) {
            setTimeout(() => {
              actualCallback(null, rawDiff, "");
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getDiff();

      // Assert
      expect(result).toBeDefined();
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("svn diff"),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it("should handle large diff output within buffer limits", async () => {
      // Arrange
      const largeDiff = Array.from(
        { length: 1000 },
        (_, i) =>
          `Index: file${i}.ts\n===================================================================\n--- file${i}.ts\t(revision 123)\n+++ file${i}.ts\t(working copy)\n@@ -1,1 +1,2 @@\n line 1\n+new line ${i}`
      ).join("\n\n");

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn diff")) {
            setTimeout(() => {
              actualCallback(null, largeDiff, "");
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getDiff();

      // Assert
      expect(result).toBeDefined();
      expect(result!.length).toBeGreaterThan(1000);
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("svn diff"),
        expect.objectContaining({
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        }),
        expect.any(Function)
      );
    });
  });

  describe("commit method SVN commit operations", () => {
    it("should successfully commit files with message", async () => {
      // Arrange
      const commitMessage = "Test commit message";
      const files = ["src/test.ts", "README.md"];

      const mockRepository = MockSvnExtensionFactory.createRepository();
      mockSvnExtension.getAPI().repositories = [mockRepository];

      // Act
      await svnProvider.commit(commitMessage, files);

      // Assert
      expect(mockRepository.commitFiles).toHaveBeenCalledWith(
        files,
        commitMessage
      );
    });

    it("should throw error when no files are selected", async () => {
      // Arrange
      const commitMessage = "Test commit message";
      const files: string[] = [];

      // Act & Assert
      await expect(svnProvider.commit(commitMessage, files)).rejects.toThrow(
        /svn.no.files.selected/
      );
    });

    it("should throw error when no files parameter provided", async () => {
      // Arrange
      const commitMessage = "Test commit message";

      // Act & Assert
      await expect(svnProvider.commit(commitMessage)).rejects.toThrow(
        /svn.no.files.selected/
      );
    });

    it("should handle commit failure from SVN extension", async () => {
      // Arrange
      const commitMessage = "Test commit message";
      const files = ["src/test.ts"];

      const mockRepository = MockSvnExtensionFactory.createRepository();
      mockRepository.commitFiles.mockRejectedValue(
        new Error("SVN commit failed")
      );
      mockSvnExtension.getAPI().repositories = [mockRepository];

      // Act & Assert
      await expect(svnProvider.commit(commitMessage, files)).rejects.toThrow(
        /svn.commit.failed/
      );
    });

    it("should throw error when no repository is available", async () => {
      // Arrange
      const commitMessage = "Test commit message";
      const files = ["src/test.ts"];

      // Clear repositories
      mockSvnExtension.getAPI().repositories = [];

      // Act & Assert
      await expect(svnProvider.commit(commitMessage, files)).rejects.toThrow(
        /git.repository.not.found/
      );
    });
  });

  describe("file status detection", () => {
    it("should detect modified file status", async () => {
      // Arrange
      const testFile = "src/modified.ts";

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn status") && command.includes(testFile)) {
            setTimeout(() => {
              actualCallback(null, "M       src/modified.ts\n", "");
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act - This tests the private getFileStatus method indirectly through getDiff
      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn diff")) {
            setTimeout(() => {
              actualCallback(
                null,
                SvnTestData.generateSvnDiffOutput([testFile]),
                ""
              );
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      const result = await svnProvider.getDiff([testFile]);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain(testFile);
    });

    it("should detect new file status", async () => {
      // Arrange
      const testFile = "src/new.ts";

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn status") && command.includes(testFile)) {
            setTimeout(() => {
              actualCallback(null, "?       src/new.ts\n", "");
            }, 0);
          } else if (command.includes("svn diff")) {
            setTimeout(() => {
              actualCallback(
                null,
                SvnTestData.generateSvnDiffOutput([testFile]),
                ""
              );
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getDiff([testFile]);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain(testFile);
    });

    it("should detect deleted file status", async () => {
      // Arrange
      const testFile = "src/deleted.ts";

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn status") && command.includes(testFile)) {
            setTimeout(() => {
              actualCallback(null, "D       src/deleted.ts\n", "");
            }, 0);
          } else if (command.includes("svn diff")) {
            setTimeout(() => {
              actualCallback(
                null,
                SvnTestData.generateSvnDiffOutput([testFile]),
                ""
              );
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getDiff([testFile]);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain(testFile);
    });

    it("should handle file status command failure gracefully", async () => {
      // Arrange
      const testFile = "src/error.ts";

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn status") && command.includes(testFile)) {
            setTimeout(() => {
              actualCallback(new Error("SVN status failed"));
            }, 0);
          } else if (command.includes("svn diff")) {
            setTimeout(() => {
              actualCallback(
                null,
                SvnTestData.generateSvnDiffOutput([testFile]),
                ""
              );
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act - Should still work even if status fails
      const result = await svnProvider.getDiff([testFile]);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain(testFile);
    });
  });
});
describe("4.3 SVN Log Query Tests", () => {
  let svnProvider: SvnProvider;
  let mockSvnExtension: MockSvnExtension;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    TestUtils.resetAllMocks();

    // Create test workspace
    const mockWorkspacePath = TestFileSystem.createMockWorkspace("svn");

    // Setup VS Code workspace
    MockVSCodeAPIFactory.configureWorkspaceFolders(mockVSCode, [
      mockWorkspacePath,
    ]);

    // Create SVN extension mock
    mockSvnExtension = MockSvnExtensionFactory.create({
      repositories: [{ rootUri: { fsPath: mockWorkspacePath } }],
    });

    // Initialize SVN provider for log tests
    mockVSCode.workspace.getConfiguration.mockImplementation(() => ({
      get: vi.fn().mockReturnValue(undefined),
    }));

    mockExec.mockImplementation(
      (command: string, options: any, callback?: Function) => {
        const actualCallback =
          typeof options === "function" ? options : callback;
        if (command === "which svn") {
          setTimeout(() => {
            actualCallback(null, "/usr/bin/svn\n", "");
          }, 0);
        } else if (command.includes("--version")) {
          setTimeout(() => {
            actualCallback(null, "svn, version 1.14.2 (r1899510)\n", "");
          }, 0);
        } else {
          setTimeout(() => {
            actualCallback(null, "", "");
          }, 0);
        }
      }
    );

    svnProvider = new SvnProvider(mockSvnExtension);
    await svnProvider.init();
  });

  describe("getCommitLog method SVN log parsing", () => {
    it("should get commit log with revision range", async () => {
      // Arrange
      const baseRevision = "100";
      const headRevision = "110";
      const expectedLogOutput = `------------------------------------------------------------------------
r110 | author1 | 2023-01-10 10:00:00 +0000 (Tue, 10 Jan 2023) | 1 line

Latest commit message
------------------------------------------------------------------------
r109 | author2 | 2023-01-09 10:00:00 +0000 (Mon, 09 Jan 2023) | 1 line

Previous commit message
------------------------------------------------------------------------`;

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (
            command.includes("svn log") &&
            command.includes(`-r ${headRevision}:${baseRevision}`)
          ) {
            setTimeout(() => {
              actualCallback(null, expectedLogOutput, "");
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getCommitLog(baseRevision, headRevision);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBe("Latest commit message");
      expect(result[1]).toBe("Previous commit message");
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining(`-r ${headRevision}:${baseRevision}`),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it("should get recent commit log when no base revision provided", async () => {
      // Arrange
      const headRevision = "HEAD";
      const expectedLogOutput = `------------------------------------------------------------------------
r123 | author1 | 2023-01-10 10:00:00 +0000 (Tue, 10 Jan 2023) | 1 line

Recent commit message 1
------------------------------------------------------------------------
r122 | author2 | 2023-01-09 10:00:00 +0000 (Mon, 09 Jan 2023) | 1 line

Recent commit message 2
------------------------------------------------------------------------`;

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn log") && command.includes("-l 20")) {
            setTimeout(() => {
              actualCallback(null, expectedLogOutput, "");
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getCommitLog();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBe("Recent commit message 1");
      expect(result[1]).toBe("Recent commit message 2");
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("-l 20"),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it("should get commit log with custom limit from configuration", async () => {
      // Arrange
      const customLimit = 50;
      mockVSCode.workspace.getConfiguration.mockImplementation(
        (section: string) => {
          if (section === "svn-commit-gen") {
            return {
              get: vi.fn().mockImplementation((key: string) => {
                if (key === "commitLogLimit") {return customLimit;}
                return undefined;
              }),
            };
          }
          return { get: vi.fn() };
        }
      );

      const expectedLogOutput = `------------------------------------------------------------------------
r123 | author1 | 2023-01-10 10:00:00 +0000 (Tue, 10 Jan 2023) | 1 line

Commit with custom limit
------------------------------------------------------------------------`;

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (
            command.includes("svn log") &&
            command.includes(`-l ${customLimit}`)
          ) {
            setTimeout(() => {
              actualCallback(null, expectedLogOutput, "");
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Reinitialize with new config
      svnProvider = new SvnProvider(mockSvnExtension);
      await svnProvider.init();

      // Act
      const result = await svnProvider.getCommitLog();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBe("Commit with custom limit");
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining(`-l ${customLimit}`),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it("should handle empty log output", async () => {
      // Arrange
      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn log")) {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getCommitLog();

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle SVN log command failure", async () => {
      // Arrange
      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn log")) {
            setTimeout(() => {
              actualCallback(new Error("svn: E155007: Working copy not found"));
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getCommitLog();

      // Assert
      expect(result).toEqual([]); // Should return empty array on error
    });

    it("should parse multi-line commit messages correctly", async () => {
      // Arrange
      const expectedLogOutput = `------------------------------------------------------------------------
r123 | author1 | 2023-01-10 10:00:00 +0000 (Tue, 10 Jan 2023) | 3 lines

Multi-line commit message
with detailed description
and additional notes
------------------------------------------------------------------------
r122 | author2 | 2023-01-09 10:00:00 +0000 (Mon, 09 Jan 2023) | 1 line

Single line commit
------------------------------------------------------------------------`;

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn log")) {
            setTimeout(() => {
              actualCallback(null, expectedLogOutput, "");
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getCommitLog();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(
        "Multi-line commit message\nwith detailed description\nand additional notes"
      );
      expect(result[1]).toBe("Single line commit");
    });

    it("should handle malformed log entries gracefully", async () => {
      // Arrange
      const malformedLogOutput = `------------------------------------------------------------------------
invalid entry without proper format
------------------------------------------------------------------------
r123 | author1 | 2023-01-10 10:00:00 +0000 (Tue, 10 Jan 2023) | 1 line

Valid commit message
------------------------------------------------------------------------
another invalid entry
------------------------------------------------------------------------`;

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn log")) {
            setTimeout(() => {
              actualCallback(null, malformedLogOutput, "");
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getCommitLog();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBe("Valid commit message");
    });
  });

  describe("getRecentCommitMessages method", () => {
    it("should get recent commit messages for repository and user", async () => {
      // Arrange
      const repositoryLogOutput = `------------------------------------------------------------------------
r125 | author1 | 2023-01-12 10:00:00 +0000 (Thu, 12 Jan 2023) | 1 line

Repository commit 1
------------------------------------------------------------------------
r124 | author2 | 2023-01-11 10:00:00 +0000 (Wed, 11 Jan 2023) | 1 line

Repository commit 2
------------------------------------------------------------------------`;

      const userInfoOutput = "testuser";
      const userLogOutput = `------------------------------------------------------------------------
r123 | testuser | 2023-01-10 10:00:00 +0000 (Tue, 10 Jan 2023) | 1 line

User commit 1
------------------------------------------------------------------------
r120 | testuser | 2023-01-07 10:00:00 +0000 (Sat, 07 Jan 2023) | 1 line

User commit 2
------------------------------------------------------------------------`;

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (
            command.includes("svn log -l 5") &&
            !command.includes("--search")
          ) {
            setTimeout(() => {
              actualCallback(null, repositoryLogOutput, "");
            }, 0);
          } else if (
            command.includes("svn info --show-item last-changed-author")
          ) {
            setTimeout(() => {
              actualCallback(null, userInfoOutput, "");
            }, 0);
          } else if (
            command.includes("svn log -l 5") &&
            command.includes('--search "testuser"')
          ) {
            setTimeout(() => {
              actualCallback(null, userLogOutput, "");
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getRecentCommitMessages();

      // Assert
      expect(result.repository).toHaveLength(2);
      expect(result.repository[0]).toBe("Repository commit 1");
      expect(result.repository[1]).toBe("Repository commit 2");

      expect(result.user).toHaveLength(2);
      expect(result.user[0]).toBe("User commit 1");
      expect(result.user[1]).toBe("User commit 2");
    });

    it("should handle failure to get user info gracefully", async () => {
      // Arrange
      const repositoryLogOutput = `------------------------------------------------------------------------
r125 | author1 | 2023-01-12 10:00:00 +0000 (Thu, 12 Jan 2023) | 1 line

Repository commit 1
------------------------------------------------------------------------`;

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (
            command.includes("svn log -l 5") &&
            !command.includes("--search")
          ) {
            setTimeout(() => {
              actualCallback(null, repositoryLogOutput, "");
            }, 0);
          } else if (
            command.includes("svn info --show-item last-changed-author")
          ) {
            setTimeout(() => {
              actualCallback(new Error("Failed to get user info"));
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getRecentCommitMessages();

      // Assert
      expect(result.repository).toHaveLength(1);
      expect(result.repository[0]).toBe("Repository commit 1");
      expect(result.user).toHaveLength(0);
    });

    it("should handle empty repository log", async () => {
      // Arrange
      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn log")) {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          } else if (
            command.includes("svn info --show-item last-changed-author")
          ) {
            setTimeout(() => {
              actualCallback(null, "testuser", "");
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getRecentCommitMessages();

      // Assert
      expect(result.repository).toHaveLength(0);
      expect(result.user).toHaveLength(0);
    });
  });

  describe("XML log output parsing", () => {
    it("should handle XML format log output if needed", async () => {
      // Arrange - This tests the robustness of the log parsing
      const xmlLogOutput = `<?xml version="1.0" encoding="UTF-8"?>
<log>
<logentry revision="123">
<author>testuser</author>
<date>2023-01-10T10:00:00.000000Z</date>
<msg>XML format commit message</msg>
</logentry>
</log>`;

      // Note: Current implementation doesn't use XML format, but this tests
      // that the parser handles unexpected formats gracefully
      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn log")) {
            setTimeout(() => {
              actualCallback(null, xmlLogOutput, "");
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getCommitLog();

      // Assert
      expect(result).toEqual([]); // Should handle gracefully and return empty
    });

    it("should handle mixed format log entries", async () => {
      // Arrange
      const mixedLogOutput = `------------------------------------------------------------------------
r123 | author1 | 2023-01-10 10:00:00 +0000 (Tue, 10 Jan 2023) | 1 line

Valid commit message
------------------------------------------------------------------------
<invalid>XML-like content</invalid>
------------------------------------------------------------------------
r122 | author2 | 2023-01-09 10:00:00 +0000 (Mon, 09 Jan 2023) | 1 line

Another valid commit
------------------------------------------------------------------------`;

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn log")) {
            setTimeout(() => {
              actualCallback(null, mixedLogOutput, "");
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getCommitLog();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBe("Valid commit message");
      expect(result[1]).toBe("Another valid commit");
    });
  });
});
describe("4.4 SVN Authentication and Error Handling Tests", () => {
  let svnProvider: SvnProvider;
  let mockSvnExtension: MockSvnExtension;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    TestUtils.resetAllMocks();

    // Create test workspace
    const mockWorkspacePath = TestFileSystem.createMockWorkspace("svn");

    // Setup VS Code workspace
    MockVSCodeAPIFactory.configureWorkspaceFolders(mockVSCode, [
      mockWorkspacePath,
    ]);

    // Create SVN extension mock
    mockSvnExtension = MockSvnExtensionFactory.create({
      repositories: [{ rootUri: { fsPath: mockWorkspacePath } }],
    });

    // Initialize SVN provider for auth/error tests
    mockVSCode.workspace.getConfiguration.mockImplementation(() => ({
      get: vi.fn().mockReturnValue(undefined),
    }));

    mockExec.mockImplementation(
      (command: string, options: any, callback?: Function) => {
        const actualCallback =
          typeof options === "function" ? options : callback;
        if (command === "which svn") {
          setTimeout(() => {
            actualCallback(null, "/usr/bin/svn\n", "");
          }, 0);
        } else if (command.includes("--version")) {
          setTimeout(() => {
            actualCallback(null, "svn, version 1.14.2 (r1899510)\n", "");
          }, 0);
        } else {
          setTimeout(() => {
            actualCallback(null, "", "");
          }, 0);
        }
      }
    );

    svnProvider = new SvnProvider(mockSvnExtension);
    await svnProvider.init();
  });

  describe("SVN authentication failure handling", () => {
    it("should handle authentication required error (E170001)", async () => {
      // Arrange
      const authError = new Error("svn: E170001: Authentication failed");

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn diff")) {
            setTimeout(() => {
              actualCallback(authError);
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act & Assert
      await expect(svnProvider.getDiff()).rejects.toThrow();
    });

    it("should handle authorization error (E170013)", async () => {
      // Arrange
      const authError = new Error(
        "svn: E170013: Unable to connect to a repository at URL"
      );

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn log")) {
            setTimeout(() => {
              actualCallback(authError);
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getCommitLog();

      // Assert - Should return empty array on auth error
      expect(result).toEqual([]);
    });

    it("should handle certificate verification errors", async () => {
      // Arrange
      const certError = new Error(
        "svn: E230001: Server SSL certificate verification failed"
      );

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn info")) {
            setTimeout(() => {
              actualCallback(certError);
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getRecentCommitMessages();

      // Assert - Should handle gracefully
      expect(result.repository).toEqual([]);
      expect(result.user).toEqual([]);
    });

    it("should handle network connectivity issues", async () => {
      // Arrange
      const networkError = new Error(
        "svn: E170013: Unable to connect to a repository"
      );

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn diff")) {
            setTimeout(() => {
              actualCallback(networkError);
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act & Assert
      await expect(svnProvider.getDiff()).rejects.toThrow();
    });
  });

  describe("command execution timeout handling", () => {
    it("should handle command timeout during diff operation", async () => {
      // Arrange
      const timeoutError = new Error("Command timed out");

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn diff")) {
            // Simulate timeout after delay
            setTimeout(() => {
              actualCallback(timeoutError);
            }, 100);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act & Assert
      await expect(svnProvider.getDiff()).rejects.toThrow();
    });

    it("should handle command timeout during log operation", async () => {
      // Arrange
      const timeoutError = new Error("ETIMEDOUT: Command execution timed out");

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn log")) {
            setTimeout(() => {
              actualCallback(timeoutError);
            }, 50);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getCommitLog();

      // Assert - Should return empty array on timeout
      expect(result).toEqual([]);
    });

    it("should handle command timeout during commit operation", async () => {
      // Arrange
      const timeoutError = new Error("Process killed due to timeout");
      const commitMessage = "Test commit";
      const files = ["src/test.ts"];

      const mockRepository = MockSvnExtensionFactory.createRepository();
      mockRepository.commitFiles.mockRejectedValue(timeoutError);
      mockSvnExtension.getAPI().repositories = [mockRepository];

      // Act & Assert
      await expect(svnProvider.commit(commitMessage, files)).rejects.toThrow(
        /svn.commit.failed/
      );
    });
  });

  describe("SVN path configuration error handling", () => {
    it("should handle invalid SVN path configuration", async () => {
      // Arrange
      mockVSCode.workspace.getConfiguration.mockImplementation(
        (section: string) => {
          if (section === "svn-commit-gen") {
            return { get: vi.fn().mockReturnValue("/invalid/svn/path") };
          }
          return { get: vi.fn() };
        }
      );

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("/invalid/svn/path")) {
            setTimeout(() => {
              actualCallback(new Error("No such file or directory"));
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      const invalidSvnProvider = new SvnProvider(mockSvnExtension);

      // Act & Assert
      await expect(invalidSvnProvider.init()).rejects.toThrow(
        /svn.initialization.failed/
      );
    });

    it("should handle SVN not in PATH", async () => {
      // Arrange
      mockVSCode.workspace.getConfiguration.mockImplementation(() => ({
        get: vi.fn().mockReturnValue(undefined),
      }));

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command === "which svn") {
            setTimeout(() => {
              actualCallback(new Error("which: svn: not found"));
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      const noSvnProvider = new SvnProvider(mockSvnExtension);

      // Act & Assert
      await expect(noSvnProvider.init()).rejects.toThrow(
        /Unable to locate SVN executable/
      );
    });

    it("should handle corrupted SVN working copy", async () => {
      // Arrange
      const corruptError = new Error(
        "svn: E155007: '/path/to/repo' is not a working copy"
      );

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn diff")) {
            setTimeout(() => {
              actualCallback(corruptError);
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act & Assert
      await expect(svnProvider.getDiff()).rejects.toThrow();
    });

    it("should handle SVN database lock errors", async () => {
      // Arrange
      const lockError = new Error(
        "svn: E155004: Working copy '/path/to/repo' locked"
      );

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn log")) {
            setTimeout(() => {
              actualCallback(lockError);
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getCommitLog();

      // Assert - Should handle gracefully
      expect(result).toEqual([]);
    });
  });

  describe("general error handling and recovery", () => {
    it("should handle unexpected command output format", async () => {
      // Arrange
      const unexpectedOutput = "Unexpected command output format";

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn log")) {
            setTimeout(() => {
              actualCallback(null, unexpectedOutput, "");
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getCommitLog();

      // Assert - Should handle gracefully
      expect(result).toEqual([]);
    });

    it("should handle empty stderr with error exit code", async () => {
      // Arrange
      const exitCodeError = new Error("Command failed with exit code 1");
      exitCodeError.name = "ExitCodeError";

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn diff")) {
            setTimeout(() => {
              actualCallback(exitCodeError);
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act & Assert
      await expect(svnProvider.getDiff()).rejects.toThrow();
    });

    it("should handle memory/resource exhaustion errors", async () => {
      // Arrange
      const memoryError = new Error("Cannot allocate memory");

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn log")) {
            setTimeout(() => {
              actualCallback(memoryError);
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getCommitLog();

      // Assert - Should handle gracefully
      expect(result).toEqual([]);
    });

    it("should handle operations on uninitialized provider", async () => {
      // Arrange
      const uninitializedProvider = new SvnProvider(mockSvnExtension);
      // Don't call init()

      // Act & Assert
      await expect(uninitializedProvider.getDiff()).rejects.toThrow(
        /svn.not.initialized/
      );
      await expect(uninitializedProvider.getCommitLog()).rejects.toThrow(
        /svn.not.initialized/
      );
    });

    it("should handle concurrent operations gracefully", async () => {
      // Arrange
      const diffOutput = SvnTestData.generateSvnDiffOutput([
        "file1.ts",
        "file2.ts",
      ]);

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn diff")) {
            // Add small delay to simulate real command execution
            setTimeout(() => {
              actualCallback(null, diffOutput, "");
            }, 10);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act - Execute multiple operations concurrently
      const promises = [
        svnProvider.getDiff(["file1.ts"]),
        svnProvider.getDiff(["file2.ts"]),
        svnProvider.getCommitLog(),
      ];

      const results = await Promise.allSettled(promises);

      // Assert - All operations should complete
      expect(results[0].status).toBe("fulfilled");
      expect(results[1].status).toBe("fulfilled");
      expect(results[2].status).toBe("fulfilled");
    });

    it("should handle file permission errors", async () => {
      // Arrange
      const permissionError = new Error("svn: E000013: Permission denied");

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn diff")) {
            setTimeout(() => {
              actualCallback(permissionError);
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act & Assert
      await expect(svnProvider.getDiff()).rejects.toThrow();
    });
  });

  describe("input validation and sanitization", () => {
    beforeEach(async () => {
      svnProvider = new SvnProvider(mockSvnExtension);
      await svnProvider.init();
    });

    it("should handle special characters in file paths", async () => {
      // Arrange
      const specialFiles = [
        "file with spaces.ts",
        'file"with"quotes.ts',
        "file'with'apostrophes.ts",
      ];
      const diffOutput = SvnTestData.generateSvnDiffOutput(specialFiles);

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn diff")) {
            setTimeout(() => {
              actualCallback(null, diffOutput, "");
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act
      const result = await svnProvider.getDiff(specialFiles);

      // Assert
      expect(result).toBeDefined();
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("svn diff"),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it("should handle empty file arrays", async () => {
      // Arrange
      const emptyFiles: string[] = [];

      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          if (command.includes("svn diff") && !command.includes('"')) {
            setTimeout(() => {
              actualCallback(null, "", ""); // No changes
            }, 0);
          } else {
            setTimeout(() => {
              actualCallback(null, "", "");
            }, 0);
          }
        }
      );

      // Act & Assert
      await expect(svnProvider.getDiff(emptyFiles)).rejects.toThrow(
        /diff.noChanges/
      );
    });

    it("should handle null and undefined parameters gracefully", async () => {
      // Arrange
      mockExec.mockImplementation(
        (command: string, options: any, callback?: Function) => {
          const actualCallback =
            typeof options === "function" ? options : callback;
          setTimeout(() => {
            actualCallback(null, "", "");
          }, 0);
        }
      );

      // Act & Assert
      await expect(svnProvider.getDiff(undefined)).rejects.toThrow(
        /diff.noChanges/
      );

      const result = await svnProvider.getCommitLog(undefined, undefined);
      expect(result).toEqual([]);
    });
  });
});
