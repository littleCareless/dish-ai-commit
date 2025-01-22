import * as vscode from "vscode";
import { promisify } from "util";
import { exec } from "child_process";
import { SvnUtils } from "./SvnUtils";
import { LocalizationManager } from "../utils/LocalizationManager";

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
    console.log(
      "getSvnAuthorFromAuth",
      await SvnUtils.getSvnAuthorFromAuth(this.workspacePath)
    );
    // 尝试从SVN认证信息获取作者,如果失败则提示手动输入
    const author =
      (await SvnUtils.getSvnAuthorFromAuth(this.workspacePath)) ||
      (await this.promptForAuthor());

    if (!author) {
      throw new Error(
        LocalizationManager.getInstance().getMessage("author.svn.not.found")
      );
    }

    return author;
  }

  /**
   * 提示用户手动输入作者信息
   * @returns 用户输入的作者名称,如果用户取消则返回undefined
   */
  private async promptForAuthor(): Promise<string | undefined> {
    const locManager = LocalizationManager.getInstance();
    return vscode.window.showInputBox({
      prompt: locManager.getMessage("author.manual.input.prompt"),
      placeHolder: locManager.getMessage("author.manual.input.placeholder"),
    });
  }
}
