/**
 * 配置更新脚本模块
 * @module updateConfig
 */

import * as fs from "fs";
import * as path from "path";
import {
  CONFIG_SCHEMA,
  isConfigValue,
  ConfigObject,
  generateConfigKeys,
} from "@/config/config-schema";

/**
 * 更新所有配置文件
 * 包括更新 package.json 中的配置属性和生成配置键常量文件
 * @returns {Promise<void>} 更新完成的 Promise
 * @throws {Error} 如果配置更新过程中发生错误
 */
async function updateAllConfigs() {
  /** 扩展名称常量 */
  const EXTENSION_NAME = "dish-ai-commit";

  /**
   * 更新 package.json 中的配置属性
   * @returns {Promise<void>} 更新完成的 Promise
   * @throws {Error} 如果文件读写过程中发生错误
   */
  async function updatePackageJson() {
    const packagePath = path.join(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

    // 确保存在必要的结构
    pkg.contributes = pkg.contributes || {};
    pkg.contributes.configuration = pkg.contributes.configuration || {
      properties: {},
    };

    // 清空现有的配置项
    pkg.contributes.configuration.properties = {};
    const properties = pkg.contributes.configuration.properties;

    /**
     * 递归遍历配置模式对象,生成 VSCode 配置属性
     * @param {ConfigObject} obj - 配置对象
     * @param {string} [currentPath=""] - 当前配置路径
     */
    function traverse(obj: ConfigObject, currentPath: string = "") {
      for (const [key, value] of Object.entries(obj)) {
        // 构建完整的配置键路径
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        const configKey = `${EXTENSION_NAME}.${fullPath}`;

        if (isConfigValue(value)) {
          // 构建基础配置属性对象
          const configProperty: Record<string, any> = {
            type: value.type,
            default: value.default,
            description: value.description,
          };

          // 处理字符串类型特有的枚举配置
          if (value.type === "string") {
            if ("enum" in value) {
              configProperty.enum = value.enum;
            }
            if ("enumDescriptions" in value) {
              configProperty.enumDescriptions = value.enumDescriptions;
            }
          }

          // 添加配置作用域
          if ("scope" in value) {
            configProperty.scope = value.scope;
          }

          properties[configKey] = configProperty;
        } else if (typeof value === "object") {
          // 递归处理嵌套对象
          traverse(value as ConfigObject, fullPath);
        }
      }
    }

    traverse(CONFIG_SCHEMA);
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
    console.log("✅ package.json updated successfully");
  }

  /**
   * 更新配置键常量文件
   * 生成 TypeScript 常量定义文件
   * @returns {Promise<void>} 更新完成的 Promise
   * @throws {Error} 如果文件写入失败
   */
  async function updateConfigKeys() {
    // 生成配置键对象
    const keys = generateConfigKeys(CONFIG_SCHEMA);
    const content = `// This file is auto-generated, do not edit manually
export const CONFIG_KEYS = ${JSON.stringify(keys, null, 2)} as const;
`;
    const configKeysPath = path.join(
      process.cwd(),
      "src/config/generated/config-keys.ts"
    );

    // 确保目标目录存在
    const dir = path.dirname(configKeysPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(configKeysPath, content);
    console.log("✅ Config keys generated successfully");
  }

  try {
    // 并行执行两个更新任务
    await Promise.all([updatePackageJson(), updateConfigKeys()]);

    console.log("🎉 All configurations updated successfully!");
  } catch (error) {
    console.error("❌ Error updating configurations:", error);
    process.exit(1);
  }
}

updateAllConfigs();
