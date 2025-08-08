import * as fs from "fs";
import { SCMErrorHandler } from "./error-handler";
import { SCMPathHandler } from "./path-handler";
import { SCMCommandExecutor } from "./command-executor";
import { SCMConfigManager } from "./config-manager";
import { notify } from "../../utils/notification/notification-manager";
import { formatMessage, getMessage } from "../../utils/i18n";

/**
 * 差异处理器基类
 * 抽象出差异处理的通用逻辑，让Git和SVN提供者继承此基类
 */
export abstract class BaseDiffProcessor {
  /**
   * 获取差异
   * @param repositoryPath 仓库路径
   * @param files 文件路径数组
   * @returns 差异文本
   */
  abstract getDiff(repositoryPath: string, files?: string[]): Promise<string>;

  /**
   * 获取文件状态
   * @param filePath 文件路径
   * @param repositoryPath 仓库路径
   * @returns 文件状态
   */
  abstract getFileStatus(filePath: string, repositoryPath: string): Promise<string>;

  /**
   * 获取文件差异内容
   * @param filePath 文件路径
   * @param fileStatus 文件状态
   * @param repositoryPath 仓库路径
   * @returns 差异内容
   */
  abstract getFileDiff(filePath: string, fileStatus: string, repositoryPath: string): Promise<string>;

  /**
   * 格式化差异输出
   * @param status 文件状态
   * @param filePath 文件路径
   * @param content 差异内容
   * @returns 格式化后的差异输出
   */
  protected formatDiffOutput(status: string, filePath: string, content: string): string {
    return SCMPathHandler.formatDiffOutput(status, filePath, content);
  }

  /**
   * 处理多个文件的差异
   * @param files 文件路径数组
   * @param repositoryPath 仓库路径
   * @returns 合并后的差异输出
   */
  async processFilesDiff(files: string[], repositoryPath: string): Promise<string> {
    let diffOutput = "";
    
    notify.info(formatMessage("diff.files.selected", [files.length]));
    
    for (const file of files) {
      const fileStatus = await this.getFileStatus(file, repositoryPath);
      const diffContent = await this.getFileDiff(file, fileStatus, repositoryPath);
      
      if (diffContent.trim() || fileStatus === "Deleted File") {
        diffOutput += this.formatDiffOutput(fileStatus, file, diffContent);
      }
    }
    
    return diffOutput;
  }

  /**
   * 获取差异目标配置
   * @returns 差异目标
   */
  protected getDiffTarget(): string {
    return SCMConfigManager.getDiffTarget();
  }

  /**
   * 检查是否启用差异简化
   * @returns 是否启用
   */
  protected isDiffSimplificationEnabled(): boolean {
    return SCMConfigManager.isDiffSimplificationEnabled();
  }

  /**
   * 处理差异简化
   * @param diffContent 原始差异内容
   * @returns 简化后的差异内容
   */
  protected processDiffSimplification(diffContent: string): string {
    if (this.isDiffSimplificationEnabled()) {
      notify.warn("diff.simplification.warning");
      // 这里可以调用具体的简化逻辑
      return this.simplifyDiff(diffContent);
    }
    return diffContent;
  }

  /**
   * 简化差异内容（子类可以重写）
   * @param diffContent 原始差异内容
   * @returns 简化后的差异内容
   */
  protected simplifyDiff(diffContent: string): string {
    // 默认实现：移除空行和注释行
    return diffContent
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .join('\n');
  }

  /**
   * 验证文件路径
   * @param filePath 文件路径
   * @param scmType SCM类型名称
   * @returns 验证后的路径
   */
  protected validateFilePath(filePath: string, scmType: string): string {
    return SCMPathHandler.validateAndGetPath(filePath, scmType, "差异处理");
  }

  /**
   * 验证仓库路径
   * @param repositoryPath 仓库路径
   * @param scmType SCM类型名称
   * @returns 验证后的路径
   */
  protected validateRepositoryPath(repositoryPath: string, scmType: string): string {
    return SCMPathHandler.validateAndGetPath(repositoryPath, scmType, "差异处理");
  }

  /**
   * 处理差异获取错误
   * @param scmType SCM类型名称
   * @param error 错误对象
   * @returns undefined 表示无差异
   */
  protected handleDiffError(scmType: string, error: unknown): undefined {
    return SCMErrorHandler.handleDiffError(scmType, error);
  }

  /**
   * 创建临时文件用于差异比较
   * @param content 文件内容
   * @param prefix 文件名前缀
   * @returns 临时文件路径
   */
  protected createTempFileForDiff(content: string = "", prefix: string = "temp-diff"): string {
    const tempFilePath = SCMPathHandler.createTempFilePath(prefix);
    fs.writeFileSync(tempFilePath, content);
    return tempFilePath;
  }

  /**
   * 清理临时文件
   * @param tempFilePath 临时文件路径
   */
  protected cleanupTempFile(tempFilePath: string): void {
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (error) {
      // 忽略清理错误
      console.warn("Failed to cleanup temp file:", tempFilePath, error);
    }
  }

  /**
   * 获取文件内容
   * @param filePath 文件路径
   * @returns 文件内容
   */
  protected getFileContent(filePath: string): string {
    try {
      return fs.readFileSync(filePath, "utf8");
    } catch (error) {
      SCMErrorHandler.handleError("SCM", "文件读取", error);
    }
  }

  /**
   * 检查文件是否存在
   * @param filePath 文件路径
   * @returns 文件是否存在
   */
  protected fileExists(filePath: string): boolean {
    return SCMPathHandler.safeExists(filePath);
  }

  /**
   * 转义文件路径
   * @param filePath 文件路径
   * @returns 转义后的路径
   */
  protected escapeFilePath(filePath: string): string {
    return SCMPathHandler.escapeShellPath(filePath);
  }

  /**
   * 获取相对路径
   * @param filePath 文件路径
   * @param basePath 基础路径
   * @returns 相对路径
   */
  protected getRelativePath(filePath: string, basePath: string): string {
    return SCMPathHandler.getRelativePath(filePath, basePath);
  }

  /**
   * 合并路径
   * @param basePath 基础路径
   * @param relativePath 相对路径
   * @returns 合并后的路径
   */
  protected joinPath(basePath: string, relativePath: string): string {
    return SCMPathHandler.joinPath(basePath, relativePath);
  }
}
