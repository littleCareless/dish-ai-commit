import * as vscode from "vscode";
import { WorkItem } from "../types/weekly-report";
import { SCMFactory, type ISCMProvider } from "../scm/scm-provider";
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

    // 修改：传递工作区路径作为首选文件路径来检测SCM
    this.scmProvider = await SCMFactory.detectSCM([workspacePath]);
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
   * Retrieves all unique authors from the SCM system for the current workspace.
   * @returns Promise resolving to an array of author names.
   * @throws {Error} When service is not initialized.
   */
  async getAllAuthors(): Promise<string[]> {
    if (!this.scmProvider || !this.authorService) {
      await this.initialize();
    }
    // Assuming AuthorService will have a method to get all authors
    // This might involve parsing commit logs or using SCM specific commands
    // For now, let's assume it returns a list of unique authors from all commits.
    // This is a placeholder and might need a more sophisticated implementation
    // in AuthorService and potentially in GitCommitStrategy/SvnCommitStrategy
    // to efficiently get all unique authors.
    // A simple approach for now could be to get all commits and extract authors.
    // However, this could be inefficient for large repositories.
    // A better approach would be to have a dedicated method in AuthorService.
    // For now, we'll delegate to a new method in AuthorService.
    return await this.authorService!.getAllAuthors(this.scmProvider!.type);
  }

  /**
   * Generates work items from commits by specified users within a given period.
   * @param period - Time period to generate report for.
   * @param users - Array of user names to filter commits by.
   * @returns Promise resolving to array of work items.
   * @throws {Error} When service is not initialized.
   */
  async generateForUsers(period: Period, users: string[]): Promise<WorkItem[]> {
    if (!this.scmProvider || !this.commitStrategy || !this.authorService) {
      await this.initialize();
    }

    if (users.length === 0) {
      return []; // No users selected, return empty array
    }

    // Assuming CommitLogStrategy will have a method to get commits for multiple users
    const commits = await this.commitStrategy!.getCommitsForUsers(
      this.getWorkspacePath(),
      period,
      users
    );

    return commits.map((commit): WorkItem => ({ // Explicitly type WorkItem
      content: commit,
      time: "", // Placeholder, might need to extract from commit
      description: commit, // Placeholder, might need to extract from commit
    }));
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
