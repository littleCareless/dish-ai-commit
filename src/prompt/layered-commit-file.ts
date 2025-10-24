import { AIRequestParams } from "../ai/types";
import { ExtensionConfiguration } from "../config/types";

interface LayeredCommitFileParams {
  config: ExtensionConfiguration["features"]["commitFormat"];
  language: string;
  filePath: string;
  globalContext?: string; // ✅ 新增
  otherFiles?: string[];  // ✅ 新增
}

export function getLayeredCommitFilePrompt(
  params: LayeredCommitFileParams
): string {
  const { config, language, filePath, globalContext, otherFiles } = params;

  const bodyInstruction = config.enableBody
    ? `- Explain the "what" and "why" of the change.
- Use bullet points with "-" to list individual changes within the file.`
    : `- Provide only a single, concise sentence summarizing the change.`;

  // 🔥 新增上下文提示部分
  const contextSection = globalContext ? `
**GLOBAL CONTEXT:**
This file is part of a larger change set:
${globalContext}

Other files being modified in this commit:
${otherFiles?.map(f => `- ${f}`).join('\n')}

When describing this file's changes, briefly mention how it relates to the overall goal above.
` : '';

  const template = `
You are an expert programmer responsible for writing a detailed, file-specific commit description.
Your task is to analyze the provided code changes for a single file and generate a concise, informative description of what was changed and why.

${contextSection}

**CRITICAL INSTRUCTIONS:**
1.  **LANGUAGE:** Your entire output MUST be in **${language}**.
2.  **FOCUS:** Describe changes in **${filePath}**, but mention its role in the global context if provided.
3.  **OUTPUT:** You MUST ONLY return the description text. Do NOT include a commit subject line (e.g., "feat(scope): ..."), markdown code blocks, or any other formatting.

**ANALYSIS AND WRITING RULES:**
1.  **Analyze the Diff:** Carefully review the provided code changes to understand the core logic.
2.  **Identify the Purpose:** Determine the primary purpose of the changes (e.g., bug fix, new feature, refactoring, performance improvement).
3.  **Write a Clear Description:**
    - Start with a summary of the change.
    ${bodyInstruction}

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
- Your output MUST be in ${language}.
- ONLY return the description for this single file's changes.
`;

  return template?.trim();
}
