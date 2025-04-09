import type { ConfigObject, ConfigValue, SchemaType } from "../config-schema";
import { isConfigValue } from "./config-validation";

/**
 * Generates configuration keys from schema
 * @param {SchemaType} schema - Configuration schema
 * @param {string} [prefix=''] - Optional prefix for nested keys
 * @returns {Record<string, string>} Generated configuration keys
 */
export function generateConfigKeys(
  schema: SchemaType,
  prefix: string = ""
): Record<string, string> {
  const keys: Record<string, string> = {};

  /**
   * Recursively traverse the configuration object to generate keys
   * @param {ConfigObject} obj - Current configuration object being processed
   * @param {string} [path=''] - Current path in the configuration hierarchy
   */
  function traverse(obj: ConfigObject, path: string = "") {
    for (const [key, value] of Object.entries(obj)) {
      // Generate full path by combining current path and key
      const fullPath = path ? `${path}.${key}` : key;

      if (isConfigValue(value)) {
        // For configuration values, generate full configuration key
        const configKey = fullPath.replace(/\./g, "_").toUpperCase();
        keys[configKey] = `dish-ai-commit.${fullPath}`;
      } else {
        // For nested objects, generate intermediate key and continue traversal
        const intermediateKey = fullPath.replace(/\./g, "_").toUpperCase();
        keys[intermediateKey] = `dish-ai-commit.${fullPath}`;
        traverse(value as ConfigObject, fullPath);
      }
    }
  }

  traverse(schema as unknown as ConfigObject);
  return keys;
}
