import * as packageJson from "../package.json";

/** 扩展的包名 */
export const EXTENSION_NAME = packageJson.name;

/** 扩展的显示名称 */
export const DISPLAY_NAME = packageJson.displayName;

/**
 * 使用命名空间组织的命令常量
 * @namespace
 */
export const COMMANDS = {
  /** Commit相关命令 */
  COMMIT: {
    /** 生成commit信息的命令 */
    GENERATE: packageJson.contributes.commands[0].command,
  },
  /** 模型相关命令 */
  MODEL: {
    /** 显示模型选择的命令 */
    SHOW: packageJson.contributes.commands[1].command,
  },
  /** 周报相关命令 */
  WEEKLY_REPORT: {
    /** 生成周报的命令 */
    GENERATE: packageJson.contributes.commands[2].command,
  },
  /** 代码审查相关命令 */
  CODE_REVIEW: {
    /** 执行代码审查的命令 */
    REVIEW: packageJson.contributes.commands[3].command,
  },
  /** 分支名称相关命令 */
  BRANCH_NAME: {
    /** 生成分支名称的命令 */
    GENERATE: packageJson.contributes.commands[4].command,
  },
  /** PR Summary相关命令 */
  PR_SUMMARY: {
    /** 生成PR摘要的命令 */
    GENERATE: packageJson.contributes.commands[5].command,
  },
} as const;

/** COMMANDS常量的TypeScript类型 */
export type CommandType = typeof COMMANDS;
