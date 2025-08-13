import * as vscode from "vscode";
import { ISCMProvider } from "./scm-provider";
import { GitProvider } from "./git-provider";
import { SvnProvider } from "./svn-provider";
import { CliSvnProvider } from "./cli-svn-provider";

/**
 * SCM提供者工厂类
 * 负责创建适当的SCM提供者实例
 */
export class SCMProviderFactory {
  /**
   * 创建SCM提供者实例
   * @param type SCM类型
   * @param options 选项
   * @returns SCM提供者实例
   */
  static createProvider(
    type: "git" | "svn",
    options: {
      extension?: any;
      repositoryPath?: string;
      useCli?: boolean;
    }
  ): ISCMProvider | undefined {
    switch (type) {
      case "git":
        if (!options.extension) {
          return undefined;
        }
        return new GitProvider(options.extension, options.repositoryPath);

      case "svn":
        if (options.useCli) {
          const workspaceRoot =
            options.repositoryPath ||
            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ||
            "";
          return new CliSvnProvider(workspaceRoot);
        } else if (options.extension) {
          return new SvnProvider(options.extension, options.repositoryPath);
        }
        return undefined;

      default:
        return undefined;
    }
  }

  /**
   * 自动检测并创建可用的SCM提供者
   * @param options 选项
   * @returns 可用的SCM提供者实例数组
   */
  static async createAvailableProviders(options: {
    gitExtension?: any;
    svnExtension?: any;
    repositoryPath?: string;
    preferCli?: boolean;
  }): Promise<ISCMProvider[]> {
    const providers: ISCMProvider[] = [];

    // 尝试创建Git提供者
    if (options.gitExtension) {
      const gitProvider = this.createProvider("git", {
        extension: options.gitExtension,
        repositoryPath: options.repositoryPath,
      });

      if (gitProvider && (await gitProvider.isAvailable())) {
        await gitProvider.init();
        providers.push(gitProvider);
      }
    }

    // 尝试创建SVN提供者
    if (options.svnExtension && !options.preferCli) {
      const svnProvider = this.createProvider("svn", {
        extension: options.svnExtension,
        repositoryPath: options.repositoryPath,
      });

      if (svnProvider && (await svnProvider.isAvailable())) {
        await svnProvider.init();
        providers.push(svnProvider);
      }
    } else if (options.preferCli || !options.svnExtension) {
      // 如果没有SVN扩展或者偏好使用CLI，则尝试创建CLI SVN提供者
      const cliSvnProvider = this.createProvider("svn", {
        repositoryPath: options.repositoryPath,
        useCli: true,
      });

      if (cliSvnProvider && (await cliSvnProvider.isAvailable())) {
        await cliSvnProvider.init();
        providers.push(cliSvnProvider);
      }
    }

    return providers;
  }
}
