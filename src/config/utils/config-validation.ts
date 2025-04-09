import type { ConfigValue } from "../config-schema";

/**
 * Type guard for configuration values
 * @param {unknown} value - Value to check
 * @returns {boolean} Whether value is a ConfigValue
 */
export function isConfigValue(value: unknown): value is ConfigValue {
  return (
    value !== null &&
    typeof value === "object" &&
    "type" in value &&
    "description" in value
  );
}
