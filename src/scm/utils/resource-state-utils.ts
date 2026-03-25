import * as vscode from "vscode";

/**
 * 提取文件路径，优先使用 renameResourceUri（重命名后的文件）
 */
export function extractResourceFilePath(
  state: vscode.SourceControlResourceState,
): string | undefined {
  const renamedPath = (state as any)?.renameResourceUri?.fsPath;
  if (renamedPath) {
    return renamedPath;
  }
  return (state as any)?._resourceUri?.fsPath || state?.resourceUri?.fsPath;
}

/**
 * 从 SCM resource states 中提取去重后的文件路径列表
 */
export function extractResourceFilePaths(
  resourceStates?:
    | vscode.SourceControlResourceState
    | vscode.SourceControlResourceState[],
): string[] {
  if (!resourceStates) {
    return [];
  }

  const states = (
    Array.isArray(resourceStates) ? resourceStates : [resourceStates]
  ).filter(Boolean);

  if (states.length === 0) {
    return [];
  }

  return [
    ...new Set(
      states
        .map((state) => extractResourceFilePath(state))
        .filter((path): path is string => Boolean(path)),
    ),
  ];
}

/**
 * 与 extractResourceFilePaths 相同，但当结果为空时返回 undefined
 */
export function extractResourceFilePathsOrUndefined(
  resourceStates?:
    | vscode.SourceControlResourceState
    | vscode.SourceControlResourceState[],
): string[] | undefined {
  const files = extractResourceFilePaths(resourceStates);
  return files.length > 0 ? files : undefined;
}
