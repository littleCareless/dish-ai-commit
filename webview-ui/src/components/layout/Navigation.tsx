import {
  Bell,
  BookText,
  Database,
  FlaskConical,
  Globe,
  Info,
  MessageSquare,
  Settings,
} from "lucide-react";
import React, { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { useExtensionState } from "../../context/ExtensionStateContext";
import { useAppTranslation } from "../../i18n/translation-context";
import { cn } from "../../lib/utils";
import { routes } from "../../router/routes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export const Navigation: React.FC = () => {
  console.log("[Navigation] rendered");
  // 使用 TranslationContext 的 t 函数，它应该能正确响应语言变化
  const { t, i18n } = useAppTranslation();
  const { setLanguage, language: extensionLanguage } = useExtensionState();

  // 检查 i18n 的资源加载情况
  const resources = i18n.options.resources || {};
  const currentLangResources = resources[i18n.language] as
    | Record<string, unknown>
    | undefined;

  // 检查翻译资源内容
  const translationResource = currentLangResources?.translation as
    | { nav?: { settings?: string; notifications?: string; language?: string } }
    | undefined;
  const navResource = translationResource?.nav;

  // 使用 getResourceBundle 直接获取资源
  const directResource = i18n.getResourceBundle(
    i18n.language,
    "translation",
  ) as { nav?: { settings?: string } } | undefined;
  const directNavSettings = directResource?.nav?.settings;

  console.log("[Navigation] useAppTranslation result:", {
    i18nLanguage: i18n.language,
    tFunctionType: typeof t,
    testTranslation: t("nav.settings"),
    availableLanguages: Object.keys(resources),
    currentLanguageResources: currentLangResources
      ? Object.keys(currentLangResources)
      : "NOT FOUND",
    translationNamespace: translationResource ? "EXISTS" : "NOT FOUND",
    navResource: navResource ? "EXISTS" : "NOT FOUND",
    navSettingsDirect: navResource?.settings || "NOT FOUND",
    directTranslation: i18n.t("nav.settings", { lng: i18n.language }),
    directTranslationNoOpts: i18n.t("nav.settings"),
    directResourceBundle: directNavSettings || "NOT FOUND",
    // 检查资源内容的实际值
    translationResourceSample: translationResource
      ? JSON.stringify(translationResource).substring(0, 200)
      : "NO RESOURCE",
  });

  // 追踪之前的语言和翻译值
  const prevLanguageRef = useRef<string | null>(null);
  const prevTranslationsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const currentTranslations = {
      settings: t("nav.settings"),
      notifications: t("nav.notifications"),
      language: t("nav.language"),
    };

    console.log("[Navigation] useEffect triggered:", {
      i18nLanguage: i18n.language,
      extensionLanguage,
      prevLanguage: prevLanguageRef.current,
      translationKeys: currentTranslations,
      prevTranslations: prevTranslationsRef.current,
    });

    // 检查翻译值是否变化
    const translationsChanged =
      prevTranslationsRef.current.settings !== currentTranslations.settings ||
      prevTranslationsRef.current.notifications !==
        currentTranslations.notifications ||
      prevTranslationsRef.current.language !== currentTranslations.language;

    if (translationsChanged) {
      console.log("[Navigation] Translations changed:", {
        prev: prevTranslationsRef.current,
        current: currentTranslations,
      });
      prevTranslationsRef.current = currentTranslations;
    }

    if (i18n.language !== prevLanguageRef.current) {
      console.log(
        "[Navigation] i18n.language changed from",
        prevLanguageRef.current,
        "to",
        i18n.language,
      );
      prevLanguageRef.current = i18n.language || null;
    }
  }, [t, i18n.language, extensionLanguage]);

  // 使用 useMemo 确保语言变化时重新计算
  // 现在使用 TranslationContext 的 t 函数，它应该能正确响应语言变化
  const navigationItems = React.useMemo(() => {
    const items = [
      {
        path: routes.settings,
        label: t("nav.settings"),
        icon: Settings,
        description: t("nav.settings_description"),
      },
      {
        path: routes.notifications,
        label: t("nav.notifications"),
        icon: Bell,
        description: t("nav.notifications_description"),
      },
      {
        path: routes.context,
        label: t("nav.context"),
        icon: BookText,
        description: t("nav.context_description"),
      },
      {
        path: routes.prompts,
        label: t("nav.prompts"),
        icon: MessageSquare,
        description: t("nav.prompts_description"),
      },
      {
        path: routes.experimental,
        label: t("nav.experimental"),
        icon: FlaskConical,
        description: t("nav.experimental_description"),
      },
      {
        path: routes.indexing,
        label: t("nav.indexing"),
        icon: Database,
        description: t("nav.indexing_description"),
      },
      {
        path: routes.about,
        label: t("nav.about"),
        icon: Info,
        description: t("nav.about_description"),
      },
    ];

    console.log(
      "[Navigation] navigationItems computed with language:",
      i18n.language,
      "Labels:",
      items.map((item) => ({ path: item.path, label: item.label })),
    );

    return items;
  }, [t, i18n.language]);

  console.log(
    "[Navigation] Current navigation items labels:",
    navigationItems.map((item) => ({ path: item.path, label: item.label })),
  );

  const handleLanguageChange = (lang: string) => {
    console.log("[Navigation] Language change requested:", lang);
    console.log(
      "[Navigation] Before change - i18n.language:",
      i18n.language,
      "extensionLanguage:",
      extensionLanguage,
    );
    setLanguage(lang);
    console.log("[Navigation] After setLanguage call");
  };

  return (
    <nav className="h-full flex flex-col">
      {/* 导航菜单 */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }: { isActive: boolean }) =>
                  cn(
                    "group flex items-center gap-2 px-2 py-2 rounded-xl text-sm transition-all duration-200 border border-transparent",
                    "hover:bg-accent hover:text-accent-foreground hover:shadow-sm",
                    isActive &&
                      "bg-accent text-accent-foreground shadow-sm border-accent-foreground/20",
                  )
                }
              >
                {({ isActive }: { isActive: boolean }) => (
                  <>
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{item.label}</div>
                    </div>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
      {/* 语言切换器 */}
      <div className="p-4 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full">
            <div className="group flex items-center gap-2 px-2 py-2 rounded-xl text-sm transition-all duration-200 border border-transparent hover:bg-accent hover:text-accent-foreground hover:shadow-sm">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{t("nav.language")}</div>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="right" className="w-40">
            <DropdownMenuItem
              onSelect={() => {
                // 只通过 setLanguage 更新状态，让 TranslationProvider 统一处理语言切换
                handleLanguageChange("en");
              }}
            >
              English
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                // 只通过 setLanguage 更新状态，让 TranslationProvider 统一处理语言切换
                handleLanguageChange("zh-cn");
              }}
            >
              简体中文
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};
