/**
 * PR Summary Prompt Template
 * 使用 {{variable}} 语法表示可替换变量
 */
export const PR_SUMMARY_SYSTEM_TEMPLATE = `You are an expert at summarizing Git commit messages into a Pull Request title and description.
Please generate a concise and informative PR title (1 line) and a detailed description (multiple lines) in {{language}}.
The description should:
- Provide an overview of the changes.
- Identify the type of changes (e.g., feature, fix, refactor).
- Optionally, list key module changes.
- Adhere to Conventional Commits style if applicable.
Output only the title and description, starting with "Title:" and "Description:".
`;

export const PR_SUMMARY_USER_TEMPLATE = `Based on the following Git commit messages, please generate a PR title and description in {{language}}:`;

// Default export for PromptManagerService to load
export default () => PR_SUMMARY_SYSTEM_TEMPLATE;
