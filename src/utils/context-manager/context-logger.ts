import { notify } from "../notification";
import { formatMessage } from "../i18n";

/**
 * 上下文日志记录器
 */
export class ContextLogger {
  private suppressNonCriticalWarnings: boolean;

  constructor(suppressNonCriticalWarnings: boolean = false) {
    this.suppressNonCriticalWarnings = suppressNonCriticalWarnings;
  }

  /**
   * 记录上下文区块报告
   * @param includedBlockNames 已包含的区块名称数组
   * @param excludedBlockNames 已排除的区块名称数组
   */
  logContextBlockReport(
    includedBlockNames: string[],
    excludedBlockNames: string[]
  ): void {
    this.logExcludedBlocks(excludedBlockNames);
    this.logIncludedBlocks(includedBlockNames);
    this.logExcludedBlocksToConsole(excludedBlockNames);
  }

  /**
   * 记录被排除的区块警告
   * @param excludedBlockNames 被排除的区块名称数组
   */
  private logExcludedBlocks(excludedBlockNames: string[]): void {
    if (excludedBlockNames.length > 0 && !this.suppressNonCriticalWarnings) {
      notify.warn(
        formatMessage("context.block.removed", [excludedBlockNames.join(", ")])
      );
    }
  }

  /**
   * 记录包含的区块到控制台
   * @param includedBlockNames 包含的区块名称数组
   */
  private logIncludedBlocks(includedBlockNames: string[]): void {
    console.log("Included context blocks:", includedBlockNames.join(", "));
  }

  /**
   * 记录排除的区块到控制台
   * @param excludedBlockNames 排除的区块名称数组
   */
  private logExcludedBlocksToConsole(excludedBlockNames: string[]): void {
    if (excludedBlockNames.length > 0) {
      console.log("Excluded context blocks:", excludedBlockNames.join(", "));
    }
  }
}