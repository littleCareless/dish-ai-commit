import * as vscode from "vscode";
import * as path from "path";
import { ISCMProvider } from "../../../scm/scm-provider";
import { SCMFactory } from "../../../scm/scm-provider";
import { multiRepositoryContextManager } from "../../../scm/multi-repository-context-manager";
import { ProgressHandler } from "../../../utils/notification/progress-handler";
import { getMessage, formatMessage } from "../../../utils/i18n";
import { notify } from "../../../utils/notification/notification-manager";
import { Logger } from "../../../utils/logger";

/**
 * 跨仓库处理器类，负责处理跨多个仓库的提交信息生成
 */
export class CrossRepositoryHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Handle cross-repository commit message generation
   * @param filesByRepository - Map of repository path to file paths
   * @param provider - AI provider instance
   * @param model - AI model name
   * @param performStreamingGeneration - 流式生成函数
   */
  async handle(
    filesByRepository: Map<string, string[]>,
    provider: string,
    model: string,
    performStreamingGeneration: (
      progress: vscode.Progress<{ message?: string; increment?: number }>,
      token: vscode.CancellationToken,
      provider: string,
      model: string,
      scmProvider: ISCMProvider,
      selectedFiles: string[] | undefined,
      resources: vscode.SourceControlResourceState[],
      repositoryPath?: string
    ) => Promise<void>
  ): Promise<void> {
    const repositoryCount = filesByRepository.size;
    this.logger.info(`=== Cross-Repository Commit Generation Started ===`);
    this.logger.info(`Repository count: ${repositoryCount}`);
    this.logger.info(`AI Provider: ${provider}, Model: ${model}`);
    
    // 记录每个仓库的详细信息
    for (const [repoPath, files] of filesByRepository.entries()) {
      this.logger.info(`Repository: ${repoPath}`);
      this.logger.info(`  - Files count: ${files.length}`);
      this.logger.info(`  - Files: ${files.slice(0, 5).join(", ")}${files.length > 5 ? "..." : ""}`);
    }
    
    // 显示开始提示
    await notify.info("generate.commit.cross.repository.start", [repositoryCount]);
    
    const results: Array<{ repoPath: string; success: boolean; error?: string }> = [];
    
    try {
      await ProgressHandler.withProgress(
        `正在为 ${repositoryCount} 个仓库生成提交信息...`,
        async (progress, token) => {
          let processedCount = 0;
          
          for (const [repoPath, files] of filesByRepository.entries()) {
            // 检查是否取消
            if (token.isCancellationRequested) {
              this.logger.info("User cancelled cross-repository processing");
              break;
            }
            
            processedCount++;
            const repoName = path.basename(repoPath);
            progress.report({
              message: `仓库 ${processedCount}/${repositoryCount}: ${repoName}`,
              increment: (100 / repositoryCount) * (processedCount - 1)
            });
            
            const startTime = Date.now();
            this.logger.info(`=== Processing Repository ${processedCount}/${repositoryCount} ===`);
            this.logger.info(`Repository: ${repoPath}`);
            this.logger.info(`Files count: ${files.length}`);
            this.logger.info(`Files: ${files.slice(0, 3).join(", ")}${files.length > 3 ? "..." : ""}`);
            
            try {
              // 为每个仓库独立处理
              await this.processSingleRepository(
                repoPath,
                files,
                provider,
                model,
                token,
                performStreamingGeneration
              );
              
              const duration = Date.now() - startTime;
              results.push({ repoPath, success: true });
              this.logger.info(`✓ Successfully processed repository: ${repoPath} (${duration}ms)`);
              
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              this.logger.error(`Failed to process repository ${repoPath}: ${errorMessage}`);
              results.push({ repoPath, success: false, error: errorMessage });
              
              // 继续处理下一个仓库，不中断
              await notify.warn("generate.commit.repository.failed", [repoName, errorMessage]);
            }
          }
          
          // 最终进度报告
          progress.report({ message: "完成", increment: 100 });
        }
      );
      
      // 报告最终结果
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      this.logger.info(`=== Cross-Repository Processing Summary ===`);
      this.logger.info(`Total repositories: ${repositoryCount}`);
      this.logger.info(`Successfully processed: ${successCount}`);
      this.logger.info(`Failed: ${failureCount}`);
      
      if (failureCount > 0) {
        this.logger.warn(`Failed repositories:`);
        results.filter(r => !r.success).forEach(result => {
          this.logger.warn(`  - ${result.repoPath}: ${result.error}`);
        });
      }
      
      if (failureCount === 0) {
        await notify.info("generate.commit.cross.repository.success", [successCount]);
      } else {
        await notify.warn("generate.commit.cross.repository.partial", [successCount, failureCount]);
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cross-repository processing failed: ${errorMsg}`);
      await notify.error("generate.commit.cross.repository.error", [errorMsg]);
    }
  }

  /**
   * Process a single repository for commit message generation
   * @param repoPath - Repository path
   * @param files - Files in this repository
   * @param provider - AI provider
   * @param model - AI model
   * @param token - Cancellation token
   * @param performStreamingGeneration - 流式生成函数
   */
  private async processSingleRepository(
    repoPath: string,
    files: string[],
    provider: string,
    model: string,
    token: vscode.CancellationToken,
    performStreamingGeneration: (
      progress: vscode.Progress<{ message?: string; increment?: number }>,
      token: vscode.CancellationToken,
      provider: string,
      model: string,
      scmProvider: ISCMProvider,
      selectedFiles: string[] | undefined,
      resources: vscode.SourceControlResourceState[],
      repositoryPath?: string
    ) => Promise<void>
  ): Promise<void> {
    this.logger.info(`--- Processing Single Repository ---`);
    this.logger.info(`Repository path: ${repoPath}`);
    this.logger.info(`Files: ${files.join(", ")}`);
    
    // 创建SCM Provider
    this.logger.info(`Detecting SCM type for repository: ${repoPath}`);
    const scmProvider = await SCMFactory.detectSCM(files, repoPath);
    if (!scmProvider) {
      const errorMsg = `无法检测到仓库的SCM类型: ${repoPath}`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    this.logger.info(`Detected SCM type: ${scmProvider.type}`);
    this.logger.info(`SCM Provider created successfully for: ${repoPath}`);
    
    // 创建resourceStates数组用于后续处理
    const resourceStates: vscode.SourceControlResourceState[] = [];
    
    this.logger.info(`Starting commit message generation for repository: ${repoPath}`);
    const startTime = Date.now();
    
    // 调用performStreamingGeneration进行实际的commit message生成
    await performStreamingGeneration(
      { report: () => {} }, // 空progress reporter，外层已处理
      token,
      provider,
      model,
      scmProvider,
      files,
      resourceStates,
      repoPath
    );
    
    const duration = Date.now() - startTime;
    this.logger.info(`Commit message generation completed for: ${repoPath} (${duration}ms)`);
  }
}

