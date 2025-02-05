import * as vscode from "vscode";
import { DiffConfig } from './types';

/**
 * 用于简化和格式化差异文本的工具类
 * 可配置上下文行数和最大行长度，支持差异文本的精简化处理
 */
export class DiffSimplifier {
  /**
   * 缓存的配置对象
   * @private
   * @property {boolean} enabled - 是否启用差异简化
   * @property {number} contextLines - 保留的上下文行数
   * @property {number} maxLineLength - 单行最大长度
   */
  private static configCache: DiffConfig | null = null;

  /**
   * 从 VSCode 配置中获取差异简化的相关设置
   * @private
   * @returns {Object} 包含差异简化配置的对象
   */
  static getConfig(): DiffConfig {
    if (this.configCache) {
      return this.configCache;
    }

    const config = vscode.workspace.getConfiguration("dish-ai-commit");
    this.configCache = {
      enabled: config.get<boolean>("enableDiffSimplification") ?? false,
      contextLines: config.get<number>("diffSimplification.contextLines") ?? 3,
      maxLineLength:
        config.get<number>("diffSimplification.maxLineLength") ?? 120,
    };

    return this.configCache;
  }

  /**
   * 清除配置缓存，用于配置更新时刷新设置
   */
  static clearConfigCache() {
    this.configCache = null;
  }

  private static readonly CONTEXT_LINES = 3;
  private static readonly MAX_LINE_LENGTH = 120;

  /**
   * 简化差异文本，根据配置处理上下文行数和行长度
   * @param {string} diff - 原始差异文本
   * @returns {string} 简化后的差异文本
   */
  static simplify(diff: string): string {
    const config = this.getConfig();

    // 如果未启用简化，直接返回原文
    if (!config.enabled) {
      return diff;
    }

    const lines = diff.split("\n");
    const simplified: string[] = [];
    let skipCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 保留 diff 头信息（Index、===、---、+++）
      if (this.isHeaderLine(line)) {
        simplified.push(line);
        continue;
      }

      // 处理修改行（以 + 或 - 开头）
      if (this.isChangeLine(line)) {
        simplified.push(this.truncateLine(line, config.maxLineLength));
        skipCount = 0;
        continue;
      }

      // 处理上下文行，保留配置的行数
      if (skipCount < config.contextLines) {
        simplified.push(this.truncateLine(line, config.maxLineLength));
        skipCount++;
      } else if (skipCount === config.contextLines) {
        simplified.push("..."); // 添加省略标记
        skipCount++;
      }
    }

    return simplified.join("\n");
  }

  /**
   * 截断过长的行，添加省略号
   * @private
   * @param {string} line - 需要处理的行
   * @param {number} maxLength - 最大允许长度
   * @returns {string} 处理后的行
   */
  private static truncateLine(line: string, maxLength: number): string {
    if (!line || line.length <= maxLength) {
      return line;
    }
    const ellipsis = "...";
    return `${line.substring(0, maxLength - ellipsis.length)}${ellipsis}`;
  }

  private static isHeaderLine(line: string): boolean {
    return line.startsWith('Index:') || 
           line.startsWith('===') || 
           line.startsWith('---') || 
           line.startsWith('+++');
  }

  private static isChangeLine(line: string): boolean {
    return line.startsWith('+') || line.startsWith('-');
  }
}
