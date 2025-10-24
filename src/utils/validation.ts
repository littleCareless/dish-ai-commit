/**
 * This module provides utility functions for validation purposes.
 */

/**
 * Ensures that a value is not null or undefined, throwing an error if it is.
 * This is useful for asserting that class members have been initialized.
 *
 * @param value The value to check.
 * @param name The name of the value being checked, used for a descriptive error message.
 * @returns The non-nullish value.
 * @throws {Error} if the value is null or undefined.
 */
export function ensureInitialized<T>(
  value: T | undefined | null,
  name: string
): T {
  if (value === null || value === undefined) {
    throw new Error(`'${name}' has not been initialized.`);
  }
  return value;
}