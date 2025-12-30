import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { routes } from "@/router/routes";
import { cn } from "@/utils/cn";
import {
  Archive,
  BarChart3,
  Bell,
  BookText,
  Bug,
  Database,
  FlaskConical,
  Globe,
  Info,
  MessageSquare,
  Replace,
  Settings,
  Users,
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

type NavigationItem = {
  path: (typeof routes)[keyof typeof routes];
  label: string;
  icon: React.ElementType;
  description: string;
};

export const Navigation: React.FC = () => {
  // 使用 react-i18next 的标准 hook，它会自动响应语言变化
  const { t } = useTranslation("translation");
  const { setLanguage } = useExtensionState();

  // 使用 useMemo 确保语言变化时重新计算
  // 现在使用 TranslationContext 的 t 函数，它应该能正确响应语言变化
  const navigationItems = React.useMemo(() => {
    const items: NavigationItem[] = [
      // 核心导航项 - 所有环境都显示
      {
        path: routes.settings,
        label: t("nav.settings"),
        icon: Settings,
        description: t("nav.settings_description"),
      },
      {
        path: routes.migration,
        label: t("nav.migration"),
        icon: Replace,
        description: t("nav.migration_description"),
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
        path: routes.usage,
        label: t("nav.usage"),
        icon: BarChart3,
        description: t("nav.usage_description"),
      },
      {
        path: routes.about,
        label: t("nav.about"),
        icon: Info,
        description: t("nav.about_description"),
      },
    ];

    // 开发环境添加调试功能
    if (import.meta.env.ENABLE_DEBUG_ROUTES) {
      items.push(
        {
          path: routes.storage,
          label: t("nav.storage"),
          icon: Archive,
          description: t("nav.storage_description"),
        },
        {
          path: routes.i18nDebug,
          label: "i18n Debug",
          icon: Bug,
          description: "国际化调试工具",
        },
        {
          path: routes.profiles,
          label: "配置文件",
          icon: Users,
          description: "配置文件管理",
        },
      );
    }

    return items;
  }, [t]);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
  };

  return (
    <nav
      className="h-full flex flex-col"
      style={{
        backgroundColor: "var(--vscode-sideBar-background, hsl(var(--card)))",
        color: "var(--vscode-sideBar-foreground, hsl(var(--foreground)))",
      }}
    >
      {/* 导航菜单 */}
      <div className="flex-1 p-2 overflow-y-auto">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }: { isActive: boolean }) =>
                  cn(
                    "group flex items-center gap-2 px-2 py-2 rounded-xl text-sm transition-all duration-200 ease-in-out border border-transparent",
                    "hover:bg-accent hover:text-accent-foreground hover:shadow-sm hover:border-accent-foreground/10",
                    isActive &&
                      "bg-accent text-accent-foreground shadow-sm border-accent-foreground/20",
                  )
                }
                style={({ isActive }) => ({
                  // 确保在深色模式下有足够的对比度
                  ...(isActive
                    ? {
                        backgroundColor: "var(--accent)",
                        color: "var(--accent-foreground)",
                        borderColor: "var(--accent-foreground)",
                        opacity: 0.9,
                      }
                    : {}),
                })}
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
                      style={{
                        backgroundColor: isActive
                          ? "var(--primary)"
                          : "var(--muted)",
                        color: isActive
                          ? "var(--primary-foreground)"
                          : "var(--muted-foreground)",
                      }}
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
      <div
        className="p-4 border-t"
        style={{
          borderColor: "var(--border)",
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full">
            <div
              className="group flex items-center gap-1 px-1 py-1 rounded-xl text-sm transition-all duration-200 ease-in-out border border-transparent hover:bg-accent hover:text-accent-foreground hover:shadow-sm hover:border-accent-foreground/10"
              style={{
                borderColor: "var(--border)",
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: "var(--muted)",
                  color: "var(--muted-foreground)",
                }}
              >
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
                handleLanguageChange("en");
              }}
            >
              English
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
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
