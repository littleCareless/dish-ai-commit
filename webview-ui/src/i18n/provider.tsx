import { useExtensionState } from "@/context/ExtensionStateContext";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * I18nProvider - 监听 ExtensionState 的语言变化并同步到 i18next
 *
 * 重要：此组件必须在 I18nextProvider 内部使用
 */
export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { i18n } = useTranslation();
  const { language } = useExtensionState();

  useEffect(() => {
    console.log("[I18nProvider] Language sync check:", {
      exists: !!i18n,
      hasChangeLanguage: typeof i18n?.changeLanguage === "function",
      currentLanguage: i18n?.language,
      targetLanguage: language,
      isInitialized: i18n?.isInitialized,
      resources: i18n ? Object.keys(i18n.options.resources || {}) : [],
    });

    if (!i18n) {
      console.error("[I18nProvider] i18n object is undefined!");
      return;
    }

    if (typeof i18n.changeLanguage !== "function") {
      console.error("[I18nProvider] i18n.changeLanguage is not a function!");
      console.log("[I18nProvider] i18n keys:", Object.keys(i18n));
      return;
    }

    // 关键修复：即使语言相同也要调用一次，确保资源被加载
    if (language) {
      console.log(
        "[I18nProvider] Attempting language change:",
        `"${i18n.language}" -> "${language}"`,
      );

      i18n
        .changeLanguage(language)
        .then(() => {
          console.log(
            "[I18nProvider] ✅ Language changed successfully to:",
            i18n.language,
          );
          console.log(
            "[I18nProvider] Test translation:",
            i18n.t("nav.settings"),
          );
        })
        .catch((error: Error) => {
          console.error("[I18nProvider] ❌ Failed to change language:", error);
        });
    }
  }, [language, i18n]);

  return <>{children}</>;
};

export default I18nProvider;
