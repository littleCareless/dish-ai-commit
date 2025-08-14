import * as path from "path";
import { ImprovedPathUtils } from "./improved-path-utils";
import { SCMLogger } from "./scm-logger";

/**
 * 路径处理工具类
 * 扩展ImprovedPathUtils，提供SCM特定的路径处理功能
 */
export class PathUtils extends ImprovedPathUtils {
  /**
   * 批量规范化文件路径
   * @param files 文件路径数组
   * @returns 规范化后的路径数组
   */
  static normalizeFilePaths(files: string[]): string[] {
    return files
      .filter(file => this.isValidPath(file))
      .map(file => this.normalizePath(file));
  }

  /**
   * 批量转义shell路径
   * @param files 文件路径数组
   * @returns 转义后的路径数组
   */
  static escapeShellPaths(files: string[]): string[] {
    return files.map(file => this.escapeShellPath(file));
  }

  /**
   * 获取文件的相对路径（相对于工作区根目录）
   * @param filePath 文件绝对路径
   * @param workspaceRoot 工作区根目录
   * @returns 相对路径
   */
  static getRelativePath(filePath: string, workspaceRoot: string): string {
    try {
      const normalizedFile = this.normalizePath(filePath);
      const normalizedRoot = this.normalizePath(workspaceRoot);
      
      if (normalizedFile.startsWith(normalizedRoot)) {
        return path.relative(normalizedRoot, normalizedFile);
      }
      
      return normalizedFile;
    } catch (error) {
      SCMLogger.warn("Failed to get relative path:", error);
      return filePath;
    }
  }

  /**
   * 检查文件是否在指定目录下
   * @param filePath 文件路径
   * @param directoryPath 目录路径
   * @returns 如果文件在目录下返回true
   */
  static isFileInDirectory(filePath: string, directoryPath: string): boolean {
    try {
      const normalizedFile = this.normalizePath(filePath);
      const normalizedDir = this.normalizePath(directoryPath);
      
      return normalizedFile.startsWith(normalizedDir + path.sep) || 
             normalizedFile === normalizedDir;
    } catch (error) {
      SCMLogger.warn("Failed to check if file is in directory:", error);
      return false;
    }
  }

  /**
   * 获取文件路径的公共父目录
   * @param filePaths 文件路径数组
   * @returns 公共父目录路径
   */
  static getCommonParentDirectory(filePaths: string[]): string | undefined {
    if (filePaths.length === 0) {
      return undefined;
    }

    if (filePaths.length === 1) {
      return path.dirname(this.normalizePath(filePaths[0]));
    }

    try {
      const normalizedPaths = filePaths.map(file => this.normalizePath(file));
      let commonPath = path.dirname(normalizedPaths[0]);

      for (let i = 1; i < normalizedPaths.length; i++) {
        const currentDir = path.dirname(normalizedPaths[i]);
        
        // 找到两个路径的公共前缀
        while (!currentDir.startsWith(commonPath) && !commonPath.startsWith(currentDir)) {
          const parentPath = path.dirname(commonPath);
          if (parentPath === commonPath) {
            // 已到达根目录
            break;
          }
          commonPath = parentPath;
        }

        // 选择较短的路径作为公共路径
        if (currentDir.length < commonPath.length && commonPath.startsWith(currentDir)) {
          commonPath = currentDir;
        }
      }

      return commonPath;
    } catch (error) {
      SCMLogger.warn("Failed to get common parent directory:", error);
      return undefined;
    }
  }

  /**
   * 创建用于临时文件的安全路径
   * @param baseName 基础文件名
   * @param workspaceRoot 工作区根目录（可选）
   * @returns 临时文件路径
   */
  static createSafeTempPath(baseName: string, workspaceRoot?: string): string {
    const safeName = baseName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const tempFileName = `${safeName}_${timestamp}`;
    
    if (workspaceRoot) {
      return path.join(this.normalizePath(workspaceRoot), '.tmp', tempFileName);
    }
    
    return this.createTempFilePath(tempFileName);
  }

  /**
   * 验证路径列表的有效性
   * @param paths 路径数组
   * @returns 验证结果 {valid: 有效路径数组, invalid: 无效路径数组}
   */
  static validatePaths(paths: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const pathItem of paths) {
      if (this.isValidPath(pathItem)) {
        valid.push(pathItem);
      } else {
        invalid.push(pathItem);
        SCMLogger.warn("Invalid path detected:", pathItem);
      }
    }

    return { valid, invalid };
  }

  /**
   * 解析和清理文件路径列表
   * 移除重复、无效路径，并进行规范化
   * @param paths 原始路径数组
   * @returns 清理后的路径数组
   */
  static cleanupPaths(paths: string[]): string[] {
    const { valid } = this.validatePaths(paths);
    const normalizedPaths = valid.map(p => this.normalizePath(p));
    
    // 去重
    const uniquePaths = [...new Set(normalizedPaths)];
    
    // 移除被其他路径包含的路径（比如如果有/a/b和/a，则移除/a/b）
    const filteredPaths: string[] = [];
    
    for (const currentPath of uniquePaths) {
      const isContained = uniquePaths.some(otherPath => {
        return otherPath !== currentPath && 
               currentPath.startsWith(otherPath + path.sep);
      });
      
      if (!isContained) {
        filteredPaths.push(currentPath);
      }
    }
    
    return filteredPaths.sort();
  }

  /**
   * 检查路径是否指向一个SCM相关的目录（.git, .svn等）
   * @param filePath 文件路径
   * @returns 如果是SCM目录返回true
   */
  static isScmDirectory(filePath: string): boolean {
    const scmDirs = ['.git', '.svn', '.hg', '.bzr'];
    const basename = path.basename(this.normalizePath(filePath));
    return scmDirs.includes(basename);
  }

  /**
   * 从文件路径中移除SCM相关的目录
   * @param paths 文件路径数组
   * @returns 过滤后的路径数组
   */
  static filterOutScmDirectories(paths: string[]): string[] {
    return paths.filter(filePath => {
      const pathParts = this.normalizePath(filePath).split(path.sep);
      return !pathParts.some(part => ['.git', '.svn', '.hg', '.bzr'].includes(part));
    });
  }

  /**
   * 创建安全的glob模式用于文件匹配
   * @param pattern 原始模式
   * @returns 安全的glob模式
   */
  static createSafeGlobPattern(pattern: string): string {
    // 移除可能危险的字符，保留glob通配符
    return pattern.replace(/[;&|`$\\]/g, '');
  }
}