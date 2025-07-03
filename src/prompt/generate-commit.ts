import { ExtensionConfiguration } from "../config/types";

interface SystemPromptParams {
  config: ExtensionConfiguration; // 配置项
  vcsType: "git" | "svn"; // 运行时参数
}

function getMergeCommitsSection(
  enableMergeCommit: boolean,
  enableEmoji: boolean,
  enableBody: boolean
) {
  const formatExample = enableEmoji
    ? "<emoji> <type>(<scope>): <subject>"
    : "<type>(<scope>): <subject>";

  // 如果不需要显示body，只返回标题行格式
  if (!enableBody) {
    if (!enableMergeCommit) {
      return `### Separate Commits

- If multiple file diffs are provided, generate separate commit messages for each file.
- If only one file diff is provided, generate a single commit message.
\`\`\`
${formatExample}

${formatExample}
\`\`\`
`;
    }

    return `### Merged Commit

If multiple file diffs are provided, merge them into a single commit message:
\`\`\`
${formatExample}
\`\`\`
`;
  }

  // 原有逻辑 - 包含body
  if (!enableMergeCommit) {
    return `### Separate Commits

- If multiple file diffs are provided, generate separate commit messages for each file.
- If only one file diff is provided, generate a single commit message.
\`\`\`
${formatExample}
<body for changes in file>

${formatExample}
<body for changes in file>
\`\`\`
`;
  }

  return `### Merged Commit

If multiple file diffs are provided, merge them into a single commit message:
\`\`\`
${formatExample}
<body of merged changes>
\`\`\`
`;
}

function getVCSExamples(
  vcsType: "svn" | "git",
  enableMergeCommit: boolean,
  enableEmoji: boolean,
  enableBody: boolean
) {
  const exampleContent =
    vcsType === "git"
      ? getGitExamples(enableMergeCommit, enableEmoji, enableBody)
      : getSVNExamples(enableMergeCommit, enableEmoji, enableBody);

  return `### Example (${vcsType.toUpperCase()})

${exampleContent}`;
}

function getGitExamples(
  enableMergeCommit: boolean,
  enableEmoji: boolean,
  enableBody: boolean
) {
  return enableMergeCommit
    ? getMergedGitExample(enableEmoji, enableBody)
    : getSeparateGitExample(enableEmoji, enableBody);
}

function getSVNExamples(
  enableMergeCommit: boolean,
  enableEmoji: boolean,
  enableBody: boolean
) {
  return enableMergeCommit
    ? getMergedSVNExample(enableEmoji, enableBody)
    : getSeparateSVNExample(enableEmoji, enableBody);
}

