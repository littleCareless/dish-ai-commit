import { exec } from "child_process";
import { promisify } from "util";
import { DateUtils } from "../utils/DateUtils";

const execAsync = promisify(exec);

interface Period {
  startDate: string;
  endDate: string;
}

export interface CommitLogStrategy {
  getCommits(
    workspacePath: string,
    period: Period,
    author: string
  ): Promise<string[]>;
}

export class GitCommitStrategy implements CommitLogStrategy {
  async getCommits(
    workspacePath: string,
    period: Period,
    author: string
  ): Promise<string[]> {
    const command = `git log --since="${period.startDate}" --until="${period.endDate}" --pretty=format:"%h - %an, %ar : %s" --author="${author}"`;

    console.log("command", command);
    const { stdout } = await execAsync(command, { cwd: workspacePath });
    return stdout.split("\n").filter((line) => line.trim());
  }
}

export class SvnCommitStrategy implements CommitLogStrategy {
  async getCommits(
    workspacePath: string,
    period: Period,
    author: string
  ): Promise<string[]> {
    // const { startDate, endDate } = DateUtils.getDateRangeFromPeriod(period);

    const command = `svn log -r "{${period.startDate}}:{${period.endDate}}" --search="${author}" --xml`;

    console.log("command", command);

    const { stdout } = await execAsync(command, { cwd: workspacePath });
    return this.parseXmlLogs(stdout);
  }

  private parseXmlLogs(xmlOutput: string): string[] {
    const commits: string[] = [];
    const logEntriesRegex =
      /<logentry[^>]*>[\s\S]*?<msg>([\s\S]*?)<\/msg>[\s\S]*?<\/logentry>/g;
    let match;

    while ((match = logEntriesRegex.exec(xmlOutput)) !== null) {
      if (match[1]?.trim()) {
        commits.push(match[1].trim());
      }
    }

    return commits;
  }
}
