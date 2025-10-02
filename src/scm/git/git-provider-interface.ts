import * as vscode from "vscode";

/**
 * Git 提供者接口
 * 定义了所有 Git 操作的通用接口，使不同实现（API或命令行）可以互换
 */
export interface IGitProvider {
  /**
   * 初始化 Git 提供者
   */
  init(): Promise<void>;

  /**
   * 检查 Git 是否可用
   * @returns 如果 Git 可用返回 true，否则返回 false
   */
  isAvailable(): Promise<boolean>;

  /**
   * 获取文件差异
   * @param files 可选的文件路径数组
   * @param target 差异目标: 
   *   - 'staged': 只获取暂存区的更改 
   *   - 'all': 获取所有更改
   *   - 'auto': 先检查暂存区，如果暂存区有文件则获取暂存区的更改，否则获取所有更改
   * @returns 差异文本
   */
  getDiff(files?: string[], target?: "staged" | "all" | "auto"): Promise<string | undefined>;

  /**
   * 提交更改
   * @param message 提交信息
   * @param files 可选的要提交的文件路径数组
   */
  commit(message: string, files?: string[]): Promise<void>;

  /**
   * 设置提交输入框的内容
   * @param message 要设置的提交信息
   */
  setCommitInput(message: string): Promise<void>;

  /**
   * 获取提交输入框的当前内容
   * @returns 当前的提交信息
   */
  getCommitInput(): Promise<string>;

  /**
   * 开始流式设置提交输入框的内容
   * @param message 要设置的提交信息
   */
  startStreamingInput(message: string): Promise<void>;

  /**
   * 获取提交日志
   * @param baseBranch 基础分支，默认为 'origin/main'
   * @param headBranch 当前分支，默认为 'HEAD'
   * @returns 提交信息列表
   */
  getCommitLog(baseBranch?: string, headBranch?: string): Promise<string[]>;

  /**
   * 获取所有本地和远程分支的列表
   * @returns 分支名称列表
   */
  getBranches(): Promise<string[]>;

  /**
   * 获取最近的提交消息
   * @returns 仓库和用户的最近提交消息
   */
  getRecentCommitMessages(): Promise<{ repository: string[]; user: string[] }>;

  /**
   * 将提交信息复制到剪贴板
   * @param message 要复制的提交信息
   */
  copyToClipboard(message: string): Promise<void>;

  /**
   * 获取暂存文件列表
   * @returns 暂存文件路径数组
   */
  getStagedFiles(): Promise<string[]>;

  /**
   * 获取所有变更文件列表
   * @returns 所有变更文件路径数组
   */
  getAllChangedFiles(): Promise<string[]>;
}