export function generateCommitMessageSystemPrompt({
  config,
  vcsType,
}: SystemPromptParams) {
  const {
    base: { language },
    features: {
      commitFormat: { enableMergeCommit, enableEmoji, enableBody = true },
      commitMessage: { useRecentCommitsAsReference },
    },
  } = config;

  const VCSUpper = vcsType.toUpperCase();
  return `# ${VCSUpper} Commit Message Guide

**CRITICAL INSTRUCTION: YOU MUST FOLLOW THESE EXACT REQUIREMENTS**
1. OUTPUT ONLY THE COMMIT MESSAGE IN ${language}
2. FOLLOW THE FORMAT EXACTLY AS SHOWN IN EXAMPLES
3. INCLUDE NO EXPLANATIONS OR ADDITIONAL TEXT
4. NEVER USE ENGLISH UNLESS SPECIFIED

## REQUIRED ACTIONS (MUST DO)

1. Determine the true intention of this commit based on the actual changes (including path, file name, content, and diff code), and choose the commit type that best suits the purpose.
2. WRITE ALL CONTENT IN ${language} (except for technical terms and scope)
3. FOLLOW THE EXACT FORMAT TEMPLATE shown in examples
4. USE ENGLISH ONLY FOR SCOPE and technical terms
5. INCLUDE APPROPRIATE EMOJI when enabled (${
    enableEmoji ? "ENABLED" : "DISABLED"
  })
6. ${
    enableMergeCommit
      ? "MERGE all changes into a SINGLE commit message"
      : "CREATE SEPARATE commit messages for each file"
  }
7. ${
    enableBody
      ? "INCLUDE body content that explains the changes in detail"
      : "DO NOT include body content, ONLY generate the subject line"
  }

## PROHIBITED ACTIONS (MUST NOT DO)

1. DO NOT include any explanations, greetings, or additional text
2. DO NOT write in English (except for technical terms and scope)
3. DO NOT add any formatting instructions or metadata
4. DO NOT include triple backticks (\`\`\`) in your output
5. DO NOT add any comments or questions
6. DO NOT deviate from the required format

## FORMAT TEMPLATE

${getMergeCommitsSection(enableMergeCommit, enableEmoji, enableBody)}

## TYPE DETECTION GUIDE

When generating commit messages, always consider both the file status and the content changes:

### File Status Classification

- Please analyze the file changes — including file paths, filenames, file contents, and diff code snippets — and determine the purpose of this commit.
- Then, choose the most appropriate commit type (type) from the TYPE REFERENCE list based on the actual intent of the change, not just the file extension or filename.
- The commit type must reflect the **real purpose** of the change.

## TYPE REFERENCE

${
  enableEmoji
    ? `| Type     | Emoji | Description          | Example Scopes      |
| -------- | ----- | -------------------- | ------------------- |
| feat     | ✨    | New feature          | user, payment       |
| fix      | 🐛    | Bug fix              | auth, data          |
| docs     | 📝    | Documentation        | README, API         |
| style    | 💄    | Code style           | formatting          |
| refactor | ♻️    | Code refactoring     | utils, helpers      |
| perf     | ⚡️   | Performance          | query, cache        |
| test     | ✅    | Testing              | unit, e2e           |
| build    | 📦️    | Build system         | webpack, npm        |
| ci       | 👷    | CI config            | Travis, Jenkins     |
| chore    | 🔧    | Other changes        | scripts, config     |
| i18n     | 🌐    | Internationalization | locale, translation |`
    : `| Type     | Description          | Example Scopes      |
| -------- | -------------------- | ------------------- |
| feat     | New feature          | user, payment       |
| fix      | Bug fix              | auth, data          |
| docs     | Documentation        | README, API         |
| style    | Code style           | formatting          |
| refactor | Code refactoring     | utils, helpers      |
| perf     | Performance          | query, cache        |
| test     | Testing              | unit, e2e           |
| build    | Build system         | webpack, npm        |
| ci       | CI config            | Travis, Jenkins     |
| chore    | Other changes        | scripts, config     |
| i18n     | Internationalization | locale, translation |`
}

## WRITING RULES

### Subject Line
- Use ! for Breaking Changes: \`feat(auth)!: ...\`
- Scope must be in English
- Use imperative mood
- No capitalization
- No period at end
- Maximum 50 characters
- Must be in ${language} (except scope)
- The body MUST begin one blank line after the description
> If you cannot clearly classify a specific module or function, you can use \`core\` or \`misc\` as the default scope

${
  enableBody
    ? `### Body
- Breaking Changes must include detailed impact description
- Use bullet points with "-"
- Maximum 72 characters per line
- Explain what and why
- Must be in ${language}
- Use【】for categorizing different types of changes`
    : ""
}

## SELF-VERIFICATION CHECKLIST

Before finalizing your output, verify:
1. LANGUAGE CHECK: Is it 100% in ${language} (except for scope and technical terms)?
2. FORMAT CHECK: Does it strictly follow the "<type>(<scope>): <subject>" format?
3. CONTENT CHECK: Does it contain ONLY the commit message with no extra text?
4. CONSISTENCY CHECK: For multiple files, is the format consistent?
5. COMPLETENESS CHECK: Does it include all necessary information?
${
  enableBody
    ? "6. BODY CHECK: Does the body explain what was changed and why?"
    : "6. SUBJECT-ONLY CHECK: Does the output contain ONLY the subject line with no body?"
}

## EXAMPLES OF CORRECT OUTPUT

${getVCSExamples(vcsType, enableMergeCommit, enableEmoji, enableBody)}

## COMMON MISTAKES TO AVOID

Avoid these common mistakes:

- Writing content in English (except for scope and technical terms); all other text must be in ${language}
- Adding explanatory text like “This commit adds...”
- Writing plain messages like “Fix login issue” without using the type(scope): format
- Forgetting the blank line between subject and body when body is enabled

---

**FINAL REMINDER: YOUR OUTPUT MUST**
1. CONTAIN ONLY THE COMMIT MESSAGE WITH NOTHING ELSE
2. BE WRITTEN ENTIRELY IN ${language}
3. FOLLOW THE EXACT FORMAT SHOWN IN EXAMPLES
${!enableBody ? "4. INCLUDE ONLY THE SUBJECT LINE, NO BODY" : ""}

${generateThinkingProcessPrompt(useRecentCommitsAsReference)}
`;
}

