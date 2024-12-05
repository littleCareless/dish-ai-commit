import OpenAI from "openai";
import { ConfigurationManager } from "../config/ConfigurationManager";

export function getOpenAIConfig() {
  const configManager = ConfigurationManager.getInstance();
  const apiKey = configManager.getConfig<string>("OPENAI_API_KEY", false);
  const baseURL = configManager.getConfig<string>("OPENAI_BASE_URL", false);
  const apiVersion = configManager.getConfig<string>("OPENAI_MODEL", false);

  // if (!apiKey) {
  //     throw new Error('The OPENAI_API_KEY environment variable is missing or empty.');

  // }

  const config: {
    apiKey: string;
    baseURL?: string;
    defaultQuery?: { "api-version": string };
    defaultHeaders?: { "api-key": string };
  } = {
    apiKey,
  };

  if (baseURL) {
    config.baseURL = baseURL;
    if (apiVersion) {
      config.defaultQuery = { "api-version": apiVersion };
      config.defaultHeaders = { "api-key": apiKey };
    }
  }

  return config;
}

export function createOpenAIApi(): OpenAI {
  const config = getOpenAIConfig();
  console.log("config", config);
  return new OpenAI(config);
}
