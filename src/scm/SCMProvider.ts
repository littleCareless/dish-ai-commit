import * as vscode from "vscode";
import { GitProvider } from "./GitProvider";
import { SvnProvider } from "./SvnProvider";
import { LocalizationManager } from "../utils/LocalizationManager";

export interface ISCMProvider {
  type: "git" | "svn";
  isAvailable(): Promise<boolean>;
  getDiff(files?: string[]): Promise<string | undefined>;
  commit(message: string, files?: string[]): Promise<void>;
  setCommitInput(message: string): Promise<void>;
  getCommitInput(): Promise<string>;
}

export class SCMFactory {
  private static currentProvider: ISCMProvider | undefined;

  static async detectSCM(): Promise<ISCMProvider | undefined> {
    try {
      if (this.currentProvider) {
        return this.currentProvider;
      }

      const gitExtension = vscode.extensions.getExtension("vscode.git");
      const svnExtension = vscode.extensions.getExtension(
        "littleCareless.svn-scm-ai"
      );

      // if (!gitExtension && !svnExtension) {
      //   throw new Error(
      //     LocalizationManager.getInstance().getMessage("scm.no.provider")
      //   );
      // }

      const git = gitExtension?.exports
        ? new GitProvider(gitExtension.exports)
        : undefined;
      if (git && (await git.isAvailable())) {
        this.currentProvider = git;
        return git;
      }

      const svn = svnExtension?.exports
        ? new SvnProvider(svnExtension.exports)
        : undefined;
      if (svn && (await svn.isAvailable())) {
        this.currentProvider = svn;
        return svn;
      }

      return undefined;
    } catch (error) {
      console.error(
        "SCM detection failed:",
        error instanceof Error ? error.message : error
      );
      return undefined;
    }
  }

  static getCurrentSCMType(): "git" | "svn" | undefined {
    return this.currentProvider?.type;
  }
}
