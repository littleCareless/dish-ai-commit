import { ExtensionConfiguration } from "./types";
import { CONFIG_SCHEMA } from "./ConfigSchema";
import { generateCommitMessageSystemPrompt } from "../prompt/prompt";

export class DefaultConfig {
  static createDefaultConfig(): ExtensionConfiguration {
    const config: any = {};

    // 从 schema 递归生成默认配置
    function generateDefaults(schema: any, target: any = {}) {
      // 添加类型定义
      interface SchemaValue {
        type?: string;
        default?: any;
        description?: string;
        enum?: string[];
        enumDescriptions?: string[];
      }

      for (const [key, value] of Object.entries<SchemaValue>(schema)) {
        if (value && typeof value === "object" && "type" in value) {
          // 如果是叶子节点（具体配置项）
          target[key] = value.default;
        } else {
          // 如果是嵌套配置
          target[key] = {};
          generateDefaults(value, target[key]);
        }
      }
      return target;
    }

    // 生成默认配置
    generateDefaults(CONFIG_SCHEMA, config);

    // 特殊处理 systemPrompt
    config.systemPrompt = generateCommitMessageSystemPrompt(
      config.language,
      config.commitOptions.allowMergeCommits,
      false,
      "git",
      config.commitOptions.useEmoji
    );

    return config as ExtensionConfiguration;
  }
}

export default DefaultConfig.createDefaultConfig();
