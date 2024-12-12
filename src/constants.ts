import * as packageJson from "../package.json";

export const EXTENSION_NAME = packageJson.name;
export const DISPLAY_NAME = packageJson.displayName;

// 使用命名空间组织命令
export const COMMANDS = {
  COMMIT: {
    GENERATE: packageJson.contributes.commands[0].command,
  },
  MODEL: {
    SHOW: packageJson.contributes.commands[1].command,
  },
  WEEKLY_REPORT: {
    GENERATE: packageJson.contributes.commands[2].command,
  },
} as const;

// 添加类型导出
export type CommandType = typeof COMMANDS;
