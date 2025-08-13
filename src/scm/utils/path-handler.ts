import * as path from "path";
import * as fs from "fs";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { SCMErrorHandler } from "./error-handler";

/**
 * SCM统一路径处理工具类
 * 提供所有SCM提供者共享的路径处理功能
 * 整合了原 SCMCommonUtils 和 SCMPathHandler 的所有路径处理功能
 */
export class SCMPathHandler {
  // Windows长路径前缀
  private static readonly WINDOWS_LONG_PATH_PREFIX = "\\\\?\\";
  // Windows最大路径长度（不含长路径前缀）
  private static readonly WINDOWS_MAX_PATH = 260;

  /**
   * 检查路径是否为绝对路径（跨平台）
   * @param filePath 要检查的路径
   * @returns 是否为绝对路径
   */
  static isAbsolute(filePath: string): boolean {
    if (!filePath) {
      return false;
    }

    if (process.platform === "win32") {
      // Windows: 检查驱动器盘符或UNC路径
      return (
        /^([a-zA-Z]:[\\/]|\\\\)/.test(filePath) ||
        filePath.startsWith(this.WINDOWS_LONG_PATH_PREFIX)
      );
    } else {
      // Unix-like: 检查是否以/开头
      return filePath.startsWith("/");
    }
  }

  /**
   * 将相对路径转换为绝对路径
   * @param relativePath 相对路径
   * @param basePath 基础路径（可选，默认为当前工作目录）
   * @returns 绝对路径
   */
  static toAbsolute(relativePath: string, basePath?: string): string {
    if (this.isAbsolute(relativePath)) {
      return relativePath;
    }

    const base = basePath || process.cwd();

    // 处理特殊情况
    if (relativePath === ".") {
      return base;
    } else if (relativePath === "..") {
      return path.dirname(base);
    }

    return path.resolve(base, relativePath);
  }

  /**
   * 处理Windows长路径
   * @param filePath 文件路径
   * @returns 处理后的路径
   */
  static handleLongPath(filePath: string): string {
    if (process.platform !== "win32") {
      return filePath;
    }

    const absolutePath = this.toAbsolute(filePath);

    // 如果路径长度超过Windows限制且没有长路径前缀，添加前缀
    if (
      absolutePath.length > this.WINDOWS_MAX_PATH &&
      !absolutePath.startsWith(this.WINDOWS_LONG_PATH_PREFIX)
    ) {
      return this.WINDOWS_LONG_PATH_PREFIX + absolutePath;
    }

    return absolutePath;
  }

