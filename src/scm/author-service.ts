import * as vscode from "vscode";
import { promisify } from "util";
import { exec } from "child_process";
import { SvnUtils } from "./svn-utils";
import { getMessage } from "../utils/i18n";

const execAsync = promisify(exec);

/**
 * 作者服务类
 * 用于获取Git或SVN仓库的作者信息
 */
export class AuthorService {
  /**
   * 构造函数
   * @param workspacePath 工作区路径
   */
  constructor(private readonly workspacePath: string) {}

  /**
   * 获取仓库作者信息
   * @param type 仓库类型:'git'或'svn'
   * @returns 作者名称
   */
  async getAuthor(type: "git" | "svn"): Promise<string> {
    if (type === "git") {
      return this.getGitAuthor();
    }
    return this.getSvnAuthor();
  }

  /**
   * 获取Git仓库的作者信息
   * @returns Git配置中的用户名
   */
  private async getGitAuthor(): Promise<string> {
    const { stdout } = await execAsync("git config user.name");
    return stdout?.trim();
  }

  /**
   * 获取SVN仓库的作者信息
   * 优先从SVN身份验证信息获取,如果失败则提示用户手动输入
   * @returns SVN作者名称
   * @throws 如果无法获取作者信息则抛出错误
   */
  private async getSvnAuthor(): Promise<string> {
    // Try getting author from auth cache first
    const authorFromAuth = await SvnUtils.getSvnAuthorFromAuth(
      this.workspacePath
    );
    if (authorFromAuth) {
      return authorFromAuth;
    }

    // If auth cache empty, try getting from svn info
    const authorFromInfo = await SvnUtils.getSvnAuthorFromInfo(
      this.workspacePath
    );
    if (authorFromInfo) {
      return authorFromInfo;
    }

    // If both methods fail, prompt user for input
    const manualAuthor = await this.promptForAuthor();
    if (!manualAuthor) {
      throw new Error(getMessage("author.svn.not.found"));
    }

    return manualAuthor;
  }

  /**
   * 提示用户手动输入作者信息
   * @returns 用户输入的作者名称,如果用户取消则返回undefined
   */
  private async promptForAuthor(): Promise<string | undefined> {
    return vscode.window.showInputBox({
      prompt: getMessage("author.manual.input.prompt"),
      placeHolder: getMessage("author.manual.input.placeholder"),
    });
  }

  /**
   * 获取仓库所有作者信息
   * @param type 仓库类型:'git'或'svn'
   * @returns 作者名称数组
   */
  async getAllAuthors(type: "git" | "svn"): Promise<string[]> {
    if (type === "git") {
      return this.getAllGitAuthors();
    }
    return this.getAllSvnAuthors();
  }

  /**
   * 获取Git仓库的所有作者信息
   * @returns Git所有作者名称数组
   */
  private async getAllGitAuthors(): Promise<string[]> {
    try {
      // --no-merges 排除合并提交的作者，通常这些不是直接的贡献者
      const { stdout } = await execAsync(
        "git log --all --format='%aN' --no-merges",
        {
          cwd: this.workspacePath,
        }
      );
      const authors = stdout
        .split("\n")
        .map((author) => author?.trim())
        .filter((author) => author); // 去除空行
      return Array.from(new Set(authors)); // 去重
    } catch (error) {
      console.error("Error getting all Git authors:", error);
      // 发生错误时可以返回空数组或抛出特定错误
      return [];
    }
  }

  /**
   * 获取SVN仓库的所有作者信息
   * @returns SVN所有作者名称数组
   * @remarks SVN获取所有作者较为复杂，当前实现为占位符
   */
  private async getAllSvnAuthors(): Promise<string[]> {
    // SVN 获取所有作者比较复杂，可能需要解析 `svn log --xml` 的完整输出
    // 或者依赖特定的 SVN 服务器配置和工具
    // 当前返回空数组作为占位符，提示用户这部分功能可能不完整
    console.warn(
      "Fetching all SVN authors is not fully implemented and may return an empty list."
    );
    // 尝试从 `svn log` 中提取，这可能非常耗时且不精确
    try {
      const { stdout } = await execAsync(`svn log --quiet`, {
        cwd: this.workspacePath,
        maxBuffer: 1024 * 1024 * 10, // 增加缓冲区以处理大型日志
      });
      // 这是一个非常基础的解析，可能不准确，依赖于svn log的默认格式
      const authorRegex = /r\d+ \| ([^|]+) \|/g;
      let match;
      const authors = new Set<string>();
      while ((match = authorRegex.exec(stdout)) !== null) {
        authors.add(match[1]?.trim());
      }
      return Array.from(authors);
    } catch (error) {
      console.error("Error getting all SVN authors:", error);
      return [];
    }
  }
}
