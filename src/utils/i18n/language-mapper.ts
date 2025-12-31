import * as vscode from "vscode";

/**
 * 应用支持的语言类型
 */
export type AppLanguage =
  | "Simplified Chinese"
  | "Traditional Chinese"
  | "Japanese"
  | "Korean"
  | "Czech"
  | "German"
  | "French"
  | "Italian"
  | "Dutch"
  | "Portuguese"
  | "Vietnamese"
  | "English"
  | "Spanish"
  | "Swedish"
  | "Russian"
  | "Bahasa"
  | "Polish"
  | "Turkish"
  | "Thai";

/**
 * VSCode 系统语言到应用语言的映射
 * 参考：https://code.visualstudio.com/docs/getstarted/locales
 */
const VSCODE_TO_APP_LANGUAGE_MAP: Record<string, AppLanguage> = {
  // 中文
  zh: "Simplified Chinese",
  "zh-cn": "Simplified Chinese",
  "zh-CN": "Simplified Chinese",
  "zh-tw": "Traditional Chinese",
  "zh-TW": "Traditional Chinese",
  "zh-hk": "Traditional Chinese",
  "zh-HK": "Traditional Chinese",

  // 英语
  en: "English",
  "en-US": "English",
  "en-GB": "English",
  "en-AU": "English",
  "en-CA": "English",

  // 日语
  ja: "Japanese",
  "ja-JP": "Japanese",

  // 韩语
  ko: "Korean",
  "ko-KR": "Korean",

  // 德语
  de: "German",
  "de-DE": "German",
  "de-AT": "German",
  "de-CH": "German",

  // 法语
  fr: "French",
  "fr-FR": "French",
  "fr-CA": "French",
  "fr-CH": "French",

  // 西班牙语
  es: "Spanish",
  "es-ES": "Spanish",
  "es-MX": "Spanish",

  // 意大利语
  it: "Italian",
  "it-IT": "Italian",

  // 葡萄牙语
  pt: "Portuguese",
  "pt-BR": "Portuguese",
  "pt-PT": "Portuguese",

  // 荷兰语
  nl: "Dutch",
  "nl-NL": "Dutch",

  // 俄语
  ru: "Russian",
  "ru-RU": "Russian",

  // 波兰语
  pl: "Polish",
  "pl-PL": "Polish",

  // 土耳其语
  tr: "Turkish",
  "tr-TR": "Turkish",

  // 捷克语
  cs: "Czech",
  "cs-CZ": "Czech",

  // 瑞典语
  sv: "Swedish",
  "sv-SE": "Swedish",

  // 越南语
  vi: "Vietnamese",
  "vi-VN": "Vietnamese",

  // 泰语
  th: "Thai",
  "th-TH": "Thai",

  // 印尼语/巴哈萨语
  id: "Bahasa",
  "id-ID": "Bahasa",
  ms: "Bahasa",
  "ms-MY": "Bahasa",
};

/**
 * 获取应用默认语言（基于 VSCode 系统语言）
 * @returns 应用支持的语言标识符
 */
export function getDefaultLanguage(): AppLanguage {
  const vscodeLang = vscode.env.language;

  // 尝试精确匹配
  if (VSCODE_TO_APP_LANGUAGE_MAP[vscodeLang]) {
    return VSCODE_TO_APP_LANGUAGE_MAP[vscodeLang];
  }

  // 尝试不带区域代码的匹配
  const langCode = vscodeLang.split("-")[0];
  if (VSCODE_TO_APP_LANGUAGE_MAP[langCode]) {
    return VSCODE_TO_APP_LANGUAGE_MAP[langCode];
  }

  // 默认返回简体中文
  return "Simplified Chinese";
}

/**
 * 创建包含默认语言的用户偏好设置
 * @returns 包含默认值的偏好设置对象
 */
export function createDefaultPreferences(): {
  temperature: number;
  verbosity: number;
  rateLimitSeconds: number;
  consecutiveMistakeLimit: number;
  language: AppLanguage;
} {
  return {
    temperature: 0.0,
    verbosity: 0,
    rateLimitSeconds: 5,
    consecutiveMistakeLimit: 3,
    language: getDefaultLanguage(),
  };
}

/**
 * 映射 VSCode 语言代码到应用语言
 * @param vscodeLang VSCode 语言代码 (如 "zh-CN", "en-US")
 * @returns 应用语言标识符
 */
export function mapVsCodeLanguageToAppLanguage(vscodeLang: string): AppLanguage {
  return (
    VSCODE_TO_APP_LANGUAGE_MAP[vscodeLang] ||
    VSCODE_TO_APP_LANGUAGE_MAP[vscodeLang.split("-")[0]] ||
    "Simplified Chinese"
  );
}
