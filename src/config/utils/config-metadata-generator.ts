import type { ConfigObject, ConfigValue, SchemaType } from "../config-schema";
import { isConfigValue } from "./config-validation";

/**
 * Configuration metadata item interface
 * @interface ConfigMetadataItem
 */
export interface ConfigMetadataItem {
  key: string;
  defaultValue: any;
  nested: boolean;
  parent: string;
  description: string;
  type: string;
  enum?: readonly string[];
  enumDescriptions?: readonly string[];
  isSpecial?: boolean;
}

/**
 * Generates configuration metadata from schema
 * @param {SchemaType} schema - Configuration schema
 * @returns {ConfigMetadataItem[]} Array of metadata items
 */
export function generateConfigMetadata(
  schema: SchemaType
): ConfigMetadataItem[] {
  const metadata: ConfigMetadataItem[] = [];

  /**
   * Recursively traverse the configuration object to generate metadata
   * @param {ConfigObject} obj - Current configuration object being processed
   * @param {string} [path=''] - Current path in the configuration hierarchy
   */
  function traverse(obj: ConfigObject, path: string = "") {
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;
      if (isConfigValue(value)) {
        const metadataItem: ConfigMetadataItem = {
          key: fullPath.replace(/\./g, "_").toUpperCase(),
          defaultValue: value.default,
          nested: fullPath.includes("."),
          parent: fullPath?.split(".")[0],
          description: value.description,
          type: value.type,
          isSpecial: value.isSpecial,
        };

        // Only add enum and enumDescriptions if the value is of type ConfigValueTypeString
        if (value.type === "string" && "enum" in value) {
          metadataItem.enum = value.enum;
          metadataItem.enumDescriptions = value.enumDescriptions;
        }

        metadata.push(metadataItem);
      } else if (typeof value === "object") {
        // Handle nested objects
        traverse(value as ConfigObject, fullPath);
      }
    }
  }

  traverse(schema as unknown as ConfigObject);
  return metadata;
}