  /**
   * 安全的文件存在性检查
   * @param filePath 文件路径
   * @returns 文件是否存在
   */
  static safeExists(filePath: string): boolean {
    try {
      const processedPath = this.handleLongPath(filePath);
      return fs.existsSync(processedPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * 改进的工作区根目录查找
   * @param startPath 开始查找的路径
   * @param markers 标记文件/目录名称数组
   * @returns 工作区根目录路径或undefined
   */
  static findWorkspaceRoot(
    startPath: string,
    markers: string[]
  ): string | undefined {
    if (!startPath || typeof startPath !== "string") {
      return undefined;
    }

    const normalizedStartPath = this.normalizePath(startPath);
    let currentPath = normalizedStartPath;

    while (currentPath !== path.dirname(currentPath)) {
      for (const marker of markers) {
        const markerPath = path.join(currentPath, marker);
        if (this.safeExists(markerPath)) {
          return this.normalizePath(currentPath);
        }
      }
      currentPath = path.dirname(currentPath);
    }

    return undefined;
  }

  /**
   * 路径标准化处理
   * @param p 要标准化的路径
   * @returns 标准化后的路径
   */
  static normalizePath(p: string): string {
    if (!p) {
      return p;
    }

    // 处理Windows长路径前缀
    let hasLongPathPrefix = false;
    let pathWithoutPrefix = p;

    if (
      process.platform === "win32" &&
      p.startsWith(this.WINDOWS_LONG_PATH_PREFIX)
    ) {
      hasLongPathPrefix = true;
      pathWithoutPrefix = p.substring(this.WINDOWS_LONG_PATH_PREFIX.length);
    }

    // 标准化路径分隔符
    let normalized = pathWithoutPrefix.replace(/[\\/]/g, path.sep);

    // 处理相对路径
    if (!this.isAbsolute(normalized)) {
      normalized = path.resolve(normalized);
    }

    // 移除尾部的路径分隔符（除非是根目录）
    if (normalized.length > 1 && normalized.endsWith(path.sep)) {
      normalized = normalized.slice(0, -1);
    }

    // 重新添加长路径前缀（如果需要）
    if (hasLongPathPrefix && process.platform === "win32") {
      normalized = this.WINDOWS_LONG_PATH_PREFIX + normalized;
    }

    return normalized;
  }

  /**
   * 转义Shell路径
   * @param filePath 文件路径
   * @returns 转义后的路径
   */
  static escapeShellPath(filePath: string): string {
    if (!filePath) {
      return filePath;
    }

    // 处理Windows路径
    if (process.platform === "win32") {
      // 转义特殊字符
      let escaped = filePath.replace(/"/g, '\\"');

      // 如果路径包含空格或特殊字符，用双引号包围
      if (escaped.includes(" ") || /[&|<>^]/.test(escaped)) {
        escaped = `"${escaped}"`;
      }

      return escaped;
    } else {
      // Unix-like系统
      // 转义特殊字符
      let escaped = filePath.replace(/([\\'";&|<>^$`\s])/g, "\\$1");

      // 如果路径包含空格或特殊字符，用单引号包围
      if (escaped.includes(" ") || /[&|<>^$`]/.test(escaped)) {
        escaped = `'${escaped}'`;
      }

      return escaped;
    }
  }

  /**
   * 创建临时文件路径
   * @param prefix 文件名前缀
   * @param extension 文件扩展名
   * @returns 临时文件路径
   */
  static createTempFilePath(
    prefix: string = "temp",
    extension: string = ""
  ): string {
    const timestamp = Date.now();
    const random = randomBytes(4).toString("hex");
    const filename = `${prefix}-${timestamp}-${random}${extension}`;
    return path.join(tmpdir(), filename);
  }

  /**
   * 验证路径是否有效
   * @param filePath 文件路径
   * @returns 路径是否有效
   */
  static isValidPath(filePath: string): boolean {
    if (!filePath || typeof filePath !== "string") {
      return false;
    }

    try {
      // 检查路径是否包含非法字符
      const illegalChars = process.platform === "win32" ? /[<>:"|?*]/ : /[\0]/;

      if (illegalChars.test(filePath)) {
        return false;
      }

      // 检查路径长度
      const maxLength = process.platform === "win32" ? 260 : 4096;
      if (filePath.length > maxLength) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 验证并获取有效路径
   * @param filePath 文件路径
   * @param scmType SCM类型名称
   * @param operation 操作名称
   * @returns 验证后的路径
   * @throws {Error} 当路径无效时抛出错误
   */
  static validateAndGetPath(
    filePath: string,
    scmType: string,
    operation: string = "操作"
  ): string {
    if (!this.isValidPath(filePath)) {
      SCMErrorHandler.handleError(
        scmType,
        operation,
        new Error(`无效的路径: ${filePath}`)
      );
    }
    return this.normalizePath(filePath);
  }

  /**
   * 检查文件是否在仓库中
   * @param filePath 文件路径
   * @param repoPath 仓库路径
   * @returns 文件是否在仓库中
   */
  static isFileInRepository(filePath: string, repoPath: string): boolean {
    const normalizedRepoPath = this.normalizePath(repoPath);
    const normalizedFilePath = this.normalizePath(filePath);
    return normalizedFilePath.startsWith(normalizedRepoPath);
  }

  /**
   * 获取相对路径
   * @param filePath 文件路径
   * @param basePath 基础路径
   * @returns 相对路径
   */
  static getRelativePath(filePath: string, basePath: string): string {
    const normalizedBasePath = this.normalizePath(basePath);

    // 若传入的是相对路径，应当以 basePath 为基准进行解析，
    // 而不是使用进程的工作目录（process.cwd()），避免跨仓库解析错误
    const absoluteFilePath = this.isAbsolute(filePath)
      ? this.normalizePath(filePath)
      : this.normalizePath(path.join(normalizedBasePath, filePath));

    // 计算相对路径
    let relativePath = path.relative(normalizedBasePath, absoluteFilePath);

    // 去除可能出现的前缀 './'
    if (relativePath.startsWith(`.${path.sep}`)) {
      relativePath = relativePath.slice(2);
    }

    return relativePath;
  }

  /**
   * 合并路径
   * @param basePath 基础路径
   * @param relativePath 相对路径
   * @returns 合并后的路径
   */
  static joinPath(basePath: string, relativePath: string): string {
    return this.normalizePath(path.join(basePath, relativePath));
  }

  /**
   * 获取目录名
   * @param filePath 文件路径
   * @returns 目录名
   */
  static getDirName(filePath: string): string {
    return this.normalizePath(path.dirname(filePath));
  }

  /**
   * 获取文件名
   * @param filePath 文件路径
   * @returns 文件名
   */
  static getFileName(filePath: string): string {
    return path.basename(filePath);
  }

  /**
   * 获取文件扩展名
   * @param filePath 文件路径
   * @returns 文件扩展名
   */
  static getFileExtension(filePath: string): string {
    return path.extname(filePath);
  }

  /**
   * 创建标准化的执行选项
   * @param workingDirectory 工作目录
   * @param additionalOptions 额外选项
   * @returns 执行选项对象
   */
  static createExecOptions(
    workingDirectory: string,
    additionalOptions: any = {}
  ): any {
    return {
      cwd: this.normalizePath(workingDirectory),
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      encoding: "utf8" as const,
      ...additionalOptions,
    };
  }

  /**
   * 解析文件状态的通用方法
   * @param statusOutput - 状态命令的输出
   * @param scmType - SCM类型（git或svn）
   * @returns 解析后的文件状态
   */
  static parseFileStatus(statusOutput: string, scmType: "git" | "svn"): string {
    if (!statusOutput.trim()) {
      return "Unknown";
    }

    const statusStr = statusOutput.toString().trim();

    if (scmType === "git") {
      // git porcelain 输出开头两列为 XY 状态位
      // 例如：" M file", "R  old -> new", "?? file"
      if (statusStr.startsWith("??")) {
        return "New File";
      }

      const xy = statusStr.length >= 2 ? statusStr.slice(0, 2) : statusStr;
      const has = (ch: string) => xy.indexOf(ch) !== -1;

      if (has("R")) {
        return "Renamed File";
      }
      if (has("C")) {
        return "Copied File";
      }
      if (has("D")) {
        return "Deleted File";
      }
      if (has("A")) {
        return "Added File";
      }
      if (has("M")) {
        return "Modified File";
      }

      // 兼容性兜底：旧实现的前缀判断
      if (statusStr.startsWith("A ")) {
        return "Added File";
      }
      if (statusStr.startsWith(" D") || statusStr.startsWith("D ")) {
        return "Deleted File";
      }
      if (statusStr.startsWith("M ") || statusStr.startsWith(" M")) {
        return "Modified File";
      }
      if (statusStr.startsWith("R ")) {
        return "Renamed File";
      }
      if (statusStr.startsWith("C ")) {
        return "Copied File";
      }
      return "Modified File";
    } else if (scmType === "svn") {
      if (statusStr.startsWith("?")) {
        return "New File";
      }
      if (statusStr.startsWith("A")) {
        return "Added File";
      }
      if (statusStr.startsWith("D")) {
        return "Deleted File";
      }
      if (statusStr.startsWith("M")) {
        return "Modified File";
      }
      if (statusStr.startsWith("R")) {
        return "Replaced File";
      }
      if (statusStr.startsWith("C")) {
        return "Conflicted File";
      }
      return "Modified File";
    }

    return "Unknown";
  }

  /**
   * 格式化差异输出的通用方法
   * @param fileStatus - 文件状态
   * @param filePath - 文件路径
   * @param diffContent - 差异内容
   * @returns 格式化后的差异输出
   */
  static formatDiffOutput(
    fileStatus: string,
    filePath: string,
    diffContent: string
  ): string {
    const trimmed = diffContent.trim();
    if (!trimmed) {
      // 对于重命名或删除，内容 diff 可能为空，但仍需展示头部信息以体现状态
      if (fileStatus === 'Deleted File' || fileStatus === 'Renamed File') {
        return `\n=== ${fileStatus}: ${filePath} ===\n`;
      }
      return "";
    }
    return `\n=== ${fileStatus}: ${filePath} ===\n${diffContent}`;
  }
}
