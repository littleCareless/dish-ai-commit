import { ExtensionConfiguration } from "@/config/types";

export const LAYERED_COMMIT_BATCH_TEMPLATE = `
You are an expert programmer responsible for writing detailed, file-specific commit descriptions.
Your task is to analyze the provided code changes for multiple files and generate a concise, informative description for EACH file.

{{context_section}}

**CRITICAL INSTRUCTIONS:**
1.  **LANGUAGE:** Your entire output MUST be in **{{language}}**.
2.  **OUTPUT FORMAT:** You MUST return a valid JSON array.
    - Each item in the array must be an object with:
      - "filePath": The path of the file (as provided in the input).
      - "description": The commit description for that file.
3.  **FOCUS:** For each file, describe what changed and why.
4.  **NO EXTRA TEXT:** Do not output markdown code blocks (like \`\`\`json), just the raw JSON string.
5.  **ACCURACY:** Ensure the "filePath" exactly matches the paths found in the diff headers.

**INPUT DATA:**
The input will be a concatenated diff of multiple files.

**EXAMPLE OUTPUT:**
[
  {
    "filePath": "src/utils/logger.ts",
    "description": "Added timestamp to log messages for better debugging."
  },
  {
    "filePath": "src/main.ts",
    "description": "Integrated the new logger service."
  }
]

{{body_instruction}}

**FINAL REMINDER:**
- Analyze ALL provided files.
- Return ONLY valid JSON.
`;

// Default export for PromptManagerService to load
export default () => LAYERED_COMMIT_BATCH_TEMPLATE;

export interface LayeredCommitBatchParams {
    config: ExtensionConfiguration["features"]["commitFormat"];
    language: string;
    globalContext?: string;
}

export function getLayeredCommitBatchVariables(params: LayeredCommitBatchParams) {
    const { config, language, globalContext } = params;

    const bodyInstruction = config.enableBody
        ? `**DESCRIPTION STYLE:**
- Explain the "what" and "why".
- Use bullet points if there are multiple changes in one file.`
        : `**DESCRIPTION STYLE:**
- Provide a single, concise sentence.`;

    const contextSection = globalContext ? `
**GLOBAL CONTEXT:**
This batch of files is part of a larger change set:
${globalContext}

When describing each file, keep this global context in mind.
` : '';

    return {
        language,
        body_instruction: bodyInstruction,
        context_section: contextSection
    };
}
