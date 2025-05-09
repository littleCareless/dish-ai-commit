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

1. USE THE CORRECT COMMIT TYPE based on file status and changes (feat, fix, etc.)
2. WRITE ALL CONTENT IN ${language} (except for technical terms and scope)
3. FOLLOW THE EXACT FORMAT TEMPLATE shown in examples
4. USE ENGLISH ONLY FOR SCOPE and technical terms
5. INCLUDE APPROPRIATE EMOJI when enabled (${enableEmoji ? "ENABLED" : "DISABLED"})
6. ${enableMergeCommit ? "MERGE all changes into a SINGLE commit message" : "CREATE SEPARATE commit messages for each file"}
7. ${enableBody ? "INCLUDE body content that explains the changes in detail" : "DO NOT include body content, ONLY generate the subject line"}

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

1. **New File** → Determine type by file purpose:
   - **Feature Files** (\`*.ts\`, \`*.js\`, \`*.py\`) → \`feat\`
   - **Configuration Files** (\`webpack.config.js\`, \`tsconfig.json\`) → \`chore\`
   - **Internationalization Files** (\`en.json\`, \`zh-CN.json\`) → \`i18n\`
   - **Style Files** (\`*.css\`, \`*.less\`, \`*.scss\`) → \`style\`
   - **Documentation Files** (\`README.md\`, \`CONTRIBUTING.md\`) → \`docs\`
   - **Test Files** (\`*.test.js\`, \`*.spec.ts\`) → \`test\`

2. **Modified File** → Determine type by change purpose:
   - **Bug Fix** (preventing crashes, fixing unexpected behavior) → \`fix\`
   - **Feature Enhancement** (adding functionality) → \`feat\`
   - **Performance Improvement** (optimizations) → \`perf\`
   - **Code Refactoring** (improving structure without changing functionality) → \`refactor\`
   - **Code Style Changes** (formatting, renaming) → \`style\`
   - **Test Modifications** → \`test\`

3. **Deleted File** → Usually \`chore\` or \`refactor\` depending on context

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
- Use ! for Breaking Changes: \`feat!(auth): ...\`
- Scope must be in English
- Use imperative mood
- No capitalization
- No period at end
- Maximum 50 characters
- Must be in ${language} (except scope)

${enableBody ? `### Body
- Breaking Changes must include detailed impact description
- Use bullet points with "-"
- Maximum 72 characters per line
- Explain what and why
- Must be in ${language}
- Use【】for categorizing different types of changes` : ''}

## SELF-VERIFICATION CHECKLIST

Before finalizing your output, verify:
1. LANGUAGE CHECK: Is it 100% in ${language} (except for scope and technical terms)?
2. FORMAT CHECK: Does it strictly follow the "<type>(<scope>): <subject>" format?
3. CONTENT CHECK: Does it contain ONLY the commit message with no extra text?
4. CONSISTENCY CHECK: For multiple files, is the format consistent?
5. COMPLETENESS CHECK: Does it include all necessary information?
${enableBody ? '6. BODY CHECK: Does the body explain what was changed and why?' : '6. SUBJECT-ONLY CHECK: Does the output contain ONLY the subject line with no body?'}

## EXAMPLES OF CORRECT OUTPUT

${getVCSExamples(vcsType, enableMergeCommit, enableEmoji, enableBody)}

## COMMON ERRORS TO AVOID

### ERROR 1: Mixed Language
❌ feat(user): add new login feature
✅ feat(user): ${language === 'zh-CN' ? '添加新的登录功能' : `${language} version of message`}

### ERROR 2: Adding Explanations
❌ This commit adds a new feature: feat(auth): ${language === 'zh-CN' ? '实现用户认证' : `${language} version of message`}
✅ feat(auth): ${language === 'zh-CN' ? '实现用户认证' : `${language} version of message`}

### ERROR 3: Incorrect Format
❌ ${language === 'zh-CN' ? '修复了用户登录问题' : '${language} version of incorrect message'}
✅ fix(user): ${language === 'zh-CN' ? '修复登录验证失败问题' : `${language} version of message`}

${!enableBody ? `### ERROR 4: Including Body Content
❌ feat(auth): ${language === 'zh-CN' ? '添加认证功能' : `${language} version of message`}
   - ${language === 'zh-CN' ? '实现JWT令牌认证' : '${language} body content'}
   - ${language === 'zh-CN' ? '添加刷新令牌功能' : '${language} more body content'}
✅ feat(auth): ${language === 'zh-CN' ? '添加认证功能' : `${language} version of message`}` : ''}

---

**FINAL REMINDER: YOUR OUTPUT MUST**
1. CONTAIN ONLY THE COMMIT MESSAGE WITH NOTHING ELSE
2. BE WRITTEN ENTIRELY IN ${language}
3. FOLLOW THE EXACT FORMAT SHOWN IN EXAMPLES
${!enableBody ? '4. INCLUDE ONLY THE SUBJECT LINE, NO BODY' : ''}
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
  ${prefix}feat!(auth): implement new authentication system${useBody ? `
  - replace legacy token auth with JWT
  -【Breaking Change】old token format no longer supported
  -【Migration】clients must update authentication logic
  - implement token refresh mechanism` : ``}
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
  ${featPrefix}feat(feature): implement new functionality${useBody ? `
  - add feature implementation in feature.js` : ``}
  
  ${fixPrefix}fix(bugfix): correct calculation logic${useBody ? `
  - fixed calculation of variable y in bugfix.js` : ``}
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
  ${prefix}feat(app): add multiple new files${useBody ? `
  - added file1.js
  - added file2.js with basic logging` : ``}
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
  ${featPrefix}feat(feature): implement new functionality${useBody ? `
  
  - Add new feature implementation to feature.js` : ``}

  ${fixPrefix}fix(bugfix): correct calculation logic${useBody ? `

  - Fix the calculation logic of variable y in bugfix.js` : ``}
  \`\`\``;
}

export function generateCommitMessageUserPrompt(language: string) {}
