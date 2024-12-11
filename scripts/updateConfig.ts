import { CONFIG_SCHEMA, isConfigValue } from "../src/config/ConfigSchema";
import {
  ConfigGenerator,
  ConfigDefinition,
} from "../src/config/ConfigGenerator";

async function updateAllConfigs() {
  async function traverseSchema(
    schema: Record<string, any>,
    path: string = ""
  ) {
    for (const [key, value] of Object.entries(schema)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (isConfigValue(value)) {
        const config: ConfigDefinition = {
          key: currentPath,
          type: value.type,
          default: value.default,
          description: value.description,
          ...(value.enum && { enum: value.enum }),
          ...(value.enumDescriptions && {
            enumDescriptions: value.enumDescriptions,
          }),
          ...(value.isSpecial && { isSpecial: value.isSpecial }),
        };

        await ConfigGenerator.addConfig(config);
        console.log(`Updated config: ${currentPath}`);
      } else if (value && typeof value === "object") {
        await traverseSchema(value, currentPath);
      }
    }
  }

  try {
    await traverseSchema(CONFIG_SCHEMA);
    console.log("All configurations updated successfully!");
  } catch (error) {
    console.error("Error updating configurations:", error);
    process.exit(1);
  }
}

updateAllConfigs();
