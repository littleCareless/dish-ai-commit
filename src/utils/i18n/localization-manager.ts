import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

interface MessageMap {
  [key: string]: string | MessageMap;
}

let messages: MessageMap = {};

export function initializeLocalization(context: vscode.ExtensionContext): void {
  const locale = vscode.env.language;

  try {
    const resourcePath = path.join(
      context.extensionPath,
      "i18n",
      `${locale}.json`
    );
    const defaultPath = path.join(context.extensionPath, "i18n", "en.json");

    const loadedMessages = fs.existsSync(resourcePath)
      ? JSON.parse(fs.readFileSync(resourcePath, "utf8"))
      : JSON.parse(fs.readFileSync(defaultPath, "utf8"));

    // 检查重复 key
    const duplicates = findDuplicateKeys(loadedMessages);
    if (duplicates.length > 0) {
      console.warn("Found duplicate message keys:", duplicates);
    }

    messages = loadedMessages;

  } catch (error) {
    console.error("Failed to load localization file:", error);
    throw new Error(`Localization initialization failed: ${error}`);
  }
}

export function getMessage(key: string): string {
  // 先尝试直接获取完整key的值
  if (typeof messages[key] === "string") {
    return messages[key] as string;
  }

  // 如果完整key不存在,则尝试按点分割逐层查找
  const parts = key.split(".");
  let current: MessageMap | string = messages;

  for (const part of parts) {
    if (typeof current !== "object" || current === null) {
      return key; // 如果中间节点不是对象,返回原始key
    }
    current = current[part];
    if (current === undefined) {
      return key; // 如果找不到对应的key,返回原始key
    }
  }

  return typeof current === "string" ? current : key;
}

export function formatMessage(key: string, args?: any[]): string {
  try {
    let message = getMessage(key);
    if (!message) {
      console.warn(`Missing localization key: ${key}`);
      return key;
    }

    if (args) {
      args.forEach((arg, index) => {
        const value = arg?.toString() ?? "";
        message = message.replace(`{${index}}`, value);
      });
    }

    return message;
  } catch (error) {
    console.error(`Error formatting message for key ${key}:`, error);
    return key;
  }
}

export function validateMessages(keys: string[]): string[] {
  return keys.filter((key) => !messages[key]);
}

export function clearLocalizationCache(): void {
  messages = {};
}

function findDuplicateKeys(obj: MessageMap, prefix = ""): string[] {
  const duplicates: string[] = [];
  const seen = new Set<string>();

  function traverse(current: MessageMap, currentPrefix: string) {
    for (const key in current) {
      const fullKey = currentPrefix ? `${currentPrefix}.${key}` : key;

      if (seen.has(fullKey)) {
        duplicates.push(fullKey);
      } else {
        seen.add(fullKey);
      }

      if (typeof current[key] === "object") {
        traverse(current[key] as MessageMap, fullKey);
      }
    }
  }

  traverse(obj, prefix);
  return duplicates;
}
