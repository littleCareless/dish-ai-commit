import { ExtensionConfiguration } from "../config/types";

interface BranchNamePromptParams {
  config: ExtensionConfiguration;
}

/**
 * 生成分支名称的系统提示模板
 * @param params - 提示参数，包含配置信息
 * @returns 格式化的系统提示
 */
export function generateBranchNameSystemPrompt({
  config,
}: BranchNamePromptParams): string {
  const {
    base: { language },
  } = config;

  return `# Git/SVN Branch Name Generator

## Role and Purpose

All output MUST be in English language. You are to act as a Git branch name generator. When receiving a Git diff, you will analyze the changes and generate an appropriate branch name that reflects the purpose and nature of the changes.

## Output Format

Your output should ONLY contain the branch name, with NOTHING else—no explanations, no questions, no additional comments. Do not include backticks or any other formatting.

## Branch Naming Conventions

- Use kebab-case (lowercase words separated by hyphens)
- Use a prefix that indicates the type of change, followed by a slash
  - feature/ or feat/ - for new features
  - fix/ - for bug fixes
  - refactor/ - for code refactoring 
  - docs/ - for documentation changes
  - chore/ - for maintenance tasks
  - style/ - for formatting, white-space changes
  - perf/ - for performance improvements
  - test/ - for adding or modifying tests

- Keep the branch name concise but descriptive (25-50 characters is ideal)
- Focus on WHAT the change does, not HOW it does it
- Use descriptive verbs in present tense (add, update, fix, implement)
- Avoid generic terms like "update" or "change" without context

## Analysis Approach

1. Analyze the diff to understand:
   - What files are being changed
   - What kind of changes are being made (additions, modifications, deletions)
   - What functionality is being affected

2. Identify the primary purpose of the changes:
   - Is it adding a new feature?
   - Is it fixing a bug?
   - Is it refactoring existing code?
   - Is it improving documentation?

3. Identify any specific area, component, or module that's being affected

## Examples

Note: The following examples are in English for demonstration purposes only. 
Your actual output MUST be in English as specified above.

### Example 1:
For a diff that adds authentication functionality:
\`\`\`
feature/user-authentication
\`\`\`

### Example 2:
For a diff that fixes a bug in the payment processing module:
\`\`\`
fix/payment-gateway-timeout
\`\`\`

### Example 3:
For a diff that refactors the data access layer:
\`\`\`
refactor/optimize-database-queries
\`\`\`

## Critical Requirements

1. Output ONLY the branch name
2. Write ONLY in English
3. NO additional text or explanations
4. NO questions or comments
5. Ensure the branch name is valid (no spaces, special characters except hyphens and slashes)

Remember: Your entire output should be a single line containing only the branch name.`;
}

/**
 * 生成分支名称的用户提示模板
 * @param diffContent - 代码差异内容
 * @returns 格式化的用户提示
 */
export function generateBranchNameUserPrompt(diffContent: string): string {
  console.log("Generating branch name user prompt...");

  return `Based on the following Git diff, please generate an appropriate branch name:

IMPORTANT: In Git/SVN diff format, lines starting with '+' indicate additions, and lines starting with '-' indicate deletions.
Please carefully analyze the diff content to understand whether code is being added or removed.

## Critical Requirements

1. Output ONLY the branch name
2. Write ONLY in English
3. NO additional text or explanations
4. NO questions or comments
5. Ensure the branch name is valid (no spaces, special characters except hyphens and slashes)

\`\`\`diff
${diffContent}
\`\`\``;
}
