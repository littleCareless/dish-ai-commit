import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * 表示一个时间段的接口
 */
interface Period {
  /** 开始日期 */
  startDate: string;
  /** 结束日期 */
  endDate: string;
}

/**
 * 提交日志策略接口
 * 定义了获取代码提交记录的统一接口
 */
export interface CommitLogStrategy {
  /**
   * 获取指定时间段内指定作者的提交记录
   * @param workspacePath 工作区路径
   * @param period 时间段
   * @param author 作者名
   * @returns 提交记录数组
   */
  getCommits(
    workspacePath: string,
    period: Period,
    author: string
  ): Promise<string[]>;
}

/**
 * Git提交记录策略实现类
 */
export class GitCommitStrategy implements CommitLogStrategy {
  /**
   * 获取Git仓库的提交记录
   * @param workspacePath Git仓库路径
   * @param period 查询的时间段
   * @param author 提交作者
   * @returns 格式化后的提交记录数组
   */
  async getCommits(
    workspacePath: string,
    period: Period,
    author: string
  ): Promise<string[]> {
    // 构建git log命令,格式化输出提交信息
    const command = `git log --since="${period.startDate}" --until="${period.endDate}" --pretty=format:"%h - %an, %ar : %s" --author="${author}"`;

    console.log("command", command);
    const { stdout } = await execAsync(command, { cwd: workspacePath });
    return stdout.split("\n").filter((line) => line.trim());
  }
}

/**
 * SVN提交记录策略实现类
 */
export class SvnCommitStrategy implements CommitLogStrategy {
  /**
   * 获取SVN仓库的提交记录
   * @param workspacePath SVN仓库路径
   * @param period 查询的时间段
   * @param author 提交作者
   * @returns 解析后的提交记录数组
   */
  async getCommits(
    workspacePath: string,
    period: Period,
    author: string
  ): Promise<string[]> {
    // 构建svn log命令,使用XML格式输出
    const command = `svn log -r "{${period.startDate}}:{${period.endDate}}" --search="${author}" --xml`;

    console.log("command", command);

    const { stdout } = await execAsync(command, { cwd: workspacePath });
    return this.parseXmlLogs(stdout);
  }

  /**
   * 解析SVN的XML格式日志输出
   * @param xmlOutput XML格式的SVN日志输出
   * @returns 提取的提交消息数组
   */
  private parseXmlLogs(xmlOutput: string): string[] {
    const commits: string[] = [];
    // 匹配<logentry>标签内的<msg>内容
    const logEntriesRegex =
      /<logentry[^>]*>[\s\S]*?<msg>([\s\S]*?)<\/msg>[\s\S]*?<\/logentry>/g;
    let match;

    // 循环提取所有匹配的提交消息
    while ((match = logEntriesRegex.exec(xmlOutput)) !== null) {
      if (match[1]?.trim()) {
        commits.push(match[1].trim());
      }
    }

    return commits;
  }
}
