import * as vscode from "vscode";
import * as path from "path";
import { SCMErrorHandler } from "./error-handler";
import { SCMPathHandler } from "./path-handler";
import { getMessage, formatMessage } from "../../utils/i18n";
import { SCMCommandExecutor } from "./command-executor";
import { ConfigurationManager } from "../../config/configuration-manager";

/**
 * SCM统一配置管理器
 * 提供所有SCM提供者共享的配置管理功能
 */
export class SCMConfigManager {
  /**
   * 获取SVN路径
   * @param caller 调用者标识（可选）
   * @returns SVN可执行文件路径
   * @throws {Error} 当无法找到SVN时抛出错误
   */
  static async getSvnPath(caller?: string): Promise<string> {
    console.log(`[SVN-PATH] getSvnPath called ${caller ? `from ${caller}` : ""}`);
    
    // 1. 优先检查SVN插件配置
    const svnConfig = vscode.workspace.getConfiguration("svn");
    const svnPluginPath = svnConfig.get<string>("path");
    if (svnPluginPath && (await this.isValidSvnPath(svnPluginPath))) {
      console.log("Using SVN path from SVN plugin config:", svnPluginPath);
      return svnPluginPath;
    }

    // 2. 检查自定义配置
    const customConfig = vscode.workspace.getConfiguration("svn-commit-gen");
    const customPath = customConfig.get<string>("svnPath");
    if (customPath && (await this.isValidSvnPath(customPath))) {
      console.log("Using SVN path from custom config:", customPath);
      return customPath;
    }

    // 3. 自动检测
    const detectedPath = await this.findSvnExecutable();
    if (detectedPath) {
      console.log("Auto-detected SVN path:", detectedPath);
      return detectedPath;
    }

    // 4. 如果未找到，则抛出错误
    console.error("SVN executable not found in system PATH or common locations.");
    throw new Error(
      "Unable to locate SVN executable. Please ensure SVN is installed and in your system's PATH, or set the path in the extension settings."
    );
  }

  /**
   * 获取Git路径
   * @returns Git可执行文件路径
   * @throws {Error} 当无法找到Git时抛出错误
   */
  static async getGitPath(): Promise<string> {
    try {
      const { stdout } = await SCMCommandExecutor.executeGit("--version", process.cwd());
      const version = stdout.toString().trim();
      console.log("Git version detected:", version);
      const whichCmd = process.platform === "win32" ? "where git" : "which git";
      const { stdout: gitPath } = await SCMCommandExecutor.execute(whichCmd, process.cwd());
      return gitPath.toString().split("\n")[0].trim();
    } catch (error) {
      SCMErrorHandler.handleError("Git", "路径获取", error);
    }
  }

  /**
   * 获取SVN环境配置
   * @returns 环境配置对象
   */
  static getSvnEnvironmentConfig(): NodeJS.ProcessEnv {
    const DEFAULT_CONFIG = {
      environmentConfig: {
        path: ["/usr/local/bin", "/opt/homebrew/bin"],
        locale: "en_US.UTF-8",
      },
    };

    try {
      const config = vscode.workspace.getConfiguration("svn-commit-gen");
      const envConfig = {
        path: config.get<string[]>("environmentPath") || DEFAULT_CONFIG.environmentConfig.path,
        locale: config.get<string>("locale") || DEFAULT_CONFIG.environmentConfig.locale,
      };

      if (!Array.isArray(envConfig.path) || !envConfig.locale) {
        throw new Error(getMessage("svn.invalid.env.config"));
      }

      return {
        ...process.env,
        PATH: `${process.env.PATH}${path.delimiter}${envConfig.path.join(
          path.delimiter
        )}`,
        LC_ALL: envConfig.locale,
      };
    } catch (error) {
      console.error("Failed to load SVN config:", error);
      throw new Error(formatMessage("svn.config.load.failed", [error]));
    }
  }

  /**
   * 获取Git环境配置
   * @returns 环境配置对象
   */
  static getGitEnvironmentConfig(): NodeJS.ProcessEnv {
    try {
      const config = vscode.workspace.getConfiguration("git");
      const envConfig = {
        path: config.get<string[]>("environmentPath") || [],
        locale: config.get<string>("locale") || "en_US.UTF-8",
      };

      return {
        ...process.env,
        PATH: envConfig.path.length > 0 
          ? `${process.env.PATH}${path.delimiter}${envConfig.path.join(path.delimiter)}`
          : process.env.PATH,
        LC_ALL: envConfig.locale,
      };
    } catch (error) {
      console.error("Failed to load Git config:", error);
      return process.env;
    }
  }

  /**
   * 获取通用环境配置
   * @param scmType SCM类型
   * @returns 环境配置对象
   */
  static getEnvironmentConfig(scmType: "git" | "svn"): NodeJS.ProcessEnv {
    switch (scmType) {
      case "git":
        return this.getGitEnvironmentConfig();
      case "svn":
        return this.getSvnEnvironmentConfig();
      default:
        return process.env;
    }
  }

