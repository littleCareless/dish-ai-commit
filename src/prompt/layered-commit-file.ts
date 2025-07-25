import { AIRequestParams } from "../ai/types";

export function getLayeredCommitFilePrompt(params: AIRequestParams): string {
  const { languages, scm, changeFiles = [], diff } = params;

  const template = `
You are an expert programmer responsible for writing detailed, file-specific commit descriptions.
Your task is to analyze the provided code changes for a single file and generate a concise, informative description of what was changed and why.

**File Path:**
${changeFiles.join(", ")}

**Programming Language:**
${languages}

**SCM Tool:**
${scm}

**Code Changes (diff):**
\`\`\`diff
${diff}
\`\`\`

**Instructions:**
1.  **Analyze the Diff:** Carefully review the code changes shown in the diff.
2.  **Identify the Core Logic:** Understand the primary purpose of the changes (e.g., bug fix, new feature, refactoring, performance improvement).
3.  **Write a Clear Description:** Based on your analysis, write a clear and concise description for this specific file's changes.
    *   Start with a summary of the change.
    *   Explain the "why" behind the change, if it's not obvious.
    *   Mention any important details, such as modified functions, new dependencies, or potential impacts.
4.  **Format:** Return only the description text, without any markdown code blocks or other formatting.

**Example Output:**
"Refactored the data processing logic to improve performance by implementing a more efficient caching strategy. This change reduces database queries by over 50% under typical load."

---
REMINDER:
- Focus ONLY on the changes in the provided file.
- DO NOT generate a full commit message with a subject line or body.
- ONLY return the description for this single file's changes.
`;

  return template.trim();
}