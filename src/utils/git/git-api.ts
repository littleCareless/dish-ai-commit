import * as vscode from "vscode";
import { API, GitExtension } from "../../types/git";
import { Logger } from "../logger";
import { notify } from "../notification/notification-manager";
import { getMessage } from "../i18n";

/**
 * 获取 VS Code 内置的 Git 扩展 API
 * @returns {Promise<API | undefined>} Git API 实例，如果获取失败则返回 undefined
 */
export async function getGitApi(): Promise<API | undefined> {
  const logger = Logger.getInstance("Dish AI Commit Gen");
  try {
    logger.info("Getting Git API...");
    
    const extension = vscode.extensions.getExtension<GitExtension>("vscode.git");
    if (!extension) {
      logger.warn("Git extension not found.");
      notify.warn(getMessage("git.extension.not.found"));
      return undefined;
    }
    
    if (!extension.isActive) {
      logger.info("Git extension is not active, activating...");
      await extension.activate();
      logger.info("Git extension activated.");
    }
    
    const api = extension.exports.getAPI(1);
    if (api) {
      logger.info("Git API successfully retrieved.");
    } else {
      logger.warn("Failed to get Git API from extension exports.");
    }
    
    return api;
  } catch (error) {
    logger.error(`Failed to get Git API: ${error}`);
    notify.error(getMessage("git.api.failed.to.get"));
    return undefined;
  }
}

/**
 * 验证 Git 仓库是否可用
 * @param api Git API 实例
 * @returns {boolean} 如果有可用仓库则返回 true
 */
export function hasValidRepository(api: API): boolean {
  return api.repositories.length > 0;
}

/**
 * 获取第一个可用的 Git 仓库
 * @param api Git API 实例
 * @returns {Repository | undefined} 第一个仓库实例，如果没有则返回 undefined
 */
export function getFirstRepository(api: API) {
  if (api.repositories.length === 0) {
    return undefined;
  }
  return api.repositories[0];
}
