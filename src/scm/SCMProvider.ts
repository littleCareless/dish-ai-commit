import * as vscode from "vscode";
import { GitProvider } from "./GitProvider";
import { SvnProvider } from "./SvnProvider";

export interface ISCMProvider {
  type: "git" | "svn";
  isAvailable(): Promise<boolean>;
  getDiff(files?: string[]): Promise<string | undefined>;
  commit(message: string, files?: string[]): Promise<void>;
  setCommitInput(message: string): Promise<void>;
}

export class SCMFactory {
  private static currentProvider: ISCMProvider | undefined;

  static async detectSCM(): Promise<ISCMProvider | undefined> {
    if (this.currentProvider) {
      return this.currentProvider;
    }

    const gitExtension = vscode.extensions.getExtension("vscode.git")?.exports;
    const svnExtension = vscode.extensions.getExtension(
      "johnstoncode.svn-scm"
    )?.exports;

    if (gitExtension) {
      const git = new GitProvider(gitExtension);
      if (await git.isAvailable()) {
        this.currentProvider = git;
        return git;
      }
    }

    if (svnExtension) {
      const svn = new SvnProvider(svnExtension);
      if (await svn.isAvailable()) {
        this.currentProvider = svn;
        return svn;
      }
    }

    return undefined;
  }

  static getCurrentSCMType(): "git" | "svn" | undefined {
    return this.currentProvider?.type;
  }
}