// Helper functions for examples generation (implementations omitted for brevity)
function getMergedGitExample(useEmoji: boolean, useBody: boolean) {
  const prefix = useEmoji ? "✨ " : "";
  return `#### Merged Commit (allowMergeCommits: true)

- **Input (Multiple Diffs)**:
  \`\`\`
  diff --git a/auth/index.ts b/auth/index.ts
  // ...diff content...
  \`\`\`

- **Generated Commit Message**:
  \`\`\`
  ${prefix}feat!(auth): implement new authentication system
  ${
    useBody
      ? `
  - replace legacy token auth with JWT
  -【Breaking Change】old token format no longer supported
  -【Migration】clients must update authentication logic
  - implement token refresh mechanism`
      : ``
  }
  \`\`\``;
}

function getSeparateGitExample(useEmoji: boolean, useBody: boolean) {
  const featPrefix = useEmoji ? "✨ " : "";
  const fixPrefix = useEmoji ? "🐛 " : "";

  return `- **Input (Multiple File with Multiple Changes)**:
  \`\`\`
  diff --git a/feature.js b/feature.js
  index e69de29..b6fc4c6 100644
  --- a/feature.js
  +++ b/feature.js
  @@ -0,0 +1 @@
  +console.log('New Feature Implementation');

  diff --git a/bugfix.js b/bugfix.js
  index 1234567..7654321 100644
  --- a/bugfix.js
  +++ b/bugfix.js
  @@ -1,3 +1,3 @@
   const x = 1;
  -const y = x + 1;
  +const y = x + 2;
  \`\`\`

- **Generated Commit Messages**:
  \`\`\`
  ${featPrefix}feat(feature): implement new functionality
  ${
    useBody
      ? `
  - add feature implementation in feature.js`
      : ``
  }
  
  ${fixPrefix}fix(bugfix): correct calculation logic 
  ${
    useBody
      ? `

  - fixed calculation of variable y in bugfix.js`
      : ``
  }
  \`\`\``;
}

function getMergedSVNExample(useEmoji: boolean, useBody: boolean) {
  const prefix = useEmoji ? "✨ " : "";
  return `#### Merged Commit (allowMergeCommits: true)

- **Input (Multiple Diffs)**:
  \`\`\`
  Index: file1.js
  ===================================================================
  --- file1.js    (revision 0)
  +++ file1.js    (working copy)
  @@ -0,0 +1,2 @@
  +console.log('File 1');

  Index: file2.js
  ===================================================================
  --- file2.js    (revision 0)
  +++ file2.js    (working copy)
  @@ -0,0 +1,2 @@
  +console.log('File 2');
  \`\`\`

- **Generated Commit Message**:
  \`\`\`
  ${prefix}feat(app): add multiple new files
  ${
    useBody
      ? `
  - added file1.js
  - added file2.js with basic logging`
      : ``
  }
  \`\`\``;
}

function getSeparateSVNExample(useEmoji: boolean, useBody: boolean) {
  const featPrefix = useEmoji ? "✨ " : "";
  const fixPrefix = useEmoji ? "🐛 " : "";

  return `- **Input (Multiple File with Multiple Changes)**:
  \`\`\`
  Index: feature.js
  ===================================================================
  --- feature.js    (revision 0)
  +++ feature.js    (working copy)
  @@ -0,0 +1 @@
  +console.log('New Feature Implementation');

  Index: bugfix.js
  ===================================================================
  --- bugfix.js    (revision 123)
  +++ bugfix.js    (working copy)
  @@ -1,3 +1,3 @@
   const x = 1;
  -const y = x + 1;
  +const y = x + 2;
  \`\`\`

- **Generated Commit Messages**:
  \`\`\`
  ${featPrefix}feat(feature): implement new functionality
  ${
    useBody
      ? `
  - Add new feature implementation to feature.js`
      : ``
  }

  ${fixPrefix}fix(bugfix): correct calculation logic
  ${
    useBody
      ? `

  - Fix the calculation logic of variable y in bugfix.js`
      : ``
  }
  \`\`\``;
}

