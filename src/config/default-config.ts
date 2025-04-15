import { ExtensionConfiguration } from "./types";
import { CONFIG_SCHEMA } from "./config-schema";
import { generateCommitMessageSystemPrompt } from "../prompt/generate-commit";

/**
 * 默认配置生成类
 */
export class DefaultConfig {
  /**
   * 创建默认配置对象
   * @returns {ExtensionConfiguration} 根据 schema 生成的默认配置对象
   */
  static createDefaultConfig(): ExtensionConfiguration {
    const config: any = {};

    /**
     * 递归生成默认配置值
     * @param {any} schema 配置模式对象
     * @param {any} target 目标配置对象
     * @returns {any} 生成的配置对象
     */
    function generateDefaults(schema: any, target: any = {}) {
      /** Schema 值类型定义 */
      interface SchemaValue {
        /** 值类型 */
        type?: string;
        /** 默认值 */
        default?: any;
        /** 描述文本 */
        description?: string;
        /** 枚举值列表 */
        enum?: string[];
        /** 枚举值描述列表 */
        enumDescriptions?: string[];
      }

      // 遍历 schema 对象的每个属性
      for (const [key, value] of Object.entries<SchemaValue>(schema)) {
        if (value && typeof value === "object" && "type" in value) {
          // 如果是具体配置项，使用其默认值
          target[key] = value.default;
        } else {
          // 如果是嵌套配置，递归处理
          target[key] = {};
          generateDefaults(value, target[key]);
        }
      }
      return target;
    }

    // 生成默认配置
    generateDefaults(CONFIG_SCHEMA, config);

    return config as ExtensionConfiguration;
  }
}

/** 默认配置实例 */
export default DefaultConfig.createDefaultConfig();
