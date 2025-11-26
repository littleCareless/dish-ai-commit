import { ExtensionConfiguration } from "@/config/types";

export const LAYERED_COMMIT_TEMPLATE = `
You are an expert programmer responsible for writing a detailed, file-specific commit description.
Your task is to analyze the provided code changes for a single file and generate a concise, informative description of what was changed and why.

{{context_section}}

**CRITICAL INSTRUCTIONS:**
1.  **LANGUAGE:** Your entire output MUST be in **{{language}}**.
2.  **FOCUS:** Describe changes in **{{filePath}}**, but mention its role in the global context if provided.
3.  **OUTPUT:** You MUST ONLY return the description text. Do NOT include a commit subject line (e.g., "feat(scope): ..."), markdown code blocks, or any other formatting.

**ANALYSIS AND WRITING RULES:**
1.  **Analyze the Diff:** Carefully review the provided code changes to understand the core logic.
2.  **Identify the Purpose:** Determine the primary purpose of the changes (e.g., bug fix, new feature, refactoring, performance improvement).
3.  **Write a Clear Description:**
    - Start with a summary of the change.
    {{body_instruction}}

**EXAMPLE OUTPUT (if body is enabled):**
"Refactored the data processing logic to improve performance by implementing a more efficient caching strategy.
- Reduces database queries by over 50% under typical load.
- Replaced the old algorithm with a new memoization technique."

**EXAMPLE OUTPUT (if body is disabled):**
"Refactored the data processing logic for performance by implementing a caching strategy."

---
**FINAL REMINDER:**
- Focus ONLY on the changes in the provided file.
- DO NOT generate a full conventional commit message.
- Your output MUST be in {{language}}.
- ONLY return the description for this single file's changes.
`;

// Default export for PromptManagerService to load
export default () => LAYERED_COMMIT_TEMPLATE;

interface LayeredCommitFileParams {
  config: ExtensionConfiguration["features"]["commitFormat"];
  language: string;
  filePath: string;
  globalContext?: string;
  otherFiles?: string[];
}

export function getLayeredCommitVariables(params: LayeredCommitFileParams) {
  const { config, language, filePath, globalContext, otherFiles } = params;

  const bodyInstruction = config.enableBody
    ? `- Explain the "what" and "why" of the change.
- Use bullet points with "-" to list individual changes within the file.`
    : `- Provide only a single, concise sentence summarizing the change.`;

  const contextSection = globalContext ? `
**GLOBAL CONTEXT:**
This file is part of a larger change set:
${globalContext}

Other files being modified in this commit:
${otherFiles?.map(f => `- ${f}`).join('\n')}

When describing this file's changes, briefly mention how it relates to the overall goal above.
` : '';

  return {
    language,
    filePath,
    body_instruction: bodyInstruction,
    context_section: contextSection
  };
}
