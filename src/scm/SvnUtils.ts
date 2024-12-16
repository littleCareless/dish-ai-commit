import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

export class SvnUtils {
  static async getSvnAuthorFromInfo(
    workspacePath: string
  ): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync("svn info", { cwd: workspacePath });
      const authorMatch = stdout.match(/最后修改的作者: (.+)/);
      return authorMatch?.[1]?.trim();
    } catch {
      return undefined;
    }
  }

  static async getSvnAuthorFromAuth(
    workspacePath: string
  ): Promise<string | undefined> {
    try {
      const { stdout: authOutput } = await execAsync("svn auth", {
        cwd: workspacePath,
      });
      const { stdout: urlOutput } = await execAsync("svn info", {
        cwd: workspacePath,
      });

      return this.parseAuthOutput(authOutput, urlOutput);
    } catch {
      return undefined;
    }
  }

  static async findSvnRoot(startPath: string): Promise<string | undefined> {
    let currentPath = startPath;

    while (currentPath !== path.parse(currentPath).root) {
      if (await this.isValidSvnDir(currentPath)) {
        const parentPath = path.dirname(currentPath);
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

  private static async isValidSvnDir(dirPath: string): Promise<boolean> {
    try {
      const svnPath = path.join(dirPath, ".svn");
      const wcDbPath = path.join(svnPath, "wc.db");
      const entriesPath = path.join(svnPath, "entries");

      const hasSvnDir = await fs.promises
        .stat(svnPath)
        .then((stat) => stat.isDirectory())
        .catch(() => false);
      if (!hasSvnDir) {
        return false;
      }

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

  private static parseAuthOutput(
    authOutput: string,
    urlOutput: string
  ): string | undefined {
    const credentials = this.parseCredentials(authOutput);
    console.log("credentials", credentials);
    console.log("urlOutput", urlOutput);
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

    return credentials[0]?.username ?? undefined;
  }

  private static parseCredentials(authOutput: string) {
    return authOutput
      .split(/\n?-+\n/)
      .filter((block) => block.trim())
      .map((block) => {
        const usernameMatch = block.match(/Username: (.+)/);
        const realmMatch = block.match(/认证领域: <([^>]+)>\s*([^\n]*)/);
        return {
          username: usernameMatch?.[1]?.trim() || null,
          realm: realmMatch?.[1]?.trim() || null,
          repoId: realmMatch?.[2]?.trim() || null,
        };
      })
      .filter((cred) => cred.username && cred.realm);
  }

  private static findMatchingCredential(credentials: any[], repoUrl: string) {
    // 首先尝试完全匹配
    let matchingCred = credentials.find(
      (cred) => cred.realm && repoUrl.startsWith(cred.realm)
    );

    // 如果没有完全匹配，尝试匹配主机名部分（忽略端口）
    if (!matchingCred) {
      const repoHost = this.extractHostWithoutPort(repoUrl);
      matchingCred = credentials.find((cred) => {
        const credHost = this.extractHostWithoutPort(cred.realm);
        return cred.realm && credHost === repoHost;
      });
    }

    return matchingCred?.username;
  }

  private static extractHostWithoutPort(url: string): string {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname;
    } catch {
      return '';
    }
  }
}
