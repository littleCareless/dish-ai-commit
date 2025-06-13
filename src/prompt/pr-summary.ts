/**
 * 生成PR摘要的系统提示
 * @param language 目标语言, 默认为 "en"
 * @returns 系统提示字符串
 */
export function getPRSummarySystemPrompt(language: string = "en"): string {
  return `You are an expert at summarizing Git commit messages into a Pull Request title and description.
Please generate a concise and informative PR title (1 line) and a detailed description (multiple lines) in ${language}.
The description should:
- Provide an overview of the changes.
- Identify the type of changes (e.g., feature, fix, refactor).
- Optionally, list key module changes.
- Adhere to Conventional Commits style if applicable.
Output only the title and description, starting with "Title:" and "Description:".
`;
}

/**
 * 生成PR摘要的用户提示
 * @param language 目标语言, 默认为 "en"
 * @returns 用户提示字符串
 */
export function getPRSummaryUserPrompt(language: string = "en"): string {
  // commitMessages 在这里不直接使用，因为它们会作为 userContent 传递
  // 这个prompt主要作为引导
  return `Based on the following Git commit messages, please generate a PR title and description in ${language}:`;
}