/**
 * Smart Diff Selector - Intelligent diff target selection based on staged content detection
 * Integrates with existing SCM providers and configuration system
 */

import * as vscode from "vscode";
import {
  ISmartDiffSelector,
  StagedDetectionResult,
  DiffTarget,
  DiffResult,
  AutoDetectionConfig,
} from "./staged-detector-types";
import { ISCMProvider } from "./scm-provider";
import { notify } from "../utils/notification/notification-manager";

/**
 * Provides intelligent diff target selection based on detection results and user preferences
 */
export class SmartDiffSelector implements ISmartDiffSelector {
  constructor() {
    // Constructor simplified
  }

  /**
   * Intelligently select the appropriate diff target based on detection results
   * @param provider SCM provider instance
   * @param detectionResult Result from staged content detection
   * @param userPreference User's preferred target (optional)
   * @returns Promise resolving to selected diff target
   */
  async selectDiffTarget(
    provider: ISCMProvider,
    detectionResult: StagedDetectionResult,
    userPreference?: DiffTarget
  ): Promise<DiffTarget> {
    const config = this.getAutoDetectionConfig();

    // If user explicitly specified a preference (not auto), honor it
    if (userPreference && userPreference !== DiffTarget.AUTO) {
      await this.notifySelection(
        userPreference,
        detectionResult,
        "User preference"
      );
      return userPreference;
    }

    // If auto-detection is disabled, use traditional config mode
    if (!config.enabled) {
      const target =
        config.preferredTarget !== DiffTarget.AUTO
          ? config.preferredTarget
          : DiffTarget.ALL;
      await this.notifySelection(
        target,
        detectionResult,
        "Auto-detection disabled"
      );
      return target;
    }

    // Handle detection errors
    if (detectionResult.errorMessage) {
      const fallbackTarget = config.fallbackToAll
        ? DiffTarget.ALL
        : DiffTarget.STAGED;
      await this.notifySelection(
        fallbackTarget,
        detectionResult,
        `Detection failed: ${detectionResult.errorMessage}`
      );
      return fallbackTarget;
    }

    // Smart selection based on detection results
    const selectedTarget = await this.performSmartSelection(
      detectionResult,
      config
    );
    await this.notifySelection(
      selectedTarget,
      detectionResult,
      "Auto-detection"
    );

    return selectedTarget;
  }

  /**
   * Get diff content using the specified target
   * @param provider SCM provider instance
   * @param target Diff target to use
   * @param files Optional file list to limit diff scope
   * @returns Promise resolving to diff result
   */
  async getDiffWithTarget(
    provider: ISCMProvider,
    target: DiffTarget,
    files?: string[]
  ): Promise<DiffResult> {
    try {
      let content: string;
      let actualFiles: string[] = [];

      switch (target) {
        case DiffTarget.STAGED:
          content = await this.getStagedDiff(provider, files);
          actualFiles = await this.getStagedFilesList(provider, files);
          break;

        case DiffTarget.ALL:
          content = await this.getAllDiff(provider, files);
          actualFiles = await this.getAllChangedFilesList(provider, files);
          break;

        case DiffTarget.AUTO:
          // Auto should have been resolved by selectDiffTarget, but handle just in case
          const autoTarget = DiffTarget.ALL;
          return this.getDiffWithTarget(provider, autoTarget, files);

        default:
          throw new Error(`Unsupported diff target: ${target}`);
      }

      return {
        content,
        target,
        files: actualFiles,
        repositoryPath: this.getRepositoryPath(provider),
      };
    } catch (error) {
      throw new Error(
        `Failed to get diff content for target '${target}': ${error}`
      );
    }
  }

  /**
   * Get configuration for auto-detection behavior
   * @private
   */
  private getAutoDetectionConfig(): AutoDetectionConfig {
    const config = vscode.workspace.getConfiguration("dish-ai-commit");

    return {
      enabled: config.get<boolean>(
        "features.codeAnalysis.autoDetectStaged",
        true
      ),
      fallbackToAll: config.get<boolean>(
        "features.codeAnalysis.fallbackToAll",
        true
      ),
      preferredTarget: config.get<string>(
        "features.codeAnalysis.diffTarget",
        "auto"
      ) as DiffTarget,
      showNotifications:
        config.get<boolean>("features.suppressNonCriticalWarnings", true) ===
        false,
    };
  }

  /**
   * Perform smart selection logic based on detection results
   * @private
   */
  private async performSmartSelection(
    detectionResult: StagedDetectionResult,
    config: AutoDetectionConfig
  ): Promise<DiffTarget> {
    const { hasStagedContent, stagedFileCount } = detectionResult;

    // If staged content exists, prefer it
    if (hasStagedContent && stagedFileCount > 0) {
      return DiffTarget.STAGED;
    }

    // No staged content - decide based on configuration
    if (config.fallbackToAll) {
      return DiffTarget.ALL;
    } else {
      // User prefers to be notified when staging area is empty
      return DiffTarget.STAGED; // This will likely result in empty diff, but respects user preference
    }
  }

