import { CONFIG_SCHEMA } from "../config-schema";
import type { ConfigObject } from "../config-schema";
import { isConfigValue } from "./config-validation";

/**
 * Generates configuration object from schema
 * @param {typeof CONFIG_SCHEMA} schema - Configuration schema
 * @param {(key: string) => any} getConfig - Function to retrieve config values
 * @returns {any} Generated configuration object
 */
export function generateConfiguration(
  schema: typeof CONFIG_SCHEMA,
  // schema: ConfigObject,
  getConfig: (key: string) => any
) {
  const result: any = {};

  /**
   * Recursively traverses schema to build configuration
   * @param {ConfigObject} obj - Current configuration object
   * @param {string} currentPath - Current path in configuration
   */
  function traverse(obj: ConfigObject, currentPath: string = "") {
    for (const [key, value] of Object.entries(obj)) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;

      if (isConfigValue(value)) {
        // Get config value or use default
        const configValue = getConfig(newPath) ?? value.default;

        // Handle nested path
        const pathParts = newPath.split(".");
        let current = result;

        // Build nested object structure
        for (let i = 0; i < pathParts.length - 1; i++) {
          if (!(pathParts[i] in current)) {
            current[pathParts[i]] = {};
          }
          current = current[pathParts[i]];
        }

        // Set final value
        current[pathParts[pathParts.length - 1]] = configValue;
      } else {
        // Continue traversing nested objects
        traverse(value as ConfigObject, newPath);
      }
    }
  }

  traverse(schema as unknown as ConfigObject);
  return result;
}

/**
 * Gets all configuration paths from schema
 * @param {typeof CONFIG_SCHEMA} schema - Configuration schema
 * @returns {string[]} Array of all configuration paths
 */
export function getAllConfigPaths(schema: typeof CONFIG_SCHEMA): string[] {
  const paths: string[] = [];

  function traverse(obj: ConfigObject, currentPath: string = ""): void {
    for (const [key, value] of Object.entries(obj)) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      if (isConfigValue(value)) {
        paths.push(newPath);
      } else {
        traverse(value as ConfigObject, newPath);
      }
    }
  }

  traverse(schema as unknown as ConfigObject);
  return paths;
}

/**
 * Gets configuration paths for a specific category
 * @param {typeof CONFIG_SCHEMA} schema - Configuration schema
 * @param {keyof typeof CONFIG_SCHEMA} category - Category to get paths for
 * @returns {string[]} Array of category configuration paths
 */
export function getCategoryConfigPaths(
  schema: typeof CONFIG_SCHEMA,
  category: keyof typeof CONFIG_SCHEMA
): string[] {
  return getAllConfigPaths(schema).filter((path) => path.startsWith(category));
}
