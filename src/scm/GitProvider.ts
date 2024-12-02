import * as vscode from "vscode";
import { ISCMProvider } from "./SCMProvider";

export class GitProvider implements ISCMProvider {
  type = "git" as const;

  constructor(private readonly gitExtension: any) {}

  async isAvailable(): Promise<boolean> {
    const api = this.gitExtension.getAPI(1);
    const repositories = api.repositories;
    return repositories.length > 0;
  }

  async getDiff(files?: string[]): Promise<string | undefined> {
    const api = this.gitExtension.getAPI(1);
    const repository = api.repositories[0];

    if (!repository) {
      return undefined;
    }

    // 如果指定了文件，则获取这些文件的diff
    if (files && files.length > 0) {
      const diffs = await Promise.all(
        files.map((file) =>
          repository.diffWith(repository.state.HEAD.commit, file)
        )
      );
      return diffs.join("\n");
    }

    // 否则获取所有改动的diff
    return await repository.diff();
  }

  async commit(message: string, files?: string[]): Promise<void> {
    const api = this.gitExtension.getAPI(1);
    const repository = api.repositories[0];

    if (!repository) {
      throw new Error("No Git repository found");
    }

    await repository.commit(message, { all: files ? false : true, files });
  }
}