  /**
   * Get staged diff content from provider
   * @private
   */
  private async getStagedDiff(
    provider: ISCMProvider,
    files?: string[]
  ): Promise<string> {
    // Temporarily set diffTarget to 'staged' for this call
    const config = vscode.workspace.getConfiguration("dish-ai-commit");
    const originalTarget = config.get("features.codeAnalysis.diffTarget");

    try {
      await config.update(
        "features.codeAnalysis.diffTarget",
        "staged",
        vscode.ConfigurationTarget.Workspace
      );
      return (await provider.getDiff(files)) || "";
    } finally {
      // Restore original target
      await config.update(
        "features.codeAnalysis.diffTarget",
        originalTarget,
        vscode.ConfigurationTarget.Workspace
      );
    }
  }

  /**
   * Get all changes diff content from provider
   * @private
   */
  private async getAllDiff(
    provider: ISCMProvider,
    files?: string[]
  ): Promise<string> {
    // Temporarily set diffTarget to 'all' for this call
    const config = vscode.workspace.getConfiguration("dish-ai-commit");
    const originalTarget = config.get("features.codeAnalysis.diffTarget");

    try {
      await config.update(
        "features.codeAnalysis.diffTarget",
        "all",
        vscode.ConfigurationTarget.Workspace
      );
      return (await provider.getDiff(files)) || "";
    } finally {
      // Restore original target
      await config.update(
        "features.codeAnalysis.diffTarget",
        originalTarget,
        vscode.ConfigurationTarget.Workspace
      );
    }
  }

  /**
   * Get list of staged files from provider
   * @private
   */
  private async getStagedFilesList(
    provider: ISCMProvider,
    files?: string[]
  ): Promise<string[]> {
    // This would typically call git diff --cached --name-only
    // For now, return the files parameter or empty array
    return files || [];
  }

  /**
   * Get list of all changed files from provider
   * @private
   */
  private async getAllChangedFilesList(
    provider: ISCMProvider,
    files?: string[]
  ): Promise<string[]> {
    // This would typically call git diff --name-only (unstaged) + git diff --cached --name-only (staged)
    // For now, return the files parameter or empty array
    return files || [];
  }

  /**
   * Get repository path from provider
   * @private
   */
  private getRepositoryPath(provider: ISCMProvider): string {
    // Try to get repository path from provider properties
    if (
      "repositoryPath" in provider &&
      typeof (provider as any).repositoryPath === "string"
    ) {
      return (provider as any).repositoryPath;
    }

    // Fallback to workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    return workspaceFolder?.uri.fsPath || process.cwd();
  }

  /**
   * Notify user about diff target selection
   * @private
   */
  private async notifySelection(
    target: DiffTarget,
    detectionResult: StagedDetectionResult,
    reason: string
  ): Promise<void> {
    const config = this.getAutoDetectionConfig();

    if (!config.showNotifications) {
      return;
    }

    let message: string;
    let level: "info" | "warning" | "error" = "info";

    switch (target) {
      case DiffTarget.STAGED:
        if (detectionResult.hasStagedContent) {
          message = `🔍 分析暂存区内容 (${detectionResult.stagedFileCount} 个文件)`;
        } else {
          message = `⚠️ 暂存区为空，将分析暂存区 (可能无内容)`;
          level = "warning";
        }
        break;

      case DiffTarget.ALL:
        if (detectionResult.hasStagedContent) {
          message = `🔍 分析所有工作区更改 (包含 ${detectionResult.stagedFileCount} 个暂存文件)`;
        } else {
          message = `🔍 暂存区为空，分析所有工作区更改`;
        }
        break;

      default:
        message = `🔍 使用 ${target} 模式分析更改`;
        break;
    }

    // Add reason to message for debugging
    const fullMessage = `${message} (${reason})`;

    switch (level) {
      case "info":
        await notify.info(fullMessage);
        break;
      case "warning":
        await notify.warn(fullMessage);
        break;
    }
  }

  /**
   * Validate that the selected target will produce meaningful results
   * @param provider SCM provider
   * @param target Selected diff target
   * @returns Promise resolving to validation result
   */
  async validateTarget(
    provider: ISCMProvider,
    target: DiffTarget
  ): Promise<{
    isValid: boolean;
    reason?: string;
    suggestion?: DiffTarget;
  }> {
    try {
      const result = await this.getDiffWithTarget(provider, target);

      if (!result.content || result.content?.trim().length === 0) {
        let suggestion: DiffTarget | undefined;
        let reason: string;

        if (target === DiffTarget.STAGED) {
          suggestion = DiffTarget.ALL;
          reason = "暂存区为空，建议分析所有工作区更改";
        } else {
          reason = "没有检测到任何更改";
        }

        return {
          isValid: false,
          reason,
          suggestion,
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        reason: `无法获取 ${target} 模式的差异内容: ${error}`,
      };
    }
  }
}

/**
 * Singleton instance for global access
 */
export const smartDiffSelector = new SmartDiffSelector();
