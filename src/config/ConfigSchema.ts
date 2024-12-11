export const CONFIG_SCHEMA = {
  base: {
    // 基础配置
    language: {
      type: "string",
      default: "Simplified Chinese",
      description: "Commit message language",
      enum: [
        "Simplified Chinese",
        "Traditional Chinese",
        "Japanese",
        "Korean",
        "Czech",
        "German",
        "French",
        "Italian",
        "Dutch",
        "Portuguese",
        "Vietnamese",
        "English",
        "Spanish",
        "Swedish",
        "Russian",
        "Bahasa",
        "Polish",
        "Turkish",
        "Thai",
      ],
      enumDescriptions: [
        "简体中文",
        "繁體中文",
        "にほんご",
        "한국어",
        "česky",
        "Deutsch",
        "française",
        "italiano",
        "Nederlands",
        "português",
        "tiếng Việt",
        "english",
        "español",
        "Svenska",
        "русский",
        "bahasa",
        "Polski",
        "Turkish",
        "ไทย",
      ],
    },
    systemPrompt: {
      type: "string",
      description: "Custom system prompt",
      default: "",
    },
    provider: {
      type: "string",
      default: "OpenAI", // 其他都是用OpenAI的SDK适配
      enum: ["OpenAI", "Ollama", "VS Code Provided"],
      description: "AI provider",
    },
    model: {
      type: "string",
      default: "gpt-3.5-turbo",
      description: "AI Model",
    },
  },
  providers: {
    // 所有 Provider 的配置
    openai: {
      apiKey: {
        type: "string",
        default: "",
        description: "OpenAI API 密钥",
      },
      baseUrl: {
        type: "string",
        default: "https://api.openai.com/v1",
        description: "OpenAI API 基础 URL",
      },
    },
    zhipuai: {
      apiKey: {
        type: "string",
        default: "",
        description: "智谱 AI API 密钥",
      },
    },
    dashscope: {
      apiKey: {
        type: "string",
        default: "",
        description: "DashScope API 密钥",
      },
    },
    doubao: {
      apiKey: {
        type: "string",
        default: "",
        description: "豆包 API 密钥",
      },
    },
    ollama: {
      baseUrl: {
        type: "string",
        default: "http://localhost:11434",
        description: "Ollama API 基础 URL",
      },
    },
  },
  features: {
    // 功能配置
    diffSimplification: {
      enabled: {
        type: "boolean",
        default: false,
        description:
          "启用 diff 内容简化功能（警告：启用此功能可能会导致生成的提交信息不够准确）",
      },
      maxLineLength: {
        type: "number",
        default: 120,
        description: "简化后每行的最大长度",
      },
      contextLines: {
        type: "number",
        default: 3,
        description: "保留的上下文行数",
      },
    },
    commitOptions: {
      allowMergeCommits: {
        type: "boolean",
        default: false,
        description: "是否允许将多个文件的变更合并为一条提交信息",
      },
      useEmoji: {
        type: "boolean",
        default: true,
        description: "在提交信息中使用 emoji",
      },
    },
  },
} as const;

// 更新 ConfigValue 接口定义为更具体的联合类型
type ConfigValueType = {
  type: "string" | "boolean" | "number";
  default: any;
  description: string;
  enum?: readonly string[];
  enumDescriptions?: readonly string[];
  isSpecial?: boolean;
};

export interface ConfigValue extends ConfigValueType {}

// 添加配置值的接口定义
export interface ConfigObject {
  [key: string]: ConfigValue | ConfigObject;
}

// 修改 SchemaType 定义
export type SchemaType = {
  [K in keyof typeof CONFIG_SCHEMA]: {
    [P in keyof (typeof CONFIG_SCHEMA)[K]]: ConfigValue | ConfigObject;
  };
};

// 生成类型
export type ConfigPath = string; // 例如: "providers.openai.apiKey"

// 辅助函数：从模式生成配置键
export function generateConfigKeys(
  schema: SchemaType,
  prefix: string = ""
): Record<string, string> {
  const keys: Record<string, string> = {};

  function traverse(obj: any, path: string = "") {
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;
      if ((value as any).type) {
        const configKey = `${prefix}${fullPath}`
          .replace(/\./g, "_")
          .toUpperCase();
        keys[configKey] = `dish-ai-commit.${fullPath}`;
      } else {
        traverse(value, fullPath);
      }
    }
  }

  traverse(schema);
  return keys;
}

// 生成配置元数据
export function generateConfigMetadata(schema: SchemaType) {
  const metadata: any[] = [];

  function traverse(obj: ConfigObject, path: string = "") {
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;
      if ("type" in value) {
        metadata.push({
          key: fullPath.replace(/\./g, "_").toUpperCase(),
          defaultValue: value.default,
          nested: fullPath.includes("."),
          parent: fullPath.split(".")[0],
          description: value.description,
          type: value.type,
          enum: value.enum,
          enumDescriptions: value.enumDescriptions,
          isSpecial: value.isSpecial,
        });
      } else {
        traverse(value as ConfigObject, fullPath);
      }
    }
  }

  traverse(schema as unknown as ConfigObject);
  return metadata;
}

// 添加类型判断辅助函数
export function isConfigValue(value: unknown): value is ConfigValue {
  return (
    value !== null &&
    typeof value === "object" &&
    "type" in value &&
    "description" in value
  );
}

// 添加新的辅助函数
export function generateConfiguration(
  schema: typeof CONFIG_SCHEMA,
  getConfig: (key: string) => any
) {
  const result: any = {};

  function traverse(obj: ConfigObject, currentPath: string = "") {
    for (const [key, value] of Object.entries(obj)) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;

      if (isConfigValue(value)) {
        // 是配置项
        const configValue = getConfig(newPath) ?? value.default;

        // 处理路径，将配置值放在正确的嵌套位置
        const pathParts = newPath.split(".");
        let current = result;

        for (let i = 0; i < pathParts.length - 1; i++) {
          if (!(pathParts[i] in current)) {
            current[pathParts[i]] = {};
          }
          current = current[pathParts[i]];
        }

        current[pathParts[pathParts.length - 1]] = configValue;
      } else {
        // 是分类
        traverse(value as ConfigObject, newPath);
      }
    }
  }

  traverse(schema as unknown as ConfigObject);
  return result;
}
