import * as vscode from "vscode";
import { WorkItem } from "../types/weekly-report";
import { SCMFactory, type ISCMProvider } from "../scm/s-c-m-provider";
import { AuthorService } from "../scm/author-service";
import {
  CommitLogStrategy,
  GitCommitStrategy,
  SvnCommitStrategy,
} from "../scm/commit-log-strategy";

/**
 * Represents a time period with start and end dates
 */
export interface Period {
  /** Start date in string format */
  startDate: string;
  /** End date in string format */
  endDate: string;
}

/**
 * Service class for generating weekly reports from source control commits
 * Supports both Git and SVN repositories
 */
export class WeeklyReportService {
  /** SCM provider instance for repository operations */
  private scmProvider: ISCMProvider | undefined = undefined;

  /** Strategy for retrieving commit logs */
  private commitStrategy: CommitLogStrategy | undefined = undefined;

  /** Service for handling author information */
  private authorService: AuthorService | undefined = undefined;

  /**
   * Initializes the weekly report service
   * Sets up SCM provider, commit strategy and author service
   * @throws {Error} When no SCM provider is detected
   */
  async initialize(): Promise<void> {
    const workspacePath = this.getWorkspacePath();

    this.scmProvider = await SCMFactory.detectSCM();
    if (!this.scmProvider) {
      throw new Error("No SCM provider detected");
    }

    this.authorService = new AuthorService(workspacePath);
    this.commitStrategy = this.createCommitStrategy(this.scmProvider.type);
  }

  /**
   * Generates work items from commits within specified period
   * @param period - Time period to generate report for
   * @returns Promise resolving to array of work items
   * @throws {Error} When service is not initialized
   */
  async generate(period: Period): Promise<WorkItem[]> {
    if (!this.scmProvider || !this.commitStrategy || !this.authorService) {
      await this.initialize();
    }

    const author = await this.authorService!.getAuthor(this.scmProvider!.type);
    console.log("author", author);
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

  /**
   * Retrieves the current author from the SCM system
   * @returns Promise resolving to author name
   * @throws {Error} When service is not initialized
   */
  async getCurrentAuthor(): Promise<string> {
    if (!this.scmProvider || !this.authorService) {
      await this.initialize();
    }
    return await this.authorService!.getAuthor(this.scmProvider!.type);
  }

  /**
   * Gets the path of the current workspace
   * @returns Filesystem path of current workspace
   * @throws {Error} When no workspace is open
   * @private
   */
  private getWorkspacePath(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders?.[0]) {
      throw new Error("No workspace folders found");
    }
    return workspaceFolders[0].uri.fsPath;
  }

  /**
   * Creates appropriate commit log strategy based on SCM type
   * @param type - Type of SCM system ('git' or 'svn')
   * @returns Commit log strategy instance
   * @private
   */
  private createCommitStrategy(type: "git" | "svn"): CommitLogStrategy {
    return type === "git" ? new GitCommitStrategy() : new SvnCommitStrategy();
  }
}
