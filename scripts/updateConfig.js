"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ConfigSchema_1 = require("../src/config/ConfigSchema");
const ConfigGenerator_1 = require("../src/config/ConfigGenerator");
async function updateAllConfigs() {
    async function traverseSchema(schema, path = "") {
        for (const [key, value] of Object.entries(schema)) {
            const currentPath = path ? `${path}.${key}` : key;
            if ((0, ConfigSchema_1.isConfigValue)(value)) {
                const config = {
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
                await ConfigGenerator_1.ConfigGenerator.addConfig(config);
                console.log(`Updated config: ${currentPath}`);
            }
            else if (value && typeof value === "object") {
                await traverseSchema(value, currentPath);
            }
        }
    }
    try {
        await traverseSchema(ConfigSchema_1.CONFIG_SCHEMA);
        console.log("All configurations updated successfully!");
    }
    catch (error) {
        console.error("Error updating configurations:", error);
        process.exit(1);
    }
}
updateAllConfigs();
