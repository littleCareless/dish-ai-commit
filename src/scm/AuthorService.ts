import * as vscode from 'vscode';
import { promisify } from 'util';
import { exec } from 'child_process';
import { SvnUtils } from './SvnUtils';
import { LocalizationManager } from '../utils/LocalizationManager';

const execAsync = promisify(exec);

export class AuthorService {
  constructor(private readonly workspacePath: string) {}

  async getAuthor(type: "git" | "svn"): Promise<string> {
    if (type === "git") {
      return this.getGitAuthor();
    }
    return this.getSvnAuthor();
  }

  private async getGitAuthor(): Promise<string> {
    const { stdout } = await execAsync("git config user.name");
    return stdout.trim();
  }

  private async getSvnAuthor(): Promise<string> {
    const author = await SvnUtils.getSvnAuthorFromInfo(this.workspacePath)
      || await SvnUtils.getSvnAuthorFromAuth(this.workspacePath)
      || await this.promptForAuthor();
    
    if (!author) {
      throw new Error(
        LocalizationManager.getInstance().getMessage("author.svn.not.found")
      );
    }
    
    return author;
  }

  private async promptForAuthor(): Promise<string | undefined> {
    const locManager = LocalizationManager.getInstance();
    return vscode.window.showInputBox({
      prompt: locManager.getMessage("author.manual.input.prompt"),
      placeHolder: locManager.getMessage("author.manual.input.placeholder")
    });
  }
}
