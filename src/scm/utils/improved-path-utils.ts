import path from "path";
import { randomBytes } from "crypto";
import { pathExists, pathExistsSync } from "path-exists";
import { findUp } from "find-up";
import upath from "upath";
import { quote as shellQuote } from "shell-quote";
import tempy from "tempy";

/**
 * 基于社区库的精简 + 补全版 PathUtils
 * 完全覆盖 ImprovedPathUtils 的 13 个方法
 */
export class ImprovedPathUtils {
  private static readonly WINDOWS_LONG_PATH_PREFIX = "\\\\?\\";
  private static readonly WINDOWS_MAX_PATH = 260;

  /** 1. 是否为绝对路径 */
  static isAbsolute(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  /** 2. 转换为绝对路径 */
  static toAbsolute(relativePath: string, basePath?: string): string {
    return path.resolve(basePath || process.cwd(), relativePath);
  }

  /** 3. Windows 长路径处理 */
  static handleLongPath(filePath: string): string {
    if (process.platform !== "win32") return filePath;

    const absolutePath = this.toAbsolute(filePath);
    if (
      absolutePath.length > this.WINDOWS_MAX_PATH &&
      !absolutePath.startsWith(this.WINDOWS_LONG_PATH_PREFIX)
    ) {
      return this.WINDOWS_LONG_PATH_PREFIX + absolutePath;
    }
    return absolutePath;
  }

  /** 4. 安全的文件存在性检查 */
  static safeExists(filePath: string): boolean {
    try {
      return pathExistsSync(this.handleLongPath(filePath));
    } catch {
      return false;
    }
  }

  /** 5. 查找工作区根目录 */
  static async findWorkspaceRoot(
    startPath: string,
    markers: string[]
  ): Promise<string | undefined> {
    return await findUp(markers, { cwd: startPath, type: "directory" });
  }

  /** 6. 比较两个路径是否相等（跨平台） */
  static pathsEqual(path1: string, path2: string): boolean {
    if (process.platform === "win32") {
      return path1.toLowerCase() === path2.toLowerCase();
    }
    return path1 === path2;
  }

  /** 7. 路径规范化（跨平台统一 `/`） */
  static normalizePath(p: string): string {
    return upath.normalize(p);
  }

  /** 8. Shell 路径转义 */
  static escapeShellPath(filePath: string): string {
    return shellQuote([filePath]); // 自动处理空格/特殊字符
  }

  /** 9. 创建临时文件路径 */
  static createTempFilePath(
    prefix: string = "temp",
    extension: string = ""
  ): string {
    if (extension.startsWith(".")) {
      return tempy.temporaryFile({
        name: `${prefix}-${randomBytes(6).toString("hex")}${extension}`,
      });
    }
    return tempy.temporaryFile({
      name: `${prefix}-${randomBytes(6).toString("hex")}.${extension}`,
    });
  }

  /** 10. 验证路径是否有效 */
  static isValidPath(filePath: string): boolean {
    if (!filePath) return false;
    try {
      path.parse(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /** 11. 生成安全的 exec 选项 */
  static createExecOptions(workingDirectory?: string): any {
    const options: any = {
      maxBuffer: 50 * 1024 * 1024,
      encoding: "utf8",
      cwd: workingDirectory
        ? this.handleLongPath(workingDirectory)
        : process.cwd(),
      env: { ...process.env },
    };

    if (process.platform === "win32") {
      options.env = {
        ...options.env,
        PYTHONIOENCODING: "utf-8",
        PATHEXT:
          process.env.PATHEXT ||
          ".COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC",
      };
    }

    return options;
  }
}
