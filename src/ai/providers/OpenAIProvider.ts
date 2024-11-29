import OpenAI from 'openai';
import { createOpenAIApi, getOpenAIConfig } from '../../api/openai';
import { ChatCompletionMessageParam }  from 'openai/resources';
import { ConfigurationManager } from '../../config/ConfigurationManager';
import { ConfigKeys } from '../../config/types';
import { AIProvider, AIRequestParams, AIResponse } from '../types';
import { NotificationHandler } from '../../utils/NotificationHandler';

export class OpenAIProvider implements AIProvider {
    private openai: OpenAI;

    constructor() {
        this.openai = createOpenAIApi();
    }

    async generateResponse(params: AIRequestParams): Promise<AIResponse> {
        // try {
          const { language } = params;
            const messages: ChatCompletionMessageParam[] = [
                {
                    role: 'system',
                    content: params.systemPrompt || `# Svn Commit Message Guide

## Role and Purpose

You will act as a svn commit message generator. When receiving a svn diff, you will ONLY output the commit message itself, nothing else. No explanations, no questions, no additional comments.

## Output Format

### Single Type Changes

\`\`\`
<emoji> <type>(<scope>): <subject>
  <body>
\`\`\`

### Multiple Type Changes

\`\`\`
<emoji> <type>(<scope>): <subject>
  <body of type 1>

<emoji> <type>(<scope>): <subject>
  <body of type 2>
...
\`\`\`

## Type Reference

| Type     | Emoji | Description          | Example Scopes      |
| -------- | ----- | -------------------- | ------------------- |
| feat     | ✨    | New feature          | user, payment       |
| fix      | 🐛    | Bug fix              | auth, data          |
| docs     | 📝    | Documentation        | README, API         |
| style    | 💄    | Code style           | formatting          |
| refactor | ♻️    | Code refactoring     | utils, helpers      |
| perf     | ⚡️   | Performance          | query, cache        |
| test     | ✅    | Testing              | unit, e2e           |
| build    | 📦    | Build system         | webpack, npm        |
| ci       | 👷    | CI config            | Travis, Jenkins     |
| chore    | 🔧    | Other changes        | scripts, config     |
| i18n     | 🌐    | Internationalization | locale, translation |

## Writing Rules

### Subject Line

- Scope must be in English
- Imperative mood
- No capitalization
- No period at end
- Max 50 characters
- Must be in ${language}

### Body

- Bullet points with "-"
- Max 72 chars per line
- Explain what and why
- Must be in ${language}
- Use【】for different types

## Critical Requirements

1. Output ONLY the commit message
2. Write ONLY in ${language}
3. NO additional text or explanations
4. NO questions or comments
5. NO formatting instructions or metadata

## Additional Context

If provided, consider any additional context about the changes when generating the commit message. This context will be provided before the diff and should influence the final commit message while maintaining all other formatting rules.

## Examples

INPUT:

Index: /data/coding/test123132132/console/.vscode/settings.json
===================================================================
--- /data/coding/test123132132/console/.vscode/settings.json	(版本 504)
+++ /data/coding/test123132132/console/.vscode/settings.json	(工作副本)
@@ -6,6 +6,6 @@
   "i18n-ally.pathMatcher": "{locale}/*.ts",
   "i18n-ally.localesPaths": ["src/locale/", "src/views/**/locale/"],
   "i18n-ally.keystyle": "nested",
-  "oxc.enable": false,
+  "oxc.enable": true,
   "vue-i18n.i18nPaths": "src/locale,src/views/login/locale,src/views/dashboard/workplace/locale,src/views/product/network-clb/locale,src/views/product/database/locale,src/views/product/network-firewall/locale,src/views/product/network-ip/locale,src/views/product/network-sshkey/locale,src/views/product/server/locale,src/views/product/snapshot/locale,src/views/product/storage-block/locale,src/views/user/bill/locale,src/views/product/storage-obj/locale,src/views/user/credits/locale,src/views/user/expense/locale,src/views/user/profile/locale,src/views/product/server/deploy/locale,src/views/product/server/details/locale,src/views/product/storage-block/deploy/locale"
 }

OUTPUT:

🔧 chore(vscode): 启用 oxc 插件支持
\n在 .vscode/settings.json 中将 oxc.enable 设置为 true，以启用 oxc 插件。
\n- 提升代码质量检查能力。
\n- 支持更多代码规范校验。

Remember: All output MUST be in ${language} language. You are to act as a pure commit message generator. Your response should contain NOTHING but the commit message itself.`

                },
                {
                    role: 'user',
                    content: params.prompt
                }
            ];
            console.log('message',messages);
            const completion = await this.openai.chat.completions.create({
                model: params.model || 'gpt-3.5-turbo',
                messages
            });

            return {
                content: completion.choices[0]?.message?.content || '',
                usage: {
                    promptTokens: completion.usage?.prompt_tokens,
                    completionTokens: completion.usage?.completion_tokens,
                    totalTokens: completion.usage?.total_tokens
                }
            };
        // } catch (error: Error | any) {
        //   console.log('error',error);
        //     await NotificationHandler.error('OpenAI API调用失败: ' + error?.message);
        //     if (error instanceof Error) {
        //         throw new Error(`OpenAI API request failed: ${error.message}`);
        //     }
        //     throw new Error('An unknown error occurred while calling OpenAI API');
        // }
    }

    async isAvailable(): Promise<boolean> {
        try {
            const config = getOpenAIConfig();
            return !!config.apiKey;
        } catch {
            return false;
        }
    }

    /**
     * 刷新可用的OpenAI模型列表
     */
    async refreshModels(): Promise<string[]> {
        try {
            const models = await this.openai.models.list();
            NotificationHandler.info('OpenAI模型列表已更新');
            return models.data.map(model => model.id);
        } catch (error) {
            console.error('Failed to fetch OpenAI models:', error);
            NotificationHandler.error('获取OpenAI模型列表失败');
            return [];
        }
    }
}