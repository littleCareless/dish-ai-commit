/**
 * Staged Content Detector - Core implementation for detecting staged changes in Git repositories
 * Supports multi-repository workspace environments with intelligent caching and error handling
 */

import * as vscode from "vscode";
import * as path from "path";
import { promisify } from "util";
import { exec } from "child_process";
import {
  IStagedContentDetector,
  StagedDetectionResult,
  DetectionOptions,
  DiffTarget,
  DetectionErrorType,
  StagedDetectionError,
  DetectionCacheEntry,
} from "./staged-detector-types";

const execAsync = promisify(exec);

/**
 * Core implementation of staged content detection functionality
 */
export class StagedContentDetector implements IStagedContentDetector {
  private cache = new Map<string, DetectionCacheEntry>();
  private readonly cacheTimeout = 5000; // 5 seconds cache

  /**
   * Detect staged content in the specified repository
   * @param options Detection options including repository context
   * @returns Promise resolving to detection result
   */
  async detectStagedContent(
    options: DetectionOptions
  ): Promise<StagedDetectionResult> {
    const { repository, useCache = true, timeoutMs = 10000 } = options;
    const repositoryPath = repository.repository.path;

    // Check cache first
    if (useCache && this.isCacheValid(repositoryPath)) {
      const cached = this.cache.get(repositoryPath);
      if (cached) {
        return { ...cached.result, repositoryPath };
      }
    }

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new StagedDetectionError(
              DetectionErrorType.TIMEOUT,
              `Staged content detection timed out after ${timeoutMs}ms`,
              repositoryPath
            )
          );
        }, timeoutMs);
      });

      // Race between detection and timeout
      const result = await Promise.race([
        this.performDetection(repositoryPath, options),
        timeoutPromise,
      ]);

      // Cache the result
      if (useCache) {
        this.cacheResult(repositoryPath, result);
      }

      return result;
    } catch (error) {
      const detectionError = this.normalizeError(error, repositoryPath);

      // Return a fallback result instead of throwing
      return {
        hasStagedContent: false,
        stagedFileCount: 0,
        stagedFiles: [],
        recommendedTarget: DiffTarget.ALL,
        repositoryPath,
        errorMessage: detectionError.message,
      };
    }
  }

  /**
   * Quick check if repository has any staged content
   * @param repositoryPath Path to repository
   * @returns Promise resolving to boolean
   */
  async hasStagedChanges(repositoryPath: string): Promise<boolean> {
    try {
      const stagedFiles = await this.getStagedFiles(repositoryPath);
      return stagedFiles.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get list of staged files in repository
   * @param repositoryPath Path to repository
   * @returns Promise resolving to array of file paths
   */
  async getStagedFiles(repositoryPath: string): Promise<string[]> {
    try {
      await this.validateRepository(repositoryPath);

      const { stdout } = await execAsync("git diff --cached --name-only", {
        cwd: repositoryPath,
        encoding: "utf8",
      });

      return stdout
        ?.trim()
        ?.split("\n")
        .filter((file) => file.length > 0)
        .map((file) => path.resolve(repositoryPath, file));
    } catch (error) {
      throw this.normalizeError(error, repositoryPath);
    }
  }

  /**
   * Get detailed information about staged changes
   * @param repositoryPath Path to repository
   * @returns Promise resolving to detailed staged info
   */
  async getStagedDetails(repositoryPath: string): Promise<{
    files: string[];
    summary: { additions: number; deletions: number; files: number };
  }> {
    try {
      await this.validateRepository(repositoryPath);

      // Get staged file names
      const files = await this.getStagedFiles(repositoryPath);

      // Get diff statistics
      const { stdout: diffStat } = await execAsync(
        "git diff --cached --numstat",
        {
          cwd: repositoryPath,
          encoding: "utf8",
        }
      );

      let additions = 0;
      let deletions = 0;

      if (diffStat?.trim()) {
        diffStat
          ?.trim()
          ?.split("\n")
          .forEach((line) => {
            const parts = line?.split("\t");
            if (parts.length >= 2) {
              const add = parseInt(parts[0]) || 0;
              const del = parseInt(parts[1]) || 0;
              additions += add;
              deletions += del;
            }
          });
      }

      return {
        files,
        summary: {
          additions,
          deletions,
          files: files.length,
        },
      };
    } catch (error) {
      throw this.normalizeError(error, repositoryPath);
    }
  }

  /**
   * Clear detection cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Perform the actual staged content detection
   * @private
   */
  private async performDetection(
    repositoryPath: string,
    options: DetectionOptions
  ): Promise<StagedDetectionResult> {
    await this.validateRepository(repositoryPath);

    const stagedFiles = await this.getStagedFiles(repositoryPath);
    console.log("stagedFiles", stagedFiles);
    const hasStagedContent = stagedFiles.length > 0;

    // Determine recommended target based on configuration and detection result
    let recommendedTarget = DiffTarget.ALL;
    if (hasStagedContent) {
      recommendedTarget = DiffTarget.STAGED;
    } else {
      // Check if fallbackToAll is enabled in configuration
      const config = vscode.workspace.getConfiguration("dish-ai-commit");
      const fallbackToAll = config.get<boolean>(
        "features.codeAnalysis.fallbackToAll",
        true
      );
      recommendedTarget = fallbackToAll ? DiffTarget.ALL : DiffTarget.STAGED;
    }

    return {
      hasStagedContent,
      stagedFileCount: stagedFiles.length,
      stagedFiles,
      recommendedTarget,
      repositoryPath,
    };
  }

  /**
   * Validate that the path is a valid git repository
   * @private
   */
  private async validateRepository(repositoryPath: string): Promise<void> {
    try {
      await execAsync("git rev-parse --git-dir", {
        cwd: repositoryPath,
        encoding: "utf8",
      });
    } catch (error) {
      throw new StagedDetectionError(
        DetectionErrorType.INVALID_REPOSITORY,
        `Path '${repositoryPath}' is not a valid git repository`,
        repositoryPath,
        error as Error
      );
    }
  }

  /**
   * Check if cached result is still valid
   * @private
   */
  private isCacheValid(repositoryPath: string): boolean {
    const cached = this.cache.get(repositoryPath);
    if (!cached) {
      return false;
    }

    const now = Date.now();
    return now - cached.timestamp < cached.ttl;
  }

  /**
   * Cache detection result
   * @private
   */
  private cacheResult(
    repositoryPath: string,
    result: StagedDetectionResult
  ): void {
    this.cache.set(repositoryPath, {
      result,
      timestamp: Date.now(),
      ttl: this.cacheTimeout,
      repositoryPath,
    });

    // Clean up old cache entries
    this.cleanupExpiredCache();
  }

  /**
   * Clean up expired cache entries
   * @private
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Normalize various error types into StagedDetectionError
   * @private
   */
  private normalizeError(
    error: any,
    repositoryPath: string
  ): StagedDetectionError {
    if (error instanceof StagedDetectionError) {
      return error;
    }

    // Determine error type based on error characteristics
    let errorType = DetectionErrorType.UNKNOWN;
    let message = "Unknown error occurred during staged content detection";

    if (error?.code === "ENOENT") {
      errorType = DetectionErrorType.INVALID_REPOSITORY;
      message = "Git executable not found or repository path invalid";
    } else if (error?.code === "EACCES") {
      errorType = DetectionErrorType.PERMISSION_DENIED;
      message = "Permission denied accessing repository";
    } else if (error?.stderr?.includes("not a git repository")) {
      errorType = DetectionErrorType.INVALID_REPOSITORY;
      message = "Not a valid git repository";
    } else if (error?.code === "TIMEOUT") {
      errorType = DetectionErrorType.TIMEOUT;
      message = "Operation timed out";
    } else if (error?.stderr) {
      errorType = DetectionErrorType.GIT_COMMAND_FAILED;
      message = `Git command failed: ${error.stderr}`;
    } else if (error?.message) {
      message = error.message;
    }

    return new StagedDetectionError(errorType, message, repositoryPath, error);
  }
}

/**
 * Singleton instance for global access
 */
export const stagedContentDetector = new StagedContentDetector();
