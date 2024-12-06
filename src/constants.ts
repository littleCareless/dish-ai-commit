import * as packageJson from "../package.json";

export const EXTENSION_NAME = packageJson.name;
export const DISPLAY_NAME = packageJson.displayName;

export const COMMANDS = {
  // 从 package.json 的 commands 配置中获取
  GENERATE: packageJson.contributes.commands[0].command,
  SHOW_MODELS: packageJson.contributes.commands[1].command,
  REFRESH_MODELS: `${EXTENSION_NAME}.refreshModels`,
} as const;
