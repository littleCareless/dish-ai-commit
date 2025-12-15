/**
 * Process a prompt template by replacing variables with their values.
 * Supports {{variable}} syntax.
 *
 * @param template The prompt template string.
 * @param variables A map of variable names to their values.
 * @returns The processed prompt string.
 */
export function processPromptTemplate(
    template: string,
    variables: Record<string, any>
): string {
    if (!template) {
        return "";
    }

    return template.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
        if (variableName in variables) {
            const value = variables[variableName];
            return value !== undefined && value !== null ? String(value) : "";
        }
        // If variable is not found, keep the original placeholder
        // This allows for partial processing or debugging
        return match;
    });
}
