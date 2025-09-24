/**
 * Mock factory classes for VS Code API and extensions
 */

import { vi } from "vitest";
import {
  MockVSCodeAPI,
  MockWorkspaceFolder,
  MockGitExtension,
  MockGitAPI,
  MockGitRepository,
  MockSvnExtension,
  MockSvnAPI,
  MockSvnRepository,
  TestConfig,
} from "./test-interfaces";

/**
 * Factory for creating VS Code API mocks
 */
export class MockVSCodeAPIFactory {
  /**
   * Create a complete VS Code API mock
   */
  static create(config: Partial<TestConfig> = {}): MockVSCodeAPI {
    const workspaceFolders = config.mockWorkspacePath
      ? [this.createWorkspaceFolder(config.mockWorkspacePath)]
      : [];

    return {
      workspace: {
        workspaceFolders,
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
    };
  }

  /**
   * Create a workspace folder mock
   */
  static createWorkspaceFolder(
    path: string,
    name?: string
  ): MockWorkspaceFolder {
    return {
      uri: { fsPath: path, path },
      name: name || path?.split("/").pop() || "workspace",
      index: 0,
    };
  }

  /**
   * Configure workspace folders
   */
  static configureWorkspaceFolders(
    api: MockVSCodeAPI,
    folders: string[]
  ): void {
    api.workspace.workspaceFolders = folders.map((path, index) => ({
      uri: { fsPath: path, path },
      name: path?.split("/").pop() || `workspace-${index}`,
      index,
    }));
  }

  /**
   * Configure extension availability
   */
  static configureExtensions(
    api: MockVSCodeAPI,
    extensions: Record<string, any>
  ): void {
    api.extensions.getExtension.mockImplementation((id: string) => {
      return extensions[id] || undefined;
    });
  }

  /**
   * Configure user input responses
   */
  static configureUserInput(
    api: MockVSCodeAPI,
    inputBoxResponse?: string,
    quickPickResponse?: string
  ): void {
    if (inputBoxResponse !== undefined) {
      api.window.showInputBox.mockResolvedValue(inputBoxResponse);
    }
    if (quickPickResponse !== undefined) {
      api.window.showQuickPick.mockResolvedValue(quickPickResponse);
    }
  }

  /**
   * Reset all mocks in the API
   */
  static resetMocks(api: MockVSCodeAPI): void {
    Object.values(api.workspace).forEach((mock) => {
      if (typeof mock === "function" && "mockReset" in mock) {
        mock.mockReset();
      }
    });
    Object.values(api.window).forEach((mock) => {
      if (typeof mock === "function" && "mockReset" in mock) {
        mock.mockReset();
      }
    });
    Object.values(api.env.clipboard).forEach((mock) => {
      if (typeof mock === "function" && "mockReset" in mock) {
        mock.mockReset();
      }
    });
    Object.values(api.extensions).forEach((mock) => {
      if (typeof mock === "function" && "mockReset" in mock) {
        mock.mockReset();
      }
    });
    Object.values(api.Uri).forEach((mock) => {
      if (typeof mock === "function" && "mockReset" in mock) {
        mock.mockReset();
      }
    });
    Object.values(api.commands).forEach((mock) => {
      if (typeof mock === "function" && "mockReset" in mock) {
        mock.mockReset();
      }
    });
  }
}

/**
 * Factory for creating Git extension mocks
 */
export class MockGitExtensionFactory {
  /**
   * Create a Git extension mock
   */
  static create(
    config: {
      isActive?: boolean;
      repositories?: Partial<MockGitRepository>[];
    } = {}
  ): MockGitExtension {
    const repositories = (config.repositories || [{}]).map((repo) =>
      this.createRepository(repo)
    );

    const api: MockGitAPI = {
      repositories,
      getRepository: vi.fn().mockImplementation((uri: any) => {
        return (
          repositories.find((repo) => repo.rootUri.fsPath === uri.fsPath) ||
          null
        );
      }),
    };

    return {
      getAPI: vi.fn().mockReturnValue(api),
      isActive: config.isActive !== false,
    };
  }

  /**
   * Create a Git repository mock
   */
  static createRepository(
    config: Partial<MockGitRepository> = {}
  ): MockGitRepository {
    return {
      inputBox: { value: config.inputBox?.value || "" },
      commit: vi.fn().mockResolvedValue(undefined),
      log: vi.fn().mockResolvedValue([]),
      getConfig: vi.fn().mockResolvedValue(""),
      getGlobalConfig: vi.fn().mockResolvedValue(""),
      getBranches: vi.fn().mockResolvedValue([]),
      diff: vi.fn().mockResolvedValue(""),
      show: vi.fn().mockResolvedValue(""),
      rootUri: { fsPath: config.rootUri?.fsPath || "/mock/git/repo" },
      ...config,
    };
  }

  /**
   * Configure Git repository behavior
   */
  static configureRepository(
    repository: MockGitRepository,
    config: {
      commitMessages?: string[];
      branches?: string[];
      diffOutput?: string;
      userConfig?: Record<string, string>;
    }
  ): void {
    if (config.commitMessages) {
      repository.log.mockResolvedValue(
        config.commitMessages.map((message, index) => ({
          hash: `commit-${index}`,
          message,
          author: { name: "Test Author", email: "test@example.com" },
          date: new Date(),
        }))
      );
    }

    if (config.branches) {
      repository.getBranches.mockResolvedValue(
        config.branches.map((name) => ({ name, current: name === "main" }))
      );
    }

    if (config.diffOutput) {
      repository.diff.mockResolvedValue(config.diffOutput);
    }

    if (config.userConfig) {
      repository.getConfig.mockImplementation((key: string) =>
        Promise.resolve(config.userConfig![key] || "")
      );
      repository.getGlobalConfig.mockImplementation((key: string) =>
        Promise.resolve(config.userConfig![key] || "")
      );
    }
  }

