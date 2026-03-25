import { LayeredCommitMessage } from "@/ai/types";
import { ISCMProvider } from "@/scm/scm-provider";

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

export interface CommitApplyResult {
  message: string;
  applied: boolean;
}

/**
 * 标准化提交消息文本，保证后续链路的空值判断一致
 */
export function normalizeCommitMessage(commitMessage?: string | null): string {
  if (!commitMessage) {
    return "";
  }
  return filterCodeBlockMarkers(commitMessage).trim();
}

/**
 * 统一将提交消息写入 SCM 输入框
 */
export async function applyCommitMessageToInput(
  scmProvider: ISCMProvider,
  commitMessage?: string | null,
): Promise<CommitApplyResult> {
  const normalized = normalizeCommitMessage(commitMessage);
  if (!normalized) {
    return { message: "", applied: false };
  }

  await scmProvider.startStreamingInput(normalized);
  return { message: normalized, applied: true };
}
