import { LayeredCommitMessage } from "../../../ai/types";

/**
 * 将分层提交信息格式化为结构化的提交信息文本
 * @param layeredCommit - 分层提交信息对象
 * @returns 格式化后的提交信息文本
 */
export function formatLayeredCommitMessage(
  layeredCommit: LayeredCommitMessage
): string {
  // 构建提交信息文本
  let commitMessage = layeredCommit.summary?.trim();

  // 如果有文件变更，添加详细信息部分
  if (layeredCommit.fileChanges.length > 0) {
    commitMessage += "\n\n### 变更详情\n";

    for (const fileChange of layeredCommit.fileChanges) {
      commitMessage += `\n* **${
        fileChange.filePath
      }**：${fileChange.description?.trim()}`;
    }
  }

  return commitMessage;
}

/**
 * 过滤提交信息中的代码块标记
 * @param commitMessage - 原始提交信息
 * @returns 过滤后的提交信息
 */
export function filterCodeBlockMarkers(commitMessage: string): string {
  let cleanedMessage = commitMessage?.trim();
  // 移除开头的代码块标记，例如 ```json, ```text, ```
  cleanedMessage = cleanedMessage.replace(/^```[a-zA-Z]*\s*\n?/, "");
  // 移除结尾的代码块标记
  cleanedMessage = cleanedMessage.replace(/\n?```$/, "");
  // 再次 trim 以处理移除标记后可能留下的空格
  return cleanedMessage?.trim();
}