  /**
   * 检查SVN路径是否有效
   * @param svnPath SVN路径
   * @returns 是否有效
   */
  private static async isValidSvnPath(svnPath: string): Promise<boolean> {
    if (!SCMPathHandler.safeExists(svnPath)) {
      return false;
    }
    try {
      const { promisify } = require("util");
      const { exec } = require("child_process");
      const execAsync = promisify(exec);
      
      // The --version command is a reliable way to check if it's a valid SVN executable
      const escapedPath = SCMPathHandler.escapeShellPath(svnPath);
      await execAsync(`${escapedPath} --version`);
      return true;
    } catch (error) {
      console.log(`Path validation failed for ${svnPath}:`, error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * 查找SVN可执行文件
   * @returns SVN路径或null
   */
  private static async findSvnExecutable(): Promise<string | null> {
    // 1. Try system command first ('where' on Windows, 'which' on others)
    const command = process.platform === "win32" ? "where svn" : "which svn";
    try {
      const { promisify } = require("util");
      const { exec } = require("child_process");
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync(command);
      const lines = stdout.toString().trim().split("\n");
      for (const line of lines) {
        const p = line.trim();
        if (p && (await this.isValidSvnPath(p))) {
          return SCMPathHandler.handleLongPath(p);
        }
      }
    } catch (error) {
      console.log(`'${command}' command failed, checking common paths.`);
    }

    // 2. Check common installation paths for different OS
    const potentialPaths: string[] = [];
    if (process.platform === "win32") {
      const programFiles = process.env["ProgramFiles"] || "C:\\Program Files";
      const programFilesX86 =
        process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
      potentialPaths.push(
        path.join(programFiles, "TortoiseSVN", "bin", "svn.exe"),
        path.join(programFilesX86, "TortoiseSVN", "bin", "svn.exe"),
        path.join(programFiles, "SlikSvn", "bin", "svn.exe"),
        path.join(programFiles, "VisualSVN Server", "bin", "svn.exe")
      );
    } else if (process.platform === "darwin") {
      // macOS paths (Intel and Apple Silicon)
      potentialPaths.push(
        "/usr/bin/svn",
        "/usr/local/bin/svn",
        "/opt/homebrew/bin/svn", // Homebrew on Apple Silicon
        "/opt/local/bin/svn" // MacPorts
      );
    } else {
      // Linux paths
      potentialPaths.push("/usr/bin/svn", "/usr/local/bin/svn");
    }

    for (const p of potentialPaths) {
      const normalizedPath = SCMPathHandler.handleLongPath(p);
      if (await this.isValidSvnPath(normalizedPath)) {
        return normalizedPath;
      }
    }

    return null;
  }

  /**
   * 获取SCM配置
   * @param scmType SCM类型
   * @param configKey 配置键
   * @param defaultValue 默认值
   * @returns 配置值
   */
  static getSCMConfig<T>(scmType: "git" | "svn", configKey: string, defaultValue: T): T {
    try {
      const config = vscode.workspace.getConfiguration(`${scmType}-commit-gen`);
      return config.get<T>(configKey) || defaultValue;
    } catch (error) {
      console.warn(`Failed to get ${scmType} config for key ${configKey}:`, error);
      return defaultValue;
    }
  }

  /**
   * 获取提交日志限制
   * @param scmType SCM类型
   * @returns 日志条数限制
   */
  static getCommitLogLimit(scmType: "git" | "svn"): number {
    try {
      const configValue = ConfigurationManager.getInstance().getConfig(
        "FEATURES_PRSUMMARY_COMMITLOGLIMIT"
      );
      return (configValue as number) ?? 20;
    } catch (error) {
      console.warn("Failed to get commitLogLimit from ConfigurationManager:", error);
      return 20;
    }
  }

  /**
   * 获取差异目标配置
   * @returns 差异目标
   */
  static getDiffTarget(): string {
    try {
      const value = ConfigurationManager.getInstance().getConfig(
        "FEATURES_CODEANALYSIS_DIFFTARGET"
      );
      return (value as string) || "all";
    } catch (error) {
      console.warn("Failed to get diff target config via ConfigurationManager:", error);
      return "all";
    }
  }

  /**
   * 获取是否启用差异简化
   * @returns 是否启用
   */
  static isDiffSimplificationEnabled(): boolean {
    try {
      const value = ConfigurationManager.getInstance().getConfig(
        "FEATURES_CODEANALYSIS_SIMPLIFYDIFF"
      );
      return Boolean(value);
    } catch (error) {
      console.warn(
        "Failed to get diff simplification config via ConfigurationManager:",
        error
      );
      return false;
    }
  }
}
