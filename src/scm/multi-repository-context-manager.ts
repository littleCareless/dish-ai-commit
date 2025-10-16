/**
 * Multi-Repository Context Manager - Handles repository identification and context management
 * for single workspace with multiple repositories scenarios
 */

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { promisify } from "util";
import { exec } from "child_process";
import { SvnUtilsHelper } from "./svn/helpers/svn-utils-helper";
import {
  IMultiRepositoryContextManager,
  RepositoryInfo,
  RepositoryContext,
  DetectionErrorType,
  StagedDetectionError,
} from "./staged-detector-types";

const execAsync = promisify(exec);
const statAsync = promisify(fs.stat);
const readdirAsync = promisify(fs.readdir);

/**
 * Manages multiple repositories within a single workspace
 */
export class MultiRepositoryContextManager
  implements IMultiRepositoryContextManager
{
  private repositoryCache = new Map<string, RepositoryInfo>();
  private cacheTimestamp = 0;
  private readonly cacheTimeout = 30000; // 30 seconds cache

  /**
   * Identify the current repository context based on user selection or active editor
   * @param selectedFiles Selected files from explorer
   * @param activeEditor Current active text editor
   * @returns Promise resolving to repository context
   */
  async identifyRepository(
    selectedFiles?: string[],
    activeEditor?: vscode.TextEditor,
    resourceStates?: vscode.SourceControlResourceState[] // Added for better context
  ): Promise<RepositoryContext> {
    const activeFile = activeEditor?.document?.fileName;
    // Let getRepositoryFromResources figure out the files if not explicitly provided.
    const filesForDetection =
      selectedFiles || (activeFile ? [activeFile] : undefined);

    const repoPath = await this.getRepositoryFromResources(
      resourceStates,
      filesForDetection
    );

    let targetRepository: RepositoryInfo;

    if (repoPath) {
      const repoInfo = await this.getRepositoryInfo(repoPath);
      targetRepository = repoInfo || this.createFallbackRepository(repoPath);
    } else {
      // Fallback logic remains the same
      const primary = await this.getPrimaryRepository();
      if (primary) {
        targetRepository = primary;
      } else {
        const allRepos = await this.getAllRepositories();
        if (allRepos.length > 0) {
          targetRepository = allRepos[0];
        } else {
          throw new StagedDetectionError(
            DetectionErrorType.INVALID_REPOSITORY,
            "No valid repositories found in workspace. Please open a folder with a repository."
          );
        }
      }
    }

    // The final selected files should be what the user actually selected,
    // or what can be inferred from the SCM view.
    const finalSelectedFiles =
      selectedFiles ||
      (resourceStates ? this.getSelectedFiles(resourceStates) : []);

    return {
      repository: targetRepository,
      selectedFiles:
        finalSelectedFiles.length > 0 ? finalSelectedFiles : undefined,
      activeFile,
      workingDirectory: this.getWorkingDirectory(
        targetRepository,
        finalSelectedFiles[0] || activeFile
      ),
    };
  }

  /**
   * Get all available repositories in the workspace
   * @returns Promise resolving to repository list
   */
  async getAllRepositories(): Promise<RepositoryInfo[]> {
    // Check cache
    if (this.isCacheValid()) {
      return Array.from(this.repositoryCache.values());
    }

    const repositories: RepositoryInfo[] = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
      return repositories;
    }

    // Search for repositories in all workspace folders
    for (const folder of workspaceFolders) {
      const folderRepos = await this.discoverRepositories(folder.uri.fsPath);
      repositories.push(...folderRepos);
    }

    // Update cache
    this.updateCache(repositories);

    return repositories;
  }

  /**
   * Get the primary/active repository (typically the one with git extension focus)
   * @returns Promise resolving to primary repository info or undefined
   */
  async getPrimaryRepository(): Promise<RepositoryInfo | undefined> {
    const repositories = await this.getAllRepositories();

    // Try to get active repository from VS Code's git extension
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (gitExtension && gitExtension.isActive) {
      try {
        const gitApi = gitExtension.exports.getAPI(1);
        if (gitApi.repositories.length > 0) {
          const activeRepo = gitApi.repositories[0]; // First repo is typically active
          const repoPath = activeRepo.rootUri.fsPath;

          // Find matching repository info
          const matchingRepo = repositories.find(
            (repo) =>
              repo.path === repoPath ||
              path.resolve(repo.path) === path.resolve(repoPath)
          );

          if (matchingRepo) {
            return { ...matchingRepo, isActive: true };
          }
        }
      } catch (error) {
        // Git extension not available or error accessing it
        console.warn("Could not access git extension API:", error);
      }
    }

    // Fallback: return first repository or one containing active file
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor?.document?.fileName) {
      const activeFileRepo = this.findRepoForPath(
        activeEditor.document.fileName,
        repositories
      );
      if (activeFileRepo) {
        return { ...activeFileRepo, isActive: true };
      }
    }

    return repositories.length > 0 ? repositories[0] : undefined;
  }

  /**
   * Refresh repository cache
   */
  async refreshRepositories(): Promise<void> {
    this.repositoryCache.clear();
    this.cacheTimestamp = 0;
    await this.getAllRepositories();
  }

  /**
   * Check if a path is within any known repository
   * @param filePath File path to check
   * @returns Repository info if found, undefined otherwise
   */
  async getRepositoryForPath(
    filePath: string
  ): Promise<RepositoryInfo | undefined> {
    const repositories = await this.getAllRepositories();
    return this.findRepoForPath(filePath, repositories);
  }

  /**
   * Discover repositories in a given directory
   * @private
   */
  private async discoverRepositories(
    rootPath: string
  ): Promise<RepositoryInfo[]> {
    const repositories: RepositoryInfo[] = [];

    try {
      // Check if root path itself is a repository
      const rootRepo = await this.checkRepository(rootPath);
      if (rootRepo) {
        repositories.push(rootRepo);
      } else {
        // Search subdirectories for repositories
        const subdirs = await this.getSubdirectories(rootPath);

        for (const subdir of subdirs) {
          const subdirPath = path.join(rootPath, subdir);
          const repo = await this.checkRepository(subdirPath);
          if (repo) {
            repositories.push(repo);
          }
        }
      }
    } catch (error) {
      console.warn(`Error discovering repositories in ${rootPath}:`, error);
    }

    return repositories;
  }

  /**
   * Check if a directory is a valid repository
   * @private
   */
  private async checkRepository(
    dirPath: string
  ): Promise<RepositoryInfo | undefined> {
    try {
      const stat = await statAsync(dirPath);
      if (!stat.isDirectory()) {
        return undefined;
      }

      // Check for git repository
      const gitRepo = await this.checkGitRepository(dirPath);
      if (gitRepo) {
        return gitRepo;
      }

      // Check for SVN repository
      const svnRepo = await this.checkSvnRepository(dirPath);
      if (svnRepo) {
        return svnRepo;
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Check if directory is a git repository
   * @private
   */
  private async checkGitRepository(
    dirPath: string
  ): Promise<RepositoryInfo | undefined> {
    try {
      const { stdout } = await execAsync("git rev-parse --show-toplevel", {
        cwd: dirPath,
        encoding: "utf8",
      });

      const repoPath = stdout?.trim();

      // Get current branch
      let branch: string | undefined;
      try {
        const { stdout: branchOutput } = await execAsync(
          "git rev-parse --abbrev-ref HEAD",
          {
            cwd: repoPath,
            encoding: "utf8",
          }
        );
        branch = branchOutput?.trim();
      } catch {
        // Branch detection failed, continue without branch info
      }

      return {
        path: repoPath,
        name: path.basename(repoPath),
        type: "git",
        isActive: false,
        branch,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Check if directory is an SVN repository
   * @private
   */
  private async checkSvnRepository(
    dirPath: string
  ): Promise<RepositoryInfo | undefined> {
    try {
      const svnDir = path.join(dirPath, ".svn");
      const stat = await statAsync(svnDir);

      if (stat.isDirectory()) {
        return {
          path: dirPath,
          name: path.basename(dirPath),
          type: "svn",
          isActive: false,
        };
      }
    } catch {
      // Not an SVN repository
    }

    return undefined;
  }

  /**
   * Get subdirectories of a given path
   * @private
   */
  private async getSubdirectories(dirPath: string): Promise<string[]> {
    try {
      const entries = await readdirAsync(dirPath);
      const subdirs: string[] = [];

      for (const entry of entries) {
        if (entry.startsWith(".")) {
          continue; // Skip hidden directories
        }

        const entryPath = path.join(dirPath, entry);
        try {
          const stat = await statAsync(entryPath);
          if (stat.isDirectory()) {
            subdirs.push(entry);
          }
        } catch {
          // Skip if can't stat
        }
      }

      return subdirs;
    } catch {
      return [];
    }
  }

  /**
   * Get repository info from a specific path
   * @private
   */
  private async getRepositoryInfo(
    repoPath: string
  ): Promise<RepositoryInfo | undefined> {
    const gitRepo = await this.checkGitRepository(repoPath);
    if (gitRepo) {
      return gitRepo;
    }

    const svnRepo = await this.checkSvnRepository(repoPath);
    if (svnRepo) {
      return svnRepo;
    }

    return undefined;
  }

  /**
   * Extracts file paths from SCM resource states.
   * @param resourceStates - The SCM resource states.
   * @returns An array of file paths.
   */
  private getSelectedFiles(
    resourceStates:
      | vscode.SourceControlResourceState
      | vscode.SourceControlResourceState[]
  ): string[] {
    if (!resourceStates) {
      return [];
    }
    const states = (
      Array.isArray(resourceStates) ? resourceStates : [resourceStates]
    ).filter(Boolean);

    if (states.length === 0) {
      return [];
    }

    const files = [
      ...new Set(
        states
          .map(
            (state) =>
              (state as any)?._resourceUri?.fsPath || state?.resourceUri?.fsPath
          )
          .filter(Boolean)
      ),
    ];

    return files;
  }

  /**
   * From resources or file paths, detect the corresponding Git repository path.
   * @param resourceStates - Source control resource status
   * @param files - Optional list of file paths, if not provided, it will be extracted from resourceStates
   * @returns Git repository path, if not found, returns undefined
   */
  private async getRepositoryFromResources(
    resourceStates?:
      | vscode.SourceControlResourceState
      | vscode.SourceControlResourceState[],
    files?: string[]
  ): Promise<string | undefined> {
    // If files are not provided, extract from resourceStates
    if (!files && resourceStates) {
      files = this.getSelectedFiles(resourceStates);
    }

    // Prioritize getting the repository path through the Git extension to ensure compatibility with Git
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (gitExtension?.isActive) {
      try {
        const gitApi = gitExtension.exports.getAPI(1);
        const repositories = gitApi.repositories;
        if (repositories.length > 0) {
          if (files && files.length > 0) {
            for (const file of files) {
              for (const repository of repositories) {
                const repoPath = (repository as any).rootUri?.fsPath;
                if (repoPath && file.startsWith(repoPath)) {
                  return repoPath;
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn("Failed to get repository from Git extension:", error);
      }
    }

    // Try to get the repository path through the SVN extension, compatible with multiple plugins
    const svnExtensionIds = [
      "littleCareless.svn-scm-ai",
      "johnstoncode.svn-scm",
    ];
    let svnExtension: vscode.Extension<any> | undefined;
    for (const id of svnExtensionIds) {
      const extension = vscode.extensions.getExtension(id);
      if (extension) {
        svnExtension = extension;
        break;
      }
    }
    if (svnExtension?.isActive) {
      try {
        const svnScmApi = svnExtension.exports;
        if (svnScmApi && typeof svnScmApi.getRepositories === "function") {
          const repositories = await svnScmApi.getRepositories();
          if (repositories && repositories.length > 0) {
            if (files && files.length > 0) {
              for (const file of files) {
                for (const repository of repositories) {
                  const repoPath = repository.root;
                  if (repoPath && file.startsWith(repoPath)) {
                    return repoPath;
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn("Failed to get repository from SVN extension:", error);
      }
    }

    // Try to get it directly from resourceStates
    // Basically, it's SVN, because the git plugin is pre-installed in vscode
    if (resourceStates) {
      const states = (
        Array.isArray(resourceStates) ? resourceStates : [resourceStates]
      ).filter(Boolean);
      for (const state of states) {
        // Try to access sourceControl.rootUri, which is a more reliable attribute
        const sc = (state as any)?.resourceGroup?.sourceControl;
        if (sc?.rootUri?.fsPath) {
          return sc.rootUri.fsPath;
        }
        // Alternative, access rootUri directly
        if ((state as any)?.rootUri?.fsPath) {
          return (state as any)?.rootUri?.fsPath;
        }
        // Final backup plan: find the SVN root directory upwards from resourceUri
        const resourceUriPath =
          (state as any)?._resourceUri?.fsPath || state?.resourceUri?.fsPath;
        if (resourceUriPath) {
          // Use SvnUtilsHelper.findSvnRoot to recursively find the .svn directory upwards,
          // This is the most reliable way to handle file or subdirectory paths.
          const svnRoot = await SvnUtilsHelper.findSvnRoot(resourceUriPath);
          if (svnRoot) {
            return svnRoot;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Find which repository contains the given file path
   * @private
   */
  private findRepoForPath(
    filePath: string,
    repositories: RepositoryInfo[]
  ): RepositoryInfo | undefined {
    // Find repository that contains this file
    for (const repo of repositories) {
      const relativePath = path.relative(repo.path, filePath);

      // If relative path doesn't start with '..' and is not absolute, the file is within this repository
      if (!relativePath.startsWith("..") && !path.isAbsolute(relativePath)) {
        return repo;
      }
    }

    return undefined;
  }

  /**
   * Get working directory relative to repository root
   * @private
   */
  private getWorkingDirectory(
    repository: RepositoryInfo,
    filePath?: string
  ): string {
    if (!filePath) {
      return "";
    }

    const relativePath = path.relative(repository.path, path.dirname(filePath));
    return relativePath.startsWith("..") ? "" : relativePath;
  }

  /**
   * Create a fallback repository when none found
   * @private
   */
  private createFallbackRepository(repoPath?: string): RepositoryInfo {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const fallbackPath = repoPath || workspaceFolder?.uri.fsPath || process.cwd();

    return {
      path: fallbackPath,
      name: path.basename(fallbackPath),
      type: "unknown",
      isActive: true,
    };
  }

  /**
   * Check if repository cache is still valid
   * @private
   */
  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.cacheTimeout;
  }

  /**
   * Update repository cache
   * @private
   */
  private updateCache(repositories: RepositoryInfo[]): void {
    this.repositoryCache.clear();
    repositories.forEach((repo) => {
      this.repositoryCache.set(repo.path, repo);
    });
    this.cacheTimestamp = Date.now();
  }
}

/**
 * Singleton instance for global access
 */
export const multiRepositoryContextManager =
  new MultiRepositoryContextManager();
