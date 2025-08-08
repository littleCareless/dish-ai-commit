import { promisify } from "util";
import * as childProcess from "child_process";
import { SCMErrorHandler } from "./error-handler";
import { SCMPathHandler } from "./path-handler";

const exec = promisify(childProcess.exec);

/**
 * SCM统一命令执行器
 * 提供所有SCM提供者共享的命令执行功能
 */
export class SCMCommandExecutor {
  /**
   * 执行命令
   * @param command 要执行的命令
   * @param workingDirectory 工作目录
   * @param options 执行选项
   * @returns 执行结果
   */
  static async execute(
    command: string, 
    workingDirectory: string, 
    options?: any
  ): Promise<{stdout: string, stderr: string}> {
    try {
      const execOptions = {
        cwd: SCMPathHandler.normalizePath(workingDirectory),
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        encoding: 'utf8' as const,
        ...options
      };

      const result = await exec(command, execOptions);
      return {
        stdout: result.stdout.toString(),
        stderr: result.stderr.toString()
      };
    } catch (error) {
      console.error("执行命令失败:", error);

      throw error;
      // SCMErrorHandler.handleCommandError("SCM", command, error);
    }
  }

  /**
   * 带超时的命令执行
   * @param command 要执行的命令
   * @param workingDirectory 工作目录
   * @param timeoutMs 超时时间（毫秒）
   * @param options 执行选项
   * @returns 执行结果
   */
  static async executeWithTimeout(
    command: string, 
    workingDirectory: string, 
    timeoutMs: number = 5000,
    options?: any
  ): Promise<{stdout: string, stderr: string}> {
    try {
      const execOptions = {
        cwd: SCMPathHandler.normalizePath(workingDirectory),
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        encoding: 'utf8' as const,
        ...options
      };

      const result = await Promise.race([
        exec(command, execOptions),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Operation timed out")), timeoutMs)
        )
      ]);

      return {
        stdout: result.stdout.toString(),
        stderr: result.stderr.toString()
      };
    } catch (error) {
      if (error instanceof Error && error.message === "Operation timed out") {
        SCMErrorHandler.handleError("SCM", "命令执行", new Error(`命令执行超时: ${command}`));
      } else {
        SCMErrorHandler.handleCommandError("SCM", command, error);
      }
    }
  }

  /**
   * 执行Git命令
   * @param command Git命令
   * @param workingDirectory 工作目录
   * @param options 执行选项
   * @returns 执行结果
   */
  static async executeGit(
    command: string, 
    workingDirectory: string, 
    options?: any
  ): Promise<{stdout: string, stderr: string}> {
    return this.execute(`git ${command}`, workingDirectory, options);
  }

  /**
   * 执行SVN命令
   * @param svnPath SVN可执行文件路径
   * @param command SVN命令
   * @param workingDirectory 工作目录
   * @param options 执行选项
   * @returns 执行结果
   */
  static async executeSvn(
    svnPath: string,
    command: string, 
    workingDirectory: string, 
    options?: any
  ): Promise<{stdout: string, stderr: string}> {
    const escapedSvnPath = SCMPathHandler.escapeShellPath(svnPath);
    return this.execute(`"${escapedSvnPath}" ${command}`, workingDirectory, options);
  }

  /**
   * 检查命令是否可用
   * @param command 要检查的命令
   * @param workingDirectory 工作目录
   * @returns 命令是否可用
   */
  static async checkCommandAvailable(
    command: string, 
    workingDirectory: string
  ): Promise<boolean> {
    try {
      await this.execute(`${command} --version`, workingDirectory);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查Git是否可用
   * @param workingDirectory 工作目录
   * @returns Git是否可用
   */
  static async checkGitAvailable(workingDirectory: string): Promise<boolean> {
    return this.checkCommandAvailable("git", workingDirectory);
  }

  /**
   * 检查SVN是否可用
   * @param svnPath SVN可执行文件路径
   * @param workingDirectory 工作目录
   * @returns SVN是否可用
   */
  static async checkSvnAvailable(svnPath: string, workingDirectory: string): Promise<boolean> {
    try {
      const escapedSvnPath = SCMPathHandler.escapeShellPath(svnPath);
      await this.execute(`"${escapedSvnPath}" --version`, workingDirectory);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 执行命令并返回标准输出
   * @param command 要执行的命令
   * @param workingDirectory 工作目录
   * @param options 执行选项
   * @returns 标准输出
   */
  static async executeAndGetStdout(
    command: string, 
    workingDirectory: string, 
    options?: any
  ): Promise<string> {
    const result = await this.execute(command, workingDirectory, options);
    return result.stdout;
  }

  /**
   * 执行命令并返回标准错误
   * @param command 要执行的命令
   * @param workingDirectory 工作目录
   * @param options 执行选项
   * @returns 标准错误
   */
  static async executeAndGetStderr(
    command: string, 
    workingDirectory: string, 
    options?: any
  ): Promise<string> {
    const result = await this.execute(command, workingDirectory, options);
    return result.stderr;
  }

  /**
   * 执行命令并忽略错误
   * @param command 要执行的命令
   * @param workingDirectory 工作目录
   * @param options 执行选项
   * @returns 执行结果或null
   */
  static async executeIgnoreError(
    command: string, 
    workingDirectory: string, 
    options?: any
  ): Promise<{stdout: string, stderr: string} | null> {
    try {
      return await this.execute(command, workingDirectory, options);
    } catch {
      return null;
    }
  }

  /**
   * 创建标准执行选项
   * @param workingDirectory 工作目录
   * @param additionalOptions 额外选项
   * @returns 执行选项对象
   */
  static createExecOptions(workingDirectory: string, additionalOptions: any = {}): any {
    return {
      cwd: SCMPathHandler.normalizePath(workingDirectory),
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      encoding: 'utf8' as const,
      ...additionalOptions
    };
  }

  /**
   * 执行多个命令
   * @param commands 命令数组
   * @param workingDirectory 工作目录
   * @param options 执行选项
   * @returns 执行结果数组
   */
  static async executeMultiple(
    commands: string[], 
    workingDirectory: string, 
    options?: any
  ): Promise<Array<{stdout: string, stderr: string}>> {
    const results = [];
    for (const command of commands) {
      try {
        const result = await this.execute(command, workingDirectory, options);
        results.push(result);
      } catch (error) {
        results.push({ stdout: "", stderr: error instanceof Error ? error.message : String(error) });
      }
    }
    return results;
  }

  /**
   * 执行命令并处理特殊错误
   * @param command 要执行的命令
   * @param workingDirectory 工作目录
   * @param options 执行选项
   * @returns 执行结果
   */
  static async executeWithSpecialErrorHandling(
    command: string, 
    workingDirectory: string, 
    options?: any
  ): Promise<{stdout: string, stderr: string}> {
    try {
      return await this.execute(command, workingDirectory, options);
    } catch (error) {
      // 某些diff命令在有差异时会返回非零状态码，但stdout仍然有效
      if (error instanceof Error && "stdout" in error) {
        return {
          stdout: (error as any).stdout.toString(),
          stderr: (error as any).stderr.toString()
        };
      }
      throw error;
    }
  }
}