/**
 * Generates a prompt for an AI model to create a commit message.
 * The prompt's content is conditionally adjusted based on the input parameter.
 *
 * @param {boolean} useRecentCommitsAsReference - If true, includes the step about
 *   reviewing recent repository commits for style conventions. If false, this
 *   step is omitted and subsequent steps are renumbered.
 * @returns {string} The formatted prompt string.
 */
function generateThinkingProcessPrompt(useRecentCommitsAsReference = false) {
  // Base steps that are always included
  const baseSteps = [
    "Analyze the CODE CHANGES thoroughly to understand what's been modified.",
    "Use the ORIGINAL CODE to understand the context of the CODE CHANGES. Use the line numbers to map the CODE CHANGES to the ORIGINAL CODE.",
    "Identify the purpose of the changes to answer the *why* for the commit message. To do this, synthesize information from all provided context: the RECENT USER COMMITS (if available) and the related code snippets found via embedding search.",
    // Step 4 will be inserted here conditionally
    "Generate a thoughtful and succinct commit message for the given CODE CHANGES. It MUST follow the established writing conventions.",
    "Remove any meta information like issue references, tags, or author names from the commit message. The developer will add them.",
    "Now only show your message, wrapped with a single markdown \\`text codeblock! Do not provide any explanations or details",
  ];

  // The conditional step
  const conditionalStep =
    "Review the provided RECENT REPOSITORY COMMITS to identify established commit message conventions. Focus on the format and style, ignoring commit-specific details like refs, tags, and authors.";

  // Create the final list of steps
  let finalSteps = [...baseSteps];
  if (useRecentCommitsAsReference) {
    // Insert the conditional step at the correct position (index 3 for step 4)
    finalSteps.splice(3, 0, conditionalStep);
  }

  // Map over the final steps to add numbering
  const numberedSteps = finalSteps.map((step, index) => {
    return `${index + 1}. ${step}`;
  });

  // Construct the final prompt string
  return `# First, think step-by-step:\n${numberedSteps.join("\n")}`;
}

export function generateCommitMessageUserPrompt(language: string) {}

export function getCommitMessageTools(config: ExtensionConfiguration) {
  const {
    base: { language },
    features: {
      commitFormat: { enableBody, enableEmoji },
    },
  } = config;

  const properties: any = {
    type: {
      type: "string",
      description:
        "Commit type, must be one of: feat, fix, docs, style, refactor, perf, test, build, ci, chore, i18n. See TYPE REFERENCE for details.",
      enum: [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "i18n",
      ],
    },
    scope: {
      type: "string",
      description:
        "Scope of the change (e.g., component or file name). Must be in English. Can be empty.",
    },
    subject: {
      type: "string",
      description: `A short summary of the change in ${language}. Rules: imperative mood, no capitalization, no period at the end, max 50 chars. Use '!' for breaking changes (e.g., 'feat(auth)!: ...'). If body is present, leave one blank line after the subject.`,
    },
  };

  const required = ["type", "subject"];

  if (enableBody) {
    properties.body = {
      type: "string",
      description: `Detailed explanation of the changes in ${language}. Rules: explain what and why, use bullet points with '-', max 72 chars per line. For breaking changes, describe impact. Use '【】' for categorization.`,
    };
    required.push("body");
  }

  if (enableEmoji) {
    properties.emoji = {
      type: "string",
      description:
        "Emoji corresponding to the commit type (e.g., '✨' for 'feat'). See TYPE REFERENCE for the mapping.",
    };
    required.push("emoji");
  }

  const functionDescription = `Generates a structured commit message in ${language} based on file diffs. It must follow the Conventional Commits specification and the user's configuration.`;

  return [
    {
      type: "function",
      function: {
        name: "generate_commit_message",
        description: functionDescription,
        parameters: {
          type: "object",
          properties: properties,
          required: required,
        },
      },
    },
  ];
}
