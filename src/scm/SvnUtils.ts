import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

/**
 * SVN工具类，提供SVN相关操作的实用方法
 * 包含获取作者信息、查找SVN根目录等功能
 */
export class SvnUtils {
  /**
   * 通过svn info命令获取最后修改的作者
   * @param workspacePath - 工作区路径
   * @returns 作者名称，如果获取失败则返回undefined
   */
  static async getSvnAuthorFromInfo(
    workspacePath: string
  ): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync("svn info", { cwd: workspacePath });
      // 匹配"最后修改的作者:"后面的内容
      const authorMatch = stdout.match(/最后修改的作者: (.+)/);
      return authorMatch?.[1]?.trim();
    } catch {
      return undefined;
    }
  }

  /**
   * 通过svn auth命令获取认证信息中的用户名
   * @param workspacePath - 工作区路径
   * @returns 用户名，如果获取失败则返回undefined
   */
  static async getSvnAuthorFromAuth(
    workspacePath: string
  ): Promise<string | undefined> {
    try {
      // 获取认证信息
      const { stdout: authOutput } = await execAsync("svn auth", {
        cwd: workspacePath,
      });
      // 获取仓库URL信息
      const { stdout: urlOutput } = await execAsync("svn info", {
        cwd: workspacePath,
      });

      return this.parseAuthOutput(authOutput, urlOutput);
    } catch {
      return undefined;
    }
  }

  /**
   * 查找SVN根目录，通过向上递归查找包含.svn目录的最高层目录
   * @param startPath - 开始查找的路径
   * @returns SVN根目录路径，如果未找到则返回undefined
   */
  static async findSvnRoot(startPath: string): Promise<string | undefined> {
    let currentPath = startPath;

    while (currentPath !== path.parse(currentPath).root) {
      if (await this.isValidSvnDir(currentPath)) {
        const parentPath = path.dirname(currentPath);
        // 如果父目录也是SVN目录，继续向上查找
        if (await this.isValidSvnDir(parentPath)) {
          currentPath = parentPath;
          continue;
        }
        return currentPath;
      }
      currentPath = path.dirname(currentPath);
    }
    return undefined;
  }

  /**
   * 检查目录是否为有效的SVN目录
   * @param dirPath - 要检查的目录路径
   * @returns 如果是有效的SVN目录则返回true
   */
  private static async isValidSvnDir(dirPath: string): Promise<boolean> {
    try {
      const svnPath = path.join(dirPath, ".svn");
      const wcDbPath = path.join(svnPath, "wc.db");
      const entriesPath = path.join(svnPath, "entries");

      // 检查.svn目录是否存在
      const hasSvnDir = await fs.promises
        .stat(svnPath)
        .then((stat) => stat.isDirectory())
        .catch(() => false);
      if (!hasSvnDir) {
        return false;
      }

      // 检查是否存在wc.db或entries文件
      const hasWcDb = await fs.promises
        .stat(wcDbPath)
        .then((stat) => stat.isFile())
        .catch(() => false);
      const hasEntries = await fs.promises
        .stat(entriesPath)
        .then((stat) => stat.isFile())
        .catch(() => false);

      return hasWcDb || hasEntries;
    } catch {
      return false;
    }
  }

  /**
   * 解析svn auth和svn info的输出，获取匹配的用户名
   * @param authOutput - svn auth命令的输出
   * @param urlOutput - svn info命令的输出
   * @returns 匹配的用户名，如果未找到则返回undefined
   */
  private static parseAuthOutput(
    authOutput: string,
    urlOutput: string
  ): string | undefined {
    const credentials = this.parseCredentials(authOutput);
    console.log("credentials", credentials);
    console.log("urlOutput", urlOutput);
    // 从svn info输出中提取URL
    const urlMatch = urlOutput.match(/URL: (.+)/);
    console.log("urlMatch", urlMatch);

    if (urlMatch) {
      const repoUrl = urlMatch[1].trim();
      const matchingCred = this.findMatchingCredential(credentials, repoUrl);
      console.log("matchingCred", matchingCred);
      if (matchingCred) {
        return matchingCred;
      }
    }

    // 如果没有匹配的认证信息，返回第一个用户名
    return credentials[0]?.username ?? undefined;
  }

  /**
   * 解析svn auth输出中的认证信息
   * @param authOutput - svn auth命令的输出
   * @returns 包含用户名、认证领域和仓库ID的认证信息数组
   */
  private static parseCredentials(authOutput: string) {
    // 按分隔线分割认证块
    return authOutput
      .split(/\n?-+\n/)
      .filter((block) => block.trim())
      .map((block) => {
        // 匹配用户名
        const usernameMatch = block.match(/Username: (.+)/);
        // 匹配认证领域和仓库ID
        const realmMatch = block.match(/认证领域: <([^>]+)>\s*([^\n]*)/);
        return {
          username: usernameMatch?.[1]?.trim() || null,
          realm: realmMatch?.[1]?.trim() || null,
          repoId: realmMatch?.[2]?.trim() || null,
        };
      })
      .filter((cred) => cred.username && cred.realm);
  }

  /**
   * 查找与仓库URL匹配的认证信息
   * @param credentials - 认证信息数组
   * @param repoUrl - 仓库URL
   * @returns 匹配的用户名，如果未找到则返回undefined
   */
  private static findMatchingCredential(credentials: any[], repoUrl: string) {
    // 首先尝试完全匹配URL
    let matchingCred = credentials.find(
      (cred) => cred.realm && repoUrl.startsWith(cred.realm)
    );

    // 如果没有完全匹配，尝试匹配主机名部分
    if (!matchingCred) {
      const repoHost = this.extractHostWithoutPort(repoUrl);
      matchingCred = credentials.find((cred) => {
        const credHost = this.extractHostWithoutPort(cred.realm);
        return cred.realm && credHost === repoHost;
      });
    }

    return matchingCred?.username;
  }

  /**
   * 从URL中提取主机名(不含端口号)
   * @param url - 要解析的URL
   * @returns 主机名，解析失败则返回空字符串
   */
  private static extractHostWithoutPort(url: string): string {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname;
    } catch {
      return "";
    }
  }
}
