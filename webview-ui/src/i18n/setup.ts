import i18next, { TFunction } from "i18next";
import { initReactI18next } from "react-i18next";

let initPromise: Promise<TFunction>;

// Prevent re-initialization
if (i18next.isInitialized) {
  console.log("[i18n/setup] i18next is already initialized.");
  initPromise = Promise.resolve(i18next.t);
} else {
  // Build translations object

  const resources: Record<string, Record<string, any>> = {};

  // Dynamically load locale files
  const localeFiles = import.meta.glob("./locales/**/*.json", { eager: true });

  // Process all locale files
  Object.entries(localeFiles).forEach(([path, module]) => {
    // Extract language and namespace from path
    // Example path: './locales/en/translation.json' -> language: 'en', namespace: 'translation'
    const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json/);

    if (match) {
      // 1. 强制转换为小写，避免 zh-CN vs zh-cn 问题
      const language = match[1].toLowerCase();
      const namespace = match[2];

      // Initialize language object if it doesn't exist
      if (!resources[language]) {
        resources[language] = {};
      }

      // Add namespace resources to language
      // 2. 安全获取 JSON 内容
      // 某些环境下 module 是 { default: { title: ... } }，有些直接是 { title: ... }
      // 甚至有些时候 module 自身包含 default 属性但不是我们要的
      const content =
        (module as { default?: Record<string, unknown> }).default ?? module;

      resources[language][namespace] = content;
    }
  });

  // 计算出所有的 Namespaces (保险起见)
  const allNamespaces = new Set<string>();
  Object.values(resources).forEach((langRes) => {
    Object.keys(langRes).forEach((ns) => allNamespaces.add(ns));
  });

  console.log("[i18n/setup] Dynamically loaded translations:", {
    languages: Object.keys(resources),
    namespaces: Object.entries(resources).map(([lang, ns]) => ({
      language: lang,
      namespaces: Object.keys(ns),
    })),
  });

  // 5. 从 window.initialData 获取初始语言
  const initialLanguage =
    (window as { initialData?: { language?: string } }).initialData?.language ||
    "zh-cn";
  console.log(
    `[i18n/setup] Initial language from window.initialData: ${initialLanguage}`,
  );

  // Initialize i18next for React with all resources
  initPromise = i18next.use(initReactI18next).init({
    resources, // Load all resources at initialization
    lng: initialLanguage, // 使用从 initialData 获取的语言
    fallbackLng: "zh-cn",

    // 3. 显式声明加载了哪些命名空间
    ns: Array.from(allNamespaces),
    defaultNS: "translation", // 建议设置一个默认的
    fallbackNS: "translation",

    // 4. 忽略大小写检查，增加容错
    lowerCaseLng: true,

    debug: true,
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    react: {
      useSuspense: false, // Disable suspense to avoid loading issues in webview
    },
    // 添加非严格命名空间模式
    // ns: Object.keys(resources.en || {}), // 使用英语的命名空间作为默认
    // defaultNS: "translation",
  });

  // Wait for initialization to complete
  initPromise
    .then(() => {
      console.log("[i18n/setup] Initialization complete:", {
        currentLanguage: i18next.language,
        availableLanguages: Object.keys(resources),
        loadedNamespaces: i18next.options.ns,
      });
    })
    .catch((error: Error) => {
      console.error("[i18n/setup] Initialization failed:", error);
    });
}

export default i18next;
export { initPromise };
