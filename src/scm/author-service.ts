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
    return stdout.trim();
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
}
