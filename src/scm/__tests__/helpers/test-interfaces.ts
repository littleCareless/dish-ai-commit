/**
 * Interface definitions for test utilities and mock objects
 */

import { Mock } from 'vitest';

// Test configuration interfaces
export interface TestConfig {
  mockWorkspacePath: string;
  scmType: 'git' | 'svn' | 'none';
  hasExtension: boolean;
  hasCommandLine: boolean;
}

export interface TestScenario {
  name: string;
  config: TestConfig;
  expectedBehavior: string;
  setupSteps: string[];
  assertions: string[];
}

// Test result interfaces
export interface TestResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: Error;
  coverage?: CoverageInfo;
}

export interface CoverageInfo {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

// Mock VS Code API interfaces
export interface MockWorkspaceFolder {
  uri: { fsPath: string; path: string };
  name: string;
  index: number;
}

export interface MockVSCodeAPI {
  workspace: {
    workspaceFolders: MockWorkspaceFolder[];
    getConfiguration: Mock;
    onDidChangeConfiguration: Mock;
  };
  window: {
    showErrorMessage: Mock;
    showInformationMessage: Mock;
    showInputBox: Mock;
    showQuickPick: Mock;
  };
  env: {
    clipboard: {
      writeText: Mock;
    };
  };
  extensions: {
    getExtension: Mock;
  };
  Uri: {
    file: Mock;
    parse: Mock;
  };
  commands: {
    executeCommand: Mock;
  };
}

// Mock Git Extension interfaces
export interface MockGitRepository {
  inputBox: { value: string };
  commit: Mock;
  log: Mock;
  getConfig: Mock;
  getGlobalConfig: Mock;
  getBranches: Mock;
  diff: Mock;
  show: Mock;
  rootUri: { fsPath: string };
}

export interface MockGitAPI {
  repositories: MockGitRepository[];
  getRepository: Mock;
}

export interface MockGitExtension {
  getAPI: Mock;
  isActive: boolean;
}

// Mock SVN Extension interfaces
export interface MockSvnRepository {
  inputBox: { value: string };
  commitFiles: Mock;
  log: Mock;
  diff: Mock;
  info: Mock;
  rootUri: { fsPath: string };
}

export interface MockSvnAPI {
  repositories: MockSvnRepository[];
  getRepository: Mock;
}

export interface MockSvnExtension {
  getAPI: Mock;
  isActive: boolean;
}

// Command execution interfaces
export interface CommandResult {
  stdout: string;
  stderr?: string;
  code?: number;
}

export interface CommandError extends Error {
  code?: number;
  signal?: string;
  stdout?: string;
  stderr?: string;
}

// File system interfaces
export interface MockFileSystemEntry {
  path: string;
  type: 'file' | 'directory';
  content?: string;
  children?: MockFileSystemEntry[];
}

export interface TempDirectoryConfig {
  prefix: string;
  cleanup: boolean;
  structure?: MockFileSystemEntry[];
}

// Test data generation interfaces
export interface GitCommitData {
  hash: string;
  author: string;
  email: string;
  date: string;
  message: string;
}

export interface SvnCommitData {
  revision: number;
  author: string;
  date: string;
  message: string;
  paths: string[];
}

export interface DiffData {
  file: string;
  oldContent: string;
  newContent: string;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

// Error handling interfaces
export interface TestError extends Error {
  type: 'setup' | 'mock' | 'assertion' | 'timeout' | 'resource';
  context?: Record<string, any>;
}

export interface ErrorHandlerConfig {
  retryCount: number;
  retryDelay: number;
  logErrors: boolean;
  throwOnError: boolean;
}