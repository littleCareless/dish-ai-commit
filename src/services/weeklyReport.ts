import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { WorkItem, Repository } from "../types/weeklyReport";
import { SCMFactory } from "../scm/SCMProvider";

const execAsync = promisify(exec);
const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);

export class WeeklyReportService {
  private readonly WORK_DAYS = 5; // 固定为5个工作日
  private readonly HOURS_PER_DAY = 8; // 每天8小时
  private allLogs: string[] = [];

  constructor() {}

  async generate(commits: string[]): Promise<WorkItem[]> {
    const scmProvider = await SCMFactory.detectSCM();
    if (!scmProvider) {
      throw new Error("No SCM provider detected");
    }

    // 获取作者信息
    const author = await this.getAuthor(scmProvider.type);
    if (!author) {
      throw new Error("Unable to detect author information");
    }

    this.allLogs = commits;
    return this.processLogs();
  }

  private async getSvnAuthor(): Promise<string | undefined> {
    try {
      const svnAuthPath = path.join(
        os.homedir(),
        ".subversion",
        "auth",
        "svn.simple"
      );
      const files = await readdirAsync(svnAuthPath);

      // 读取第一个认证文件
      if (files.length > 0) {
        const authFile = path.join(svnAuthPath, files[0]);
        const content = await readFileAsync(authFile, "utf-8");

        // 使用正则表达式匹配用户名
        const usernameMatch = content.match(/username="([^"]+)"/);
        if (usernameMatch && usernameMatch[1]) {
          return usernameMatch[1];
        }
      }

      // 如果无法从配置文件获取，尝试从 svn info 获取
      const { stdout } = await execAsync("svn info --show-item author");
      return stdout.trim();
    } catch (error) {
      console.error(`Error getting SVN author: ${error}`);
      return undefined;
    }
  }

  private async getAuthor(type: "git" | "svn"): Promise<string | undefined> {
    try {
      if (type === "git") {
        const { stdout } = await execAsync("git config user.name");
        return stdout.trim();
      } else {
        return await this.getSvnAuthor();
      }
    } catch (error) {
      console.error(`Error getting author: ${error}`);
      return undefined;
    }
  }

  private async collectLogs(repositories: Repository[], author: string) {
    for (const repo of repositories) {
      if (repo.type === "git") {
        await this.collectGitLogs(repo.path, author);
      } else {
        await this.collectSvnLogs(repo.path, author);
      }
    }
  }

  private getLastWeekDates(): { start: Date; end: Date } {
    const today = new Date();
    const currentDay = today.getDay();

    // 计算上周一的日期
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - currentDay - 7 + 1);
    lastMonday.setHours(0, 0, 0, 0);

    // 计算上周五的日期
    const lastFriday = new Date(lastMonday);
    lastFriday.setDate(lastMonday.getDate() + 4);
    lastFriday.setHours(23, 59, 59, 999);

    return { start: lastMonday, end: lastFriday };
  }

  private async collectGitLogs(repoPath: string, author: string) {
    const { start, end } = this.getLastWeekDates();
    const startDate = start.toISOString();
    const endDate = end.toISOString();

    const command = `git log --after="${startDate}" --before="${endDate}" --author="${author}" --pretty=format:"%s"`;
    try {
      const { stdout } = await execAsync(command, { cwd: repoPath });
      if (stdout.trim()) {
        this.allLogs = this.allLogs.concat(stdout.trim().split("\n"));
      }
    } catch (error) {
      console.error(`Error collecting Git logs: ${error}`);
    }
  }

  private async findRepositories(): Promise<Repository[]> {
    const repositories: Repository[] = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
      return repositories;
    }

    for (const folder of workspaceFolders) {
      try {
        // 检查是否是 Git 仓库
        const { stdout: gitOutput } = await execAsync(
          "git rev-parse --git-dir",
          {
            cwd: folder.uri.fsPath,
          }
        );
        if (gitOutput) {
          repositories.push({
            type: "git",
            path: folder.uri.fsPath,
          });
          continue;
        }
      } catch {}

      try {
        // 检查是否是 SVN 仓库
        const { stdout: svnOutput } = await execAsync("svn info", {
          cwd: folder.uri.fsPath,
        });
        if (svnOutput) {
          repositories.push({
            type: "svn",
            path: folder.uri.fsPath,
          });
        }
      } catch {}
    }

    return repositories;
  }

  private async collectSvnLogs(repoPath: string, author: string) {
    const { start, end } = this.getLastWeekDates();
    try {
      const command = `svn log -r {${start.toISOString()}}:{${end.toISOString()}} --search="${author}" --xml`;
      const { stdout } = await execAsync(command, { cwd: repoPath });
      const matches = stdout.matchAll(/<msg>([\s\S]*?)<\/msg>/g);
      for (const match of matches) {
        if (match[1] && match[1].trim()) {
          this.allLogs.push(match[1].trim());
        }
      }
    } catch (error) {
      console.error(`Error collecting SVN logs: ${error}`);
    }
  }

  private processLogs(): WorkItem[] {
    const uniqueLogs = [...new Set(this.allLogs)];
    const workItems: WorkItem[] = [];
    const totalHours = this.WORK_DAYS * this.HOURS_PER_DAY;
    const hoursPerLog = totalHours / uniqueLogs.length;

    uniqueLogs.forEach((log, index) => {
      let timeSpent = hoursPerLog;
      if (index === uniqueLogs.length - 1) {
        const totalAllocated = workItems.reduce(
          (sum, item) => sum + parseFloat(item.time),
          0
        );
        const remaining = totalHours - totalAllocated;
        if (remaining > 0) {
          timeSpent = remaining;
        }
      }

      workItems.push({
        content: log,
        time: `${timeSpent.toFixed(1)}h`,
        description: this.generateDescription(log),
      });
    });

    return workItems;
  }

  private generateDescription(log: string): string {
    // 移除常见的提交前缀，如 feat:, fix: 等
    const cleanLog = log.replace(
      /^(feat|fix|docs|style|refactor|test|chore|perf):\s*/i,
      ""
    );

    // 移除 emoji
    const noEmoji = cleanLog
      .replace(/:[a-z_]+:|�[\u{1F300}-\u{1F6FF}]/gu, "")
      .trim();

    // 如果内容过短，添加更多描述
    if (noEmoji.length < 20) {
      return `完成${noEmoji}相关功能的开发和调试工作`;
    }

    return noEmoji;
  }
}
