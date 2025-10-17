/**
 * 从 DiffProcessor 处理过的结构化字符串中提取原始代码和代码变更。
 * @param processedDiff - 由 DiffProcessor.process 生成的字符串。
 * @returns 包含 originalCode 和 codeChanges 的对象。
 */
export function extractProcessedDiff(processedDiff: string): {
  originalCode: string;
  codeChanges: string;
} {
  const originalCodeMatch =
    processedDiff.match(/<original-code>([\s\S]*?)<\/original-code>/) || [];
  const codeChangesMatch =
    processedDiff.match(/<code-changes>([\s\S]*?)<\/code-changes>/) || [];

  const originalCode = (originalCodeMatch[1] || "")?.trim();
  const codeChanges = (codeChangesMatch[1] || "")?.trim();

  return { originalCode, codeChanges };
}

