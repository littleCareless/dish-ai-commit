import { ISCMProvider } from "./scm-provider";
import { formatMessage } from "../utils/i18n";
import { notify } from "../utils/notification/notification-manager";
import { SCMErrorHandler } from "./utils/error-handler";
import { SCMPathHandler } from "./utils/path-handler";
import { SCMCommandExecutor } from "./utils/command-executor";
import { SvnUtils } from "./utils/svn-utils";
import { UnifiedDiffProcessor } from "./utils/unified-diff-processor";
import { SCMClipboard } from "./utils/clipboard";

/**
 * 命令行SVN提供者实现（统一重构版本）
 * 使用共享工具类消除重复代码
 */
export class CliSvnProvider implements ISCMProvider {
  /** SCM类型标识符 */
  readonly type = "svn" as const;

  /** 工作区根目录 */
  private workspaceRoot: string;

  /** SVN路径 */
  private svnPath: string = "svn";

  /** 初始化状态 */
  private initialized: boolean = false;

  /**
   * 创建命令行SVN提供者实例
   * @param workspaceRoot - 工作区根目录
   */
  constructor(workspaceRoot: string) {
    this.workspaceRoot = SCMPathHandler.normalizePath(workspaceRoot);
  }

  /**
   * 初始化Provider
   */
  async init(): Promise<void> {
    try {
      // 尝试获取SVN路径
      const svnPath = await SvnUtils.getSvnPath();
      this.svnPath = svnPath;

      // 验证SVN可执行
      const { stdout } = await SvnUtils.execCommand(
        `"${this.svnPath}" --version`
      );
      const version = stdout.toString().split("\n")[0].trim();
      notify.info(formatMessage("scm.version.detected", ["SVN", version]));

      this.initialized = true;
    } catch (error) {
      // 如果获取SVN路径失败，使用默认的"svn"命令
      console.warn(
        "Failed to get SVN path, using default 'svn' command:",
        error
      );
      this.initialized = true;
    }

    return Promise.resolve();
  }

  /**
   * 检查SVN是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      await SCMCommandExecutor.execute("svn --version", this.workspaceRoot);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取文件差异信息
   */
  async getDiff(files?: string[]): Promise<string | undefined> {
    try {
      return await UnifiedDiffProcessor.getDiff(
        "svn",
        this.workspaceRoot,
        files
      );
    } catch (error) {
      console.error("Failed to get SVN diff:", error);
      return undefined;
    }
  }

  /**
   * 提交更改
   */
  async commit(message: string, files?: string[]): Promise<void> {
    let filePaths = ".";
    if (files && files.length > 0) {
      // 使用 SCMPathHandler 处理和转义文件路径
      const escapedPaths = files.map((file) =>
        SCMPathHandler.escapeShellPath(SCMPathHandler.normalizePath(file))
      );
      filePaths = escapedPaths.join(" ");
    }

    // 转义提交消息
    const escapedMessage = SCMPathHandler.escapeShellPath(message);

    const commitCommand =
      filePaths === "."
        ? `"${this.svnPath}" commit -m ${escapedMessage} .`
        : `"${this.svnPath}" commit -m ${escapedMessage} ${filePaths}`;

    try {
      await SCMCommandExecutor.execute(commitCommand, this.workspaceRoot);
    } catch (error) {
      SCMErrorHandler.handleCommitError("SVN", error);
    }
  }

  /**
   * 设置提交输入框的内容
   */
  async setCommitInput(message: string): Promise<void> {
    await this.copyToClipboard(message);
  }

  /**
   * 获取提交输入框的当前内容
   */
  async getCommitInput(): Promise<string> {
    return "";
  }

  /**
   * 开始流式设置提交输入框的内容
   */
  async startStreamingInput(message: string): Promise<void> {
    await this.copyToClipboard(message);
  }

  /**
   * 获取提交日志
   */
  async getCommitLog(
    baseRevisionInput?: string,
    headRevisionInput: string = "HEAD"
  ): Promise<string[]> {
    try {
      return await SvnUtils.getCommitLog(
        this.svnPath,
        this.workspaceRoot,
        baseRevisionInput,
        headRevisionInput
      );
    } catch (error) {
      console.warn("Failed to get SVN commit log:", error);
      return [];
    }
  }

  /**
   * 获取最近的提交信息
   */
  async getRecentCommitMessages() {
    return SvnUtils.getRecentCommitMessages(this.svnPath, this.workspaceRoot);
  }

  /**
   * 将提交信息复制到剪贴板
   */
  async copyToClipboard(message: string): Promise<void> {
    await SCMClipboard.copy(message);
  }
}
