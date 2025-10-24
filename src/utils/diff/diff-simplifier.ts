import * as vscode from "vscode";
import { DiffConfig } from "./types";
import { getDiffConfig } from "./types";

/**
 * 用于简化和格式化差异文本的工具类
 * 可配置上下文行数和最大行长度，支持差异文本的精简化处理
 */
export class DiffSimplifier {
  /**
   * 缓存的配置对象
   * @private
   * @property {boolean} enabled - 是否启用差异简化
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
    this.configCache = getDiffConfig();
    return this.configCache;
  }

  /**
   * 清除配置缓存，用于配置更新时刷新设置
   */
  static clearConfigCache() {
    this.configCache = null;
  }

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

    const lines = diff?.split("\n");
    let simplified: string[] = [];

    // 处理上下文行数限制
    if (config.contextLines !== undefined && config.contextLines > 0) {
      simplified = this.limitContextLines(lines, config.contextLines);
    } else {
      simplified = lines;
    }

    // 处理每一行
    for (let i = 0; i < simplified.length; i++) {
      let line = simplified[i];

      // 压缩空格
      line = this.compressLine(line);

      // 限制行长度
      // if (config.maxLineLength && config.maxLineLength > 0) {
      //   line = this.truncateLine(line, config.maxLineLength);
      // }

      simplified[i] = line;
    }

    return simplified.join("\n");
  }

  /**
   * 限制上下文行数
   * @private
   */
  private static limitContextLines(
    lines: string[],
    maxContext: number
  ): string[] {
    const result: string[] = [];
    let currentHunk: string[] = [];
    let contextCount = 0;

    for (const line of lines) {
      if (this.isHeaderLine(line)) {
        // 保留所有头部信息
        if (currentHunk.length > 0) {
          result.push(...currentHunk);
          currentHunk = [];
        }
        result.push(line);
        contextCount = 0;
      } else if (this.isHunkHeader(line)) {
        // 保留 hunk 头部
        if (currentHunk.length > 0) {
          result.push(...currentHunk);
          currentHunk = [];
        }
        result.push(line);
        contextCount = 0;
      } else if (this.isChangeLine(line)) {
        // 保留所有变更行
        currentHunk.push(line);
        contextCount = 0;
      } else {
        // 上下文行
        if (contextCount < maxContext) {
          currentHunk.push(line);
          contextCount++;
        } else if (this.hasChangesAhead(lines, lines.indexOf(line))) {
          // 如果后面还有变更，保留一些上下文
          currentHunk.push(line);
        }
      }
    }

    if (currentHunk.length > 0) {
      result.push(...currentHunk);
    }

    return result;
  }

  /**
   * 检查后面是否还有变更行
   * @private
   */
  private static hasChangesAhead(
    lines: string[],
    currentIndex: number
  ): boolean {
    for (let i = currentIndex + 1; i < lines.length; i++) {
      if (this.isChangeLine(lines[i])) {
        return true;
      }
      if (this.isHunkHeader(lines[i])) {
        return true;
      }
    }
    return false;
  }

  /**
   * 截断过长的行
   * @private
   */
  private static truncateLine(line: string, maxLength: number): string {
    if (line.length <= maxLength) {
      return line;
    }

    const prefix = line.match(/^[+\-@\s]/)?.at(0) ?? "";
    const content = line.substring(prefix.length);

    if (content.length <= maxLength - prefix.length - 3) {
      return line;
    }

    return prefix + content.substring(0, maxLength - prefix.length - 3) + "...";
  }

  /**
   * 压缩行中的空格
   * - 合并连续空格为单个空格
   * - 去除行尾空格
   * - 保留行首缩进(最多保留2个空格)
   * @private
   */
  private static compressLine(line: string): string {
    if (!line) {
      return line;
    }

    // 保留差异标记(+/-等)
    const prefix = line.match(/^[+\-@\s]/)?.at(0) ?? "";
    let content = prefix ? line.substring(1) : line;

    // 处理行首缩进
    const indent = content.match(/^\s*/)?.at(0) ?? "";
    content = content.substring(indent.length);

    // 压缩空格
    content = content
      ?.trim() // 去除首尾空格
      .replace(/\s+/g, " "); // 合并连续空格

    // 重建行,保留最多2个缩进空格
    return (
      prefix +
      (indent.length > 0 ? " ".repeat(Math.min(2, indent.length)) : "") +
      content
    );
  }

  /**
   * 检查是否为文件头部行
   * @private
   */
  private static isHeaderLine(line: string): boolean {
    return (
      line.startsWith("Index:") ||
      line.startsWith("===") ||
      line.startsWith("---") ||
      line.startsWith("+++") ||
      line.startsWith("diff --git")
    );
  }

  /**
   * 检查是否为 hunk 头部行
   * @private
   */
  private static isHunkHeader(line: string): boolean {
    return line.startsWith("@@");
  }

  /**
   * 检查是否为变更行
   * @private
   */
  private static isChangeLine(line: string): boolean {
    return line.startsWith("+") || line.startsWith("-");
  }
}
