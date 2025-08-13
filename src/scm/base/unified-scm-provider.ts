import * as vscode from "vscode";
import { ISCMProvider } from "../scm-provider";
import { UnifiedRepositoryFinder } from "../utils/unified-repository-finder";
import { UnifiedDiffProcessor } from "../utils/unified-diff-processor";
import { SCMErrorHandler } from "../utils/error-handler";
import { SCMPathHandler } from "../utils/path-handler";
import { SCMCommandExecutor } from "../utils/command-executor";
import { getMessage, formatMessage } from "../../utils/i18n";
import { notify } from "../../utils/notification/notification-manager";
import { SCMClipboard } from "../utils/clipboard";

/**
 * 统一SCM提供者基类
 * 整合所有通用SCM操作，消除重复代码
 */
export abstract class UnifiedSCMProvider<T> implements ISCMProvider {
  /** SCM类型标识符 */
  abstract readonly type: "git" | "svn";

  /**
   * 创建统一SCM提供者实例
   * @param repositoryPath - 可选的仓库路径
   */
  constructor(protected readonly repositoryPath?: string) {
    const hasWorkspace = Array.isArray(vscode.workspace.workspaceFolders) && vscode.workspace.workspaceFolders.length > 0;
    if (!hasWorkspace && !this.repositoryPath) {
      throw new Error(getMessage("workspace.not.found"));
    }
  }

  // 抽象方法 - 需要子类实现
  abstract get scmTypeName(): string;
  abstract getRepositories(): T[];
  abstract getRepoFsPath(repo: T): string | undefined;
  abstract getInputBox(repo: T): { value: string } | undefined;
  abstract executeCommit(repo: T, message: string, files?: string[]): Promise<void>;
  abstract isAvailable(): Promise<boolean>;
  abstract init(): Promise<void>;
  abstract getCommitLog(baseRevision?: string, headRevision?: string): Promise<string[]>;
  abstract getRecentCommitMessages(): Promise<{repository: string[], user: string[]}>;

  /**
   * 获取差异的具体实现
   * 子类可以重写此方法以提供特定的差异获取逻辑
   * @param repositoryPath - 仓库路径
   * @param files - 可选的文件路径数组
   */
  protected async getDiffImpl(repositoryPath: string, files?: string[]): Promise<string | undefined> {
    // 使用统一差异处理器作为默认实现
    return await UnifiedDiffProcessor.getDiff(this.type, repositoryPath, files);
  }

  /**
   * 统一的仓库查找方法
   * @param files - 可选的文件路径数组
   * @returns 匹配的仓库或undefined
   */
  protected findRepository(files?: string[]): T | undefined {
    return UnifiedRepositoryFinder.findRepository(
      this.getRepositories(),
      this.repositoryPath,
      files,
      (repo) => this.getRepoFsPath(repo),
      this.scmTypeName
    );
  }

  /**
   * 统一的差异获取方法
   * @param files - 可选的文件路径数组
   * @returns 差异文本或undefined
   */
  async getDiff(files?: string[]): Promise<string | undefined> {
    try {
      const repository = this.findRepository(files);
      const validatedRepo = UnifiedRepositoryFinder.validateRepository(
        repository, 
        this.scmTypeName,
        "差异获取"
      );
      const currentWorkspaceRoot = this.getRepoFsPath(validatedRepo);
      
      if (!currentWorkspaceRoot) {
        throw new Error(`无法获取${this.scmTypeName}仓库路径`);
      }

      // 使用子类特定的差异获取逻辑
      return await this.getDiffImpl(currentWorkspaceRoot, files);
    } catch (error) {
      return SCMErrorHandler.handleDiffError(this.scmTypeName, error);
    }
  }

  /**
   * 统一的提交方法
   * @param message - 提交信息
   * @param files - 要提交的文件路径数组
   */
  async commit(message: string, files?: string[]): Promise<void> {
    const repository = this.findRepository(files);
    const validatedRepo = UnifiedRepositoryFinder.validateRepository(
      repository, 
      this.scmTypeName, 
      "提交"
    );
    
    try {
      await this.executeCommit(validatedRepo, message, files);
    } catch (error) {
      SCMErrorHandler.handleCommitError(this.scmTypeName, error);
    }
  }

  /**
   * 统一的设置提交输入方法
   * @param message - 要设置的提交信息
   */
  async setCommitInput(message: string): Promise<void> {
    const repository = this.findRepository();
    const inputBox = repository ? this.getInputBox(repository) : undefined;
    
    if (inputBox) {
      inputBox.value = message;
    } else {
      await this.copyToClipboard(message);
    }
  }

  /**
   * 统一的获取提交输入方法
   * @returns 返回当前的提交信息
   */
  async getCommitInput(): Promise<string> {
    const repository = this.findRepository();
    const validatedRepo = UnifiedRepositoryFinder.validateRepository(
      repository, 
      this.scmTypeName, 
      "获取提交信息"
    );
    const inputBox = this.getInputBox(validatedRepo);
    
    if (!inputBox) {
      throw new Error(`${this.scmTypeName} 输入框不可用`);
    }
    
    return inputBox.value;
  }

  /**
   * 统一的流式输入方法
   * @param message - 要设置的提交信息
   */
  async startStreamingInput(message: string): Promise<void> {
    await this.setCommitInput(message);
  }

  /**
   * 统一的剪贴板复制方法
   * @param message 要复制的提交信息
   */
  async copyToClipboard(message: string): Promise<void> {
    await SCMClipboard.copy(message);
  }

  /**
   * 统一的文件设置方法
   * @param files 文件路径列表
   */
  setCurrentFiles(files?: string[]): void {
    // 子类可以重写此方法来存储当前文件列表
  }
}