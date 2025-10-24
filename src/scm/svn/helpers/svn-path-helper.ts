import { platform } from "os";
import * as path from "path";
import * as fs from "fs";

/**
 * SVN路径处理帮助类
 * 提供路径标准化、转义等操作
 */
export class SvnPathHelper {
  /**
   * 标准化路径，转换路径分隔符为当前系统格式
   * @param filePath 文件路径
   * @returns 标准化后的路径
   */
  static normalizePath(filePath: string): string {
    if (!filePath) return filePath;
    
    // 替换路径分隔符为当前系统格式
    return filePath.replace(/[\\/]/g, path.sep);
  }

  /**
   * 转义用于Shell命令的路径，防止命令注入
   * @param input 需要转义的字符串
   * @returns 转义后的字符串
   */
  static escapeShellPath(input: string): string {
    if (!input) return input;
    
    if (platform() === "win32") {
      // Windows: 使用双引号包围路径，并转义其中的双引号
      return `"${input.replace(/"/g, '\\"')}"`;
    } else {
      // Unix-like: 转义空格、引号和其他特殊字符
      return `'${input.replace(/'/g, "'\\''")}'`;
    }
  }

  /**
   * 创建用于执行命令的选项对象
   * @param cwd 工作目录
   * @returns 包含工作目录的exec选项
   */
  static createExecOptions(cwd: string): { cwd: string; maxBuffer?: number } {
    return {
      cwd,
      maxBuffer: 10 * 1024 * 1024 // 10MB 缓冲区，处理大型仓库
    };
  }

  /**
   * 获取SVN可执行文件的路径
   * 根据操作系统自动选择
   * @param operation 操作名称，用于日志
   * @returns SVN可执行文件路径
   */
  static async getSvnPath(operation = "operation"): Promise<string> {
    // 默认的SVN可执行文件路径
    const defaultSvnPath = platform() === "win32" ? "svn.exe" : "svn";
    
    // 可能的SVN安装位置
    const possiblePaths = [
      defaultSvnPath,
      "/usr/local/bin/svn",
      "/opt/homebrew/bin/svn",
      "C:\\Program Files\\TortoiseSVN\\bin\\svn.exe",
    ];
    
    // 尝试找到可用的SVN路径
    for (const svnPath of possiblePaths) {
      try {
        // 检查文件是否存在（对于绝对路径）
        if (svnPath !== defaultSvnPath && !fs.existsSync(svnPath)) {
          continue;
        }
        return svnPath;
      } catch (error) {
        // 继续尝试下一个路径
      }
    }
    
    // 如果没有找到，返回默认路径
    return defaultSvnPath;
  }

  /**
   * 获取环境配置对象
   * @param config 环境配置
   * @returns 处理后的环境配置对象
   */
  static getEnvironmentConfig(config: { path: string[], locale: string }): NodeJS.ProcessEnv {
    if (!config || !Array.isArray(config.path) || !config.locale) {
      throw new Error("无效的环境配置");
    }
    
    // 获取合适的PATH环境变量名
    const pathKey = platform() === "win32" ? "Path" : "PATH";
    const currentPath = process.env[pathKey] || "";
    
    return {
      ...process.env,
      [pathKey]: `${currentPath}${path.delimiter}${config.path.join(path.delimiter)}`,
      LC_ALL: config.locale,
      LANG: config.locale
    };
  }
}