  /**
   * Create a Git extension that's not available
   */
  static createUnavailable(): undefined {
    return undefined;
  }
}

/**
 * Factory for creating SVN extension mocks
 */
export class MockSvnExtensionFactory {
  /**
   * Create an SVN extension mock
   */
  static create(
    config: {
      isActive?: boolean;
      repositories?: Partial<MockSvnRepository>[];
    } = {}
  ): MockSvnExtension {
    const repositories = (config.repositories || [{}]).map((repo) =>
      this.createRepository(repo)
    );

    const api: MockSvnAPI = {
      repositories,
      getRepository: vi.fn().mockImplementation((uri: any) => {
        return (
          repositories.find((repo) => repo.rootUri.fsPath === uri.fsPath) ||
          null
        );
      }),
    };

    return {
      getAPI: vi.fn().mockReturnValue(api),
      isActive: config.isActive !== false,
    };
  }

  /**
   * Create an SVN repository mock
   */
  static createRepository(
    config: Partial<MockSvnRepository> = {}
  ): MockSvnRepository {
    return {
      inputBox: { value: config.inputBox?.value || "" },
      commitFiles: vi.fn().mockResolvedValue(undefined),
      log: vi.fn().mockResolvedValue([]),
      diff: vi.fn().mockResolvedValue(""),
      info: vi.fn().mockResolvedValue(""),
      rootUri: { fsPath: config.rootUri?.fsPath || "/mock/svn/repo" },
      ...config,
    };
  }

  /**
   * Configure SVN repository behavior
   */
  static configureRepository(
    repository: MockSvnRepository,
    config: {
      commitMessages?: string[];
      diffOutput?: string;
      infoOutput?: string;
    }
  ): void {
    if (config.commitMessages) {
      repository.log.mockResolvedValue(
        config.commitMessages.map((message, index) => ({
          revision: index + 1,
          message,
          author: "Test Author",
          date: new Date(),
        }))
      );
    }

    if (config.diffOutput) {
      repository.diff.mockResolvedValue(config.diffOutput);
    }

    if (config.infoOutput) {
      repository.info.mockResolvedValue(config.infoOutput);
    }
  }

  /**
   * Create an SVN extension that's not available
   */
  static createUnavailable(): undefined {
    return undefined;
  }
}

/**
 * Configurable mock object factory
 */
export class ConfigurableMockFactory {
  /**
   * Create a complete test environment with all mocks
   */
  static createTestEnvironment(config: TestConfig): {
    vscode: MockVSCodeAPI;
    gitExtension?: MockGitExtension;
    svnExtension?: MockSvnExtension;
  } {
    const vscode = MockVSCodeAPIFactory.create(config);

    let gitExtension: MockGitExtension | undefined;
    let svnExtension: MockSvnExtension | undefined;

    // Configure extensions based on test config
    if (config.scmType === "git" && config.hasExtension) {
      gitExtension = MockGitExtensionFactory.create({
        repositories: [{ rootUri: { fsPath: config.mockWorkspacePath } }],
      });
    }

    if (config.scmType === "svn" && config.hasExtension) {
      svnExtension = MockSvnExtensionFactory.create({
        repositories: [{ rootUri: { fsPath: config.mockWorkspacePath } }],
      });
    }

    // Configure extension availability in VS Code API
    const extensions: Record<string, any> = {};
    if (gitExtension) {
      extensions["vscode.git"] = gitExtension;
    }
    if (svnExtension) {
      extensions["johnstoncode.svn-scm"] = svnExtension;
    }

    MockVSCodeAPIFactory.configureExtensions(vscode, extensions);

    return { vscode, gitExtension, svnExtension };
  }

  /**
   * Reset all mocks in a test environment
   */
  static resetTestEnvironment(environment: {
    vscode: MockVSCodeAPI;
    gitExtension?: MockGitExtension;
    svnExtension?: MockSvnExtension;
  }): void {
    MockVSCodeAPIFactory.resetMocks(environment.vscode);

    if (environment.gitExtension) {
      environment.gitExtension.getAPI.mockReset();
    }

    if (environment.svnExtension) {
      environment.svnExtension.getAPI.mockReset();
    }
  }

  /**
   * Create a mock with specific behavior patterns
   */
  static createBehaviorMock<T extends (...args: any[]) => any>(
    behavior: "success" | "failure" | "timeout" | "custom",
    customBehavior?: T
  ): ReturnType<typeof vi.fn> {
    switch (behavior) {
      case "success":
        return vi.fn().mockResolvedValue("success");
      case "failure":
        return vi.fn().mockRejectedValue(new Error("Mock failure"));
      case "timeout":
        return vi
          .fn()
          .mockImplementation(
            () =>
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 1000)
              )
          );
      case "custom":
        return vi.fn(customBehavior);
      default:
        return vi.fn();
    }
  }
}
