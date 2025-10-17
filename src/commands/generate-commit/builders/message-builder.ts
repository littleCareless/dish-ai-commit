import * as vscode from "vscode";
import * as path from "path";
import { getMessage } from "../../../utils/i18n";
import { notify } from "../../../utils/notification/notification-manager";

/**
 * 提交消息构建器类，负责构建和展示提交消息相关内容
 */
export class CommitMessageBuilder {
  /**
   * 显示分层提交详细信息
   * @param fileChanges - 文件变更列表
   * @param isFallback - 是否为回退模式
   */
  async showLayeredCommitDetails(
    fileChanges: { filePath: string; description: string }[],
    isFallback = false
  ): Promise<void> {
    const title = isFallback
      ? getMessage("layered.commit.fallback.title")
      : getMessage("layered.commit.details.title");
    let content = `# ${title}\n\n`;
    if (isFallback) {
      content += `${getMessage("layered.commit.fallback.description")}\n\n`;
    }

    for (const change of fileChanges) {
      content += `### ${change.filePath}\n\n${change.description}\n\n---\n\n`;
    }

    const document = await vscode.workspace.openTextDocument({
      content,
      language: "markdown",
    });
    await vscode.window.showTextDocument(document);
    notify.info("layered.commit.details.generated");
  }
}

