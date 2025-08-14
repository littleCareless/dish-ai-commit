import { exec } from "child_process";
import { promisify } from "util";
import { SCMLogger } from "./scm-logger";
import { PathUtils } from "./path-utils";

const execAsync = promisify(exec);

/**
 * 命令执行选项
 */
export interface CommandOptions {
  /** 工作目录 */
  cwd?: string;
  /** 环境变量 */
  env?: NodeJS.ProcessEnv;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大缓冲区大小 */
  maxBuffer?: number;
  /** 编码格式 */
  encoding?: BufferEncoding;
}

/**
 * 命令执行结果
 */
export interface CommandResult {
  /** 标准输出 */
  stdout: string;
  /** 标准错误 */
  stderr: string;
  /** 执行成功 */
  success: boolean;
  /** 错误信息（如果有） */
  error?: Error;
}

/**
 * 统一的命令执行器
 * 提供安全、一致的shell命令执行功能
 */
export class CommandExecutor {
  /** 默认超时时间（30秒） */
  private static readonly DEFAULT_TIMEOUT = 30000;
  
  /** 默认最大缓冲区大小（10MB） */
  private static readonly DEFAULT_MAX_BUFFER = 1024 * 1024 * 10;

  /**
   * 执行shell命令
   * @param command 要执行的命令
   * @param options 执行选项
   * @returns 命令执行结果
   */
  static async execute(
    command: string,
    options: CommandOptions = {}
  ): Promise<CommandResult> {
    const startTime = Date.now();
    const safeCommand = this.sanitizeCommand(command);
    
    SCMLogger.debug(`Executing command: ${safeCommand}`, {
      cwd: options.cwd,
      timeout: options.timeout || this.DEFAULT_TIMEOUT
    });

    try {
      const execOptions = {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        timeout: options.timeout || this.DEFAULT_TIMEOUT,
        maxBuffer: options.maxBuffer || this.DEFAULT_MAX_BUFFER,
        encoding: options.encoding || 'utf8' as BufferEncoding
      };

      const { stdout, stderr } = await execAsync(safeCommand, execOptions);
      const duration = Date.now() - startTime;
      
      SCMLogger.debug(`Command completed in ${duration}ms: ${safeCommand}`);
      
      return {
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        success: true
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const commandError = error as any;
      
      SCMLogger.error(`Command failed after ${duration}ms: ${safeCommand}`, {
        error: commandError.message,
        code: commandError.code,
        stderr: commandError.stderr
      });

      return {
        stdout: commandError.stdout?.toString() || '',
        stderr: commandError.stderr?.toString() || '',
        success: false,
        error: commandError
      };
    }
  }

  /**
   * 执行命令并只返回标准输出
   * @param command 要执行的命令
   * @param options 执行选项
   * @returns 标准输出字符串
   * @throws 如果命令执行失败则抛出错误
   */
  static async executeForOutput(
    command: string,
    options: CommandOptions = {}
  ): Promise<string> {
    const result = await this.execute(command, options);
    if (!result.success) {
      throw result.error || new Error(`Command failed: ${command}`);
    }
    return result.stdout;
  }

  /**
   * 执行命令并检查是否成功（忽略输出）
   * @param command 要执行的命令
   * @param options 执行选项
   * @returns 如果命令成功执行返回true
   */
  static async executeForSuccess(
    command: string,
    options: CommandOptions = {}
  ): Promise<boolean> {
    const result = await this.execute(command, options);
    return result.success;
  }

  /**
   * 带重试的命令执行
   * @param command 要执行的命令
   * @param options 执行选项
   * @param maxRetries 最大重试次数
   * @param retryDelay 重试延迟（毫秒）
   * @returns 命令执行结果
   */
  static async executeWithRetry(
    command: string,
    options: CommandOptions = {},
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<CommandResult> {
    let lastResult: CommandResult;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      lastResult = await this.execute(command, options);
      
      if (lastResult.success) {
        if (attempt > 1) {
          SCMLogger.info(`Command succeeded on attempt ${attempt}: ${command}`);
        }
        return lastResult;
      }

      if (attempt < maxRetries) {
        SCMLogger.warn(
          `Command failed on attempt ${attempt}/${maxRetries}, retrying in ${retryDelay}ms: ${command}`
        );
        await this.delay(retryDelay);
      }
    }

    SCMLogger.error(`Command failed after ${maxRetries} attempts: ${command}`);
    return lastResult!;
  }

  /**
   * 创建用于特定工作目录的执行器
   * @param workingDirectory 工作目录
   * @param defaultEnv 默认环境变量
   * @returns 绑定了工作目录的执行器
   */
  static createForDirectory(
    workingDirectory: string,
    defaultEnv?: NodeJS.ProcessEnv
  ) {
    const normalizedCwd = PathUtils.normalizePath(workingDirectory);
    
    return {
      execute: (command: string, options: Omit<CommandOptions, 'cwd'> = {}) =>
        CommandExecutor.execute(command, {
          ...options,
          cwd: normalizedCwd,
          env: { ...defaultEnv, ...options.env }
        }),
      
      executeForOutput: (command: string, options: Omit<CommandOptions, 'cwd'> = {}) =>
        CommandExecutor.executeForOutput(command, {
          ...options,
          cwd: normalizedCwd,
          env: { ...defaultEnv, ...options.env }
        }),
      
      executeForSuccess: (command: string, options: Omit<CommandOptions, 'cwd'> = {}) =>
        CommandExecutor.executeForSuccess(command, {
          ...options,
          cwd: normalizedCwd,
          env: { ...defaultEnv, ...options.env }
        })
    };
  }

  /**
   * 检查命令是否可用
   * @param command 命令名称
   * @returns 如果命令可用返回true
   */
  static async isCommandAvailable(command: string): Promise<boolean> {
    const checkCommand = process.platform === 'win32' 
      ? `where ${command}` 
      : `which ${command}`;
    
    return this.executeForSuccess(checkCommand, { timeout: 5000 });
  }

  /**
   * 获取命令版本信息
   * @param command 命令名称
   * @param versionFlag 版本标志（默认为--version）
   * @returns 版本信息字符串
   */
  static async getCommandVersion(
    command: string,
    versionFlag: string = '--version'
  ): Promise<string | null> {
    try {
      const result = await this.executeForOutput(
        `${command} ${versionFlag}`,
        { timeout: 10000 }
      );
      
      // 提取第一行作为版本信息
      return result.split('\n')[0].trim();
    } catch (error) {
      SCMLogger.warn(`Failed to get version for ${command}:`, error);
      return null;
    }
  }

  /**
   * 清理和验证命令字符串
   * @param command 原始命令
   * @returns 清理后的命令
   */
  private static sanitizeCommand(command: string): string {
    if (!command || typeof command !== 'string') {
      throw new Error('Command must be a non-empty string');
    }

    // 移除潜在的危险字符序列
    const dangerous = [';', '&&', '||', '|', '>', '>>', '<', '`', '$'];
    const containsDangerous = dangerous.some(char => command.includes(char));
    
    if (containsDangerous) {
      SCMLogger.warn('Command contains potentially dangerous characters:', command);
    }

    return command.trim();
  }

  /**
   * 延迟执行
   * @param ms 延迟毫秒数
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}