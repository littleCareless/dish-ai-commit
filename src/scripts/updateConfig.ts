import * as fs from "fs";
import * as path from "path";
import {
  CONFIG_SCHEMA,
  isConfigValue,
  ConfigObject,
  generateConfigKeys,
} from "../config/ConfigSchema";

async function updateAllConfigs() {
  const EXTENSION_NAME = "dish-ai-commit";

  // 更新 package.json
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

    // 递归遍历 CONFIG_SCHEMA 生成配置
    function traverse(obj: ConfigObject, currentPath: string = "") {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        const configKey = `${EXTENSION_NAME}.${fullPath}`;

        if (isConfigValue(value)) {
          const configProperty: Record<string, any> = {
            type: value.type,
            default: value.default,
            description: value.description,
          };

          // 只有字符串类型的配置才可能有枚举值和枚举描述
          if (value.type === "string") {
            if ("enum" in value) {
              configProperty.enum = value.enum;
            }
            if ("enumDescriptions" in value) {
              configProperty.enumDescriptions = value.enumDescriptions;
            }
          }

          // 添加作用域设置
          if ("scope" in value) {
            configProperty.scope = value.scope;
          }

          properties[configKey] = configProperty;
        } else if (typeof value === "object") {
          traverse(value as ConfigObject, fullPath);
        }
      }
    }

    traverse(CONFIG_SCHEMA);
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
    console.log("✅ package.json updated successfully");
  }

  // 更新配置键常量
  async function updateConfigKeys() {
    const keys = generateConfigKeys(CONFIG_SCHEMA);
    const content = `// This file is auto-generated, do not edit manually
export const CONFIG_KEYS = ${JSON.stringify(keys, null, 2)} as const;
`;
    const configKeysPath = path.join(
      process.cwd(),
      "src/config/generated/configKeys.ts"
    );

    // 确保目录存在
    const dir = path.dirname(configKeysPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(configKeysPath, content);
    console.log("✅ Config keys generated successfully");
  }

  try {
    await Promise.all([updatePackageJson(), updateConfigKeys()]);

    console.log("🎉 All configurations updated successfully!");
  } catch (error) {
    console.error("❌ Error updating configurations:", error);
    process.exit(1);
  }
}

updateAllConfigs();
