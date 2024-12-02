import * as vscode from "vscode";
import { GitProvider } from "./GitProvider";
import { SvnProvider } from "./SvnProvider";

export interface ISCMProvider {
  type: "git" | "svn";
  isAvailable(): Promise<boolean>;
  getDiff(files?: string[]): Promise<string | undefined>;
  commit(message: string, files?: string[]): Promise<void>;
}

export class SCMFactory {
  static async detectSCM(): Promise<ISCMProvider | undefined> {
    const gitExtension = vscode.extensions.getExtension("vscode.git")?.exports;
    const svnExtension = vscode.extensions.getExtension(
      "johnstoncode.svn-scm"
    )?.exports;

    if (gitExtension) {
      const git = new GitProvider(gitExtension);
      if (await git.isAvailable()) {
        return git;
      }
    }

    if (svnExtension) {
      const svn = new SvnProvider(svnExtension);
      if (await svn.isAvailable()) {
        return svn;
      }
    }

    return undefined;
  }
}
