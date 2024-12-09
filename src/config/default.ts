import { generateCommitMessageSystemPrompt } from "../prompt/prompt";
import { ExtensionConfiguration } from "./types";

export const DEFAULT_CONFIG: ExtensionConfiguration = {
  language: "Simplified Chinese",
  systemPrompt: generateCommitMessageSystemPrompt(
    "Simplified Chinese",
    false, // 使用默认配置
    false, // 使用默认配置
    "git"
  ),
  provider: "openai",
  model: "gpt-3.5-turbo",
  openai: {
    baseUrl: "https://api.openai.com/v1",
  },
  ollama: {
    baseUrl: "http://localhost:11434",
  },
  vscode: {
    model: "default",
  },
  allowMergeCommits: false,
};
