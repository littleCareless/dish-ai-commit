import * as vscode from "vscode";
import { UnifiedSCMProvider } from "./base/unified-scm-provider";
import { SvnUtils } from "./utils/svn-utils";
import { notify } from "../utils/notification/notification-manager";
import { formatMessage, getMessage } from "../utils/i18n";
import { SCMErrorHandler } from "./utils/error-handler";
import { SCMCommandExecutor } from "./utils/command-executor";
import { SCMConfigManager } from "./utils/config-manager";

/**
 * SVN仓库接口定义
 * 统一SVN仓库的基本结构
 */
export interface SvnRepository {
  rootUri: vscode.Uri;
  inputBox: {
    value: string;
  };
  commitFiles(files: string[], message: string): Promise<void>;
}
/**
 * SVN源代码管理提供者实现（统一重构版本）
 * 使用统一基类消除重复代码
 */
export class SvnProvider extends UnifiedSCMProvider<SvnRepository> {
  /** SCM类型标识符 */
  readonly type = "svn" as const;

  /** SCM类型标识符 - 用于基类 */
  get scmTypeName(): string {
    return "SVN";
  }

  /** SVN API实例 */
  private api: any;

  /** SVN仓库集合 */
  private repositories: SvnRepository[];

  /** 存储 SVN 路径 */
  private svnPath: string = "svn";

  private config: any;
  private initialized: boolean = false;

  /**
   * 创建SVN提供者实例
   * @param svnExtension - VS Code SVN扩展实例
   * @param repositoryPath - 可选的仓库路径
   */
  constructor(private readonly svnExtension: any, repositoryPath?: string) {
    super(repositoryPath);
    this.api = svnExtension.getAPI(1);
    this.repositories = this.api.repositories;
    this.config = SvnUtils.loadConfig();
  }

  /**
   * 初始化Provider
   */
  async init(): Promise<void> {
    try {
      const svnPath = await SCMConfigManager.getSvnPath("initialize");
      this.svnPath = svnPath;

      // 验证SVN可执行
      const { stdout } = await SCMCommandExecutor.executeSvn(
        this.svnPath,
        "--version",
        this.repositoryPath || ""
      );
      const version = stdout.toString().split("\n")[0].trim();
      notify.info(formatMessage("scm.version.detected", ["SVN", version]));

      this.initialized = true;
    } catch (error) {
      SCMErrorHandler.handleInitError(this.scmTypeName, error);
    }
  }

  /**
   * 获取所有SVN仓库
   */
  getRepositories(): SvnRepository[] {
    return this.repositories;
  }

  /**
   * 获取仓库的文件系统路径
   */
  getRepoFsPath(repo: SvnRepository): string | undefined {
    return (repo as any).root || repo.rootUri.fsPath;
  }

  /**
   * 获取仓库的输入框
   */
  getInputBox(repo: SvnRepository): { value: string } | undefined {
    return repo.inputBox;
  }

  /**
   * 执行提交操作
   */
  async executeCommit(
    repo: SvnRepository,
    message: string,
    files?: string[]
  ): Promise<void> {
    if (!files?.length) {
      SCMErrorHandler.handleError(
        this.scmTypeName,
        "提交",
        new Error(getMessage("svn.no.files.selected"))
      );
    }
    await repo.commitFiles(files, message);
  }

  /**
   * 检查SVN是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (!this.svnExtension?.getAPI) {
        return false;
      }

      const api = this.svnExtension.getAPI(1);
      const repositories = api.repositories;
      if (repositories.length > 0) {
        this.api = api;
        this.repositories = repositories;
        return true;
      }
      return false;
    } catch (error) {
      console.error(
        "SVN availability check failed:",
        error instanceof Error ? error.message : error
      );
      return false;
    }
  }

  /**
   * 获取提交日志
   */
  async getCommitLog(
    baseRevisionInput?: string,
    headRevisionInput: string = "HEAD"
  ): Promise<string[]> {
    if (!this.initialized) {
      SCMErrorHandler.handleError(
        this.scmTypeName,
        "获取提交日志",
        new Error(getMessage("svn.not.initialized"))
      );
    }

    const repository = this.findRepository();
    const validatedRepo = SCMErrorHandler.validateRepository(
      repository,
      this.scmTypeName,
      "获取提交日志"
    );

    const repositoryPath = this.getRepoFsPath(validatedRepo);
    const validatedPath = SCMErrorHandler.validatePath(
      repositoryPath,
      this.scmTypeName,
      "获取提交日志"
    );

    return SvnUtils.getCommitLog(
      this.svnPath,
      validatedPath,
      baseRevisionInput,
      headRevisionInput
    );
  }

  /**
   * 获取最近的提交信息
   */
  async getRecentCommitMessages(): Promise<{
    repository: string[];
    user: string[];
  }> {
    const repository = this.findRepository();
    if (!repository) {
      return { repository: [], user: [] };
    }

    const repositoryPath = this.getRepoFsPath(repository);
    if (!repositoryPath) {
      return { repository: [], user: [] };
    }

    return SvnUtils.getRecentCommitMessages(this.svnPath, repositoryPath);
  }

  /**
   * 获取环境配置
   * @private
   */
  private getEnvironmentConfig() {
    return SvnUtils.getEnvironmentConfig(this.config);
  }
}
