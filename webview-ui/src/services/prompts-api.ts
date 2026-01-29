import { postMessage } from "@/utils/vscode";
import { UIRequest } from "@shared/types/messages";
import { PromptCategory, CommitSubCategory } from "@shared/types/prompts";

/**
 * 提示词 API 服务
 * 封装所有与 VS Code 扩展通信的消息请求
 */

/**
 * 加载所有提示词
 */
export function loadAllPrompts(): void {
  postMessage(UIRequest.PromptGetAll, {});
}

/**
 * 加载工作区状态（活跃提示词和源信息）
 */
export function loadWorkspaceStates(): void {
  postMessage(UIRequest.FeaturesGetAllWorkspaceStates, {});
}

/**
 * 加载工作区信息
 */
export function loadWorkspaceInfo(): void {
  postMessage(UIRequest.FeaturesGetWorkspaceInfo, {});
}

/**
 * 更新提示词内容
 */
export function updatePrompt(
  key: string,
  content: string,
  target: "global" | "workspace" | "workspaceFolder",
  workspaceId?: string,
): void {
  postMessage(UIRequest.PromptUpdate, {
    key,
    content,
    target,
    workspaceId,
  });
}

/**
 * 重置单个提示词
 */
export function resetPrompt(key: string, target: "global" | "workspace"): void {
  postMessage(UIRequest.PromptReset, {
    key,
    target,
  });
}

/**
 * 重置所有提示词
 */
export function resetAllPrompts(target: "global"): void {
  postMessage(UIRequest.PromptResetAll, {
    target,
  });
}

/**
 * 创建新提示词
 */
export function createPrompt(
  key: string,
  content: string,
  category: PromptCategory,
  subCategory?: CommitSubCategory,
  title?: string,
): void {
  postMessage(UIRequest.PromptCreate, {
    key,
    content,
    category,
    subCategory,
    title,
  });
}

/**
 * 删除提示词
 */
export function deletePrompt(
  key: string,
  target: "global" | "workspace" | "workspaceFolder",
): void {
  postMessage(UIRequest.PromptDelete, {
    key,
    target,
  });
}

/**
 * 重命名提示词
 */
export function renamePrompt(
  oldKey: string,
  newKey: string,
  target: "global" | "workspace" | "project",
): void {
  postMessage(UIRequest.PromptRename, {
    oldKey,
    newKey,
    target,
  });
}

/**
 * 设置活跃提示词
 */
export function setActivePrompt(
  category: PromptCategory,
  key: string,
  workspaceId?: string,
): void {
  postMessage(UIRequest.FeaturesSetActivePrompt, {
    category,
    key,
    workspaceId,
  });
}
