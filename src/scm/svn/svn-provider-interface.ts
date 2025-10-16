import * as vscode from "vscode";

/**
 * SVN API接口定义
 */
export interface SvnAPI {
  repositories: SvnRepository[];
  getAPI(version: number): SvnAPI;
}

/**
 * SVN仓库接口定义
 */
export interface SvnRepository {
  rootUri: vscode.Uri;
  inputBox: {
    value: string;
  };
  commitFiles(files: string[], message: string): Promise<void>;
}

/**
 * SVN配置接口定义
 */
export interface SvnConfig {
  svnPath?: string;
  environmentConfig: {
    path: string[];
    locale: string;
  };
}

/**
 * SVN提供者接口
 * 定义了所有SVN操作的通用接口
 */
export interface ISvnProvider {
  /**
   * 初始化SVN提供者
   */
  init(): Promise<void>;

  /**
   * 检查SVN是否可用
   * @returns 如果SVN可用返回true，否则返回false
   */
  isAvailable(): Promise<boolean>;

  /**
   * 获取文件差异
   * @param files 可选的文件路径数组
   * @returns 差异文本
   */
  getDiff(files?: string[]): Promise<string | undefined>;

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
   * @param baseRevisionInput 基础修订版本，可选
   * @param headRevisionInput 当前修订版本，默认为 'HEAD'
   * @returns 提交信息列表
   */
  getCommitLog(baseRevisionInput?: string, headRevisionInput?: string): Promise<string[]>;

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
}
