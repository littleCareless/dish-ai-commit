import { generateCommitMessageSystemPrompt } from "../prompt/prompt";
import { ExtensionConfiguration, AIProvider } from "./types";

export const DEFAULT_CONFIG: ExtensionConfiguration = {
  language: "Simplified Chinese",
  systemPrompt: generateCommitMessageSystemPrompt("Simplified Chinese"),
  defaultProvider: AIProvider.OPENAI,
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-3.5-turbo",
  },
  ollama: {
    baseUrl: "http://localhost:11434",
    model: "llama2",
  },
  vscode: {
    model: "default",
  },
};
