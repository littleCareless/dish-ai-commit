import { Logger } from "@/utils/logger";
import type { WorkspaceInfo } from "@shared/types/prompts";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import * as vscode from "vscode";

const logger = Logger.getInstance("Dish AI Commit");

/**
 * 工作区管理器
 * 负责管理工作区标识、信息获取等
 */
export class WorkspaceManager {
  private static instance: WorkspaceManager;

  public static getInstance(): WorkspaceManager {
    if (!WorkspaceManager.instance) {
      WorkspaceManager.instance = new WorkspaceManager();
    }
    return WorkspaceManager.instance;
  }

  /**
   * 获取所有工作区信息
   * @returns 工作区信息数组
   */
  public getAllWorkspaces(): WorkspaceInfo[] {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return [];
    }

    return folders.map((folder) => ({
      id: this.getWorkspaceId(folder),
      name: folder.name,
      path: folder.uri.fsPath,
    }));
  }

  /**
   * 获取当前激活的工作区（第一个）
   * @returns 当前工作区信息，如果没有则返回 null
   */
  public getCurrentWorkspace(): WorkspaceInfo | null {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return null;
    }

    const folder = folders[0];
    return {
      id: this.getWorkspaceId(folder),
      name: folder.name,
      path: folder.uri.fsPath,
    };
  }

  /**
   * 获取指定工作区的 ID
   * 优先级：.dish/workspace-id > 生成新ID
   * @param workspaceFolder - VSCode 工作区文件夹
   * @returns 工作区唯一标识符
   */
  public getWorkspaceId(workspaceFolder: vscode.WorkspaceFolder): string {
    const idFilePath = path.join(
      workspaceFolder.uri.fsPath,
      ".dish",
      "workspace-id",
    );

    // 读取现有 ID
    if (fs.existsSync(idFilePath)) {
      try {
        const id = fs.readFileSync(idFilePath, "utf-8").trim();
        if (id) {
          return id;
        }
      } catch (error) {
        logger.warn(`Failed to read workspace ID from ${idFilePath}`, {
          error: error as Error,
        });
      }
    }

    // 生成新 ID
    try {
      const newId = uuidv4();
      fs.mkdirSync(path.dirname(idFilePath), { recursive: true });
      fs.writeFileSync(idFilePath, newId);
      logger.debug(`Created new workspace ID for ${workspaceFolder.name}`, {
        data: { id: newId, path: workspaceFolder.uri.fsPath },
      });
      return newId;
    } catch (error) {
      logger.error(
        `Failed to create workspace ID for ${workspaceFolder.name}`,
        {
          error: error as Error,
        },
      );
      // 回退：使用路径作为 ID（不理想但可用）
      return workspaceFolder.uri.fsPath;
    }
  }

  /**
   * 根据 workspace-id 查找工作区
   * @param workspaceId - 工作区 ID
   * @returns 工作区信息，如果未找到则返回 null
   */
  public getWorkspaceById(workspaceId: string): WorkspaceInfo | null {
    const workspaces = this.getAllWorkspaces();
    return workspaces.find((w) => w.id === workspaceId) || null;
  }

  /**
   * 检查工作区是否有效
   * @param workspaceId - 工作区 ID
   * @returns 是否有效
   */
  public isValidWorkspace(workspaceId: string): boolean {
    return this.getWorkspaceById(workspaceId) !== null;
  }

  /**
   * 获取工作区显示名称（用于 UI）
   * @param workspaceId - 工作区 ID
   * @returns 工作区显示名称
   */
  public getWorkspaceDisplayName(workspaceId: string): string {
    const workspace = this.getWorkspaceById(workspaceId);
    return workspace ? workspace.name : "Unknown Workspace";
  }

  /**
   * 获取工作区完整路径（用于 UI）
   * @param workspaceId - 工作区 ID
   * @returns 工作区完整路径
   */
  public getWorkspacePath(workspaceId: string): string {
    const workspace = this.getWorkspaceById(workspaceId);
    return workspace ? workspace.path : "Unknown Path";
  }
}

// 导出单例实例
export const workspaceManager = WorkspaceManager.getInstance();
