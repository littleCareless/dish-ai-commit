import * as vscode from "vscode";
import { WorkItem } from "../types/weeklyReport";
import { SCMFactory, type ISCMProvider } from "../scm/SCMProvider";
import { AuthorService } from "../scm/AuthorService";
import {
  CommitLogStrategy,
  GitCommitStrategy,
  SvnCommitStrategy,
} from "../scm/CommitLogStrategy";

export class WeeklyReportService {
  private scmProvider: ISCMProvider | undefined = undefined;
  private commitStrategy: CommitLogStrategy | undefined = undefined;
  private authorService: AuthorService | undefined = undefined;

  async initialize(): Promise<void> {
    const workspacePath = this.getWorkspacePath();

    this.scmProvider = await SCMFactory.detectSCM();
    if (!this.scmProvider) {
      throw new Error("No SCM provider detected");
    }

    this.authorService = new AuthorService(workspacePath);
    this.commitStrategy = this.createCommitStrategy(this.scmProvider.type);
  }

  async generate(period: string): Promise<WorkItem[]> {
    if (!this.scmProvider || !this.commitStrategy || !this.authorService) {
      await this.initialize();
    }

    const author = await this.authorService!.getAuthor(this.scmProvider!.type);
    const commits = await this.commitStrategy!.getCommits(
      this.getWorkspacePath(),
      period,
      author
    );

    return commits.map((commit) => ({
      content: commit,
      time: "",
      description: commit,
    }));
  }

  private getWorkspacePath(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders?.[0]) {
      throw new Error("No workspace folders found");
    }
    return workspaceFolders[0].uri.fsPath;
  }

  private createCommitStrategy(type: "git" | "svn"): CommitLogStrategy {
    return type === "git" ? new GitCommitStrategy() : new SvnCommitStrategy();
  }
}
