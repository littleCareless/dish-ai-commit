import * as vscode from "vscode";
import { ConfigurationManager } from "./config/ConfigurationManager";
import { AIProvider } from "./config/types";

export class ConfigValidator {
  static async validateConfiguration(): Promise<boolean> {
    const config = ConfigurationManager.getInstance().getConfiguration();
    console.log("defaultProvider", config.defaultProvider);
    switch (config.defaultProvider) {
      case AIProvider.OPENAI:
        return this.validateOpenAIConfig();
      case AIProvider.OLLAMA:
        return this.validateOllamaConfig();
      default:
        return true;
    }
  }

  private static async validateOpenAIConfig(): Promise<boolean> {
    const config = ConfigurationManager.getInstance().getConfiguration();

    if (!config.openai.apiKey) {
      const action = await vscode.window.showErrorMessage(
        "OpenAI API Key is not configured. Would you like to configure it now?",
        "Yes",
        "No"
      );

      if (action === "Yes") {
        await vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "dish-ai-commit.OPENAI_API_KEY"
        );
      }
      return false;
    }
    return true;
  }

  private static async validateOllamaConfig(): Promise<boolean> {
    const config = ConfigurationManager.getInstance().getConfiguration();

    if (!config.ollama.baseUrl) {
      const action = await vscode.window.showErrorMessage(
        "Ollama Base URL is not configured. Would you like to configure it now?",
        "Yes",
        "No"
      );

      if (action === "Yes") {
        await vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "dish-ai-commit.OLLAMA_BASE_URL"
        );
      }
      return false;
    }
    return true;
  }
}
