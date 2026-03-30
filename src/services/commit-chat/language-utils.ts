export type CommitChatLocale = "zh" | "en";

export function resolveCommitChatLocale(language?: string): CommitChatLocale {
  const normalized = String(language || "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return "zh";
  }

  if (
    normalized === "en" ||
    normalized.startsWith("en-") ||
    normalized.includes("english")
  ) {
    return "en";
  }

  if (
    normalized === "zh" ||
    normalized.startsWith("zh-") ||
    normalized.includes("chinese") ||
    normalized.includes("中文")
  ) {
    return "zh";
  }

  return "zh";
}

export function localize(
  language: string | undefined,
  zh: string,
  en: string
): string {
  return resolveCommitChatLocale(language) === "en" ? en : zh;
}

export function interpolate(
  template: string,
  params: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    if (!(key in params)) {
      return _match;
    }
    return String(params[key]);
  });
}
