import { Button } from "@/components/ui/button";
import type { QuickStartTemplate } from "@/hooks/useOnboarding";
import { Gift, Server, Sparkles, Zap } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

interface TemplateCardProps {
  template: QuickStartTemplate;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * 快速开始模板卡片
 */
export const TemplateCard = ({
  template,
  isSelected,
  onClick,
}: TemplateCardProps) => {
  const { t } = useTranslation("welcome-page");

  const badge = useMemo(() => {
    if (!template.badge) return null;

    const badgeConfig: Record<
      string,
      { icon: React.ReactNode; text: string; color: string }
    > = {
      recommended: {
        icon: <Sparkles className="w-3 h-3" />,
        text: t("templates.badge.recommended"),
        color: "var(--vscode-charts-yellow)",
      },
      free: {
        icon: <Gift className="w-3 h-3" />,
        text: t("templates.badge.free"),
        color: "var(--vscode-charts-green)",
      },
      local: {
        icon: <Server className="w-3 h-3" />,
        text: t("templates.badge.local"),
        color: "var(--vscode-charts-blue)",
      },
      fastest: {
        icon: <Zap className="w-3 h-3" />,
        text: t("templates.badge.fastest"),
        color: "var(--vscode-charts-orange)",
      },
    };

    return badgeConfig[template.badge];
  }, [template.badge, t]);

  return (
    <Button
      onClick={onClick}
      variant="outline"
      className={`relative h-auto p-4 text-left transition-all duration-200 w-full ${
        isSelected ? "ring-2" : ""
      }`}
      style={{
        borderColor: isSelected
          ? "var(--vscode-button-background)"
          : "var(--vscode-panel-border)",
        backgroundColor: isSelected
          ? "var(--vscode-list-activeSelectionBackground)"
          : "var(--vscode-editor-background)",
        color: "var(--vscode-foreground)",
        // @ts-expect-error ringColor is a valid CSS variable for Tailwind
        "--tw-ring-color": "var(--vscode-button-background)",
      }}
    >
      {/* Badge */}
      {badge && (
        <div
          className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: badge.color,
            color: "var(--vscode-editor-background)",
          }}
        >
          {badge.icon}
          {badge.text}
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col gap-2">
        <div className="font-medium">{t(template.nameKey)}</div>
        <div
          className="text-sm"
          style={{ color: "var(--vscode-descriptionForeground)" }}
        >
          {t(template.descriptionKey)}
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-2 mt-1">
          {template.isFree && (
            <span
              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: "var(--vscode-badge-background)",
                color: "var(--vscode-badge-foreground)",
              }}
            >
              <Gift className="w-3 h-3" />
              {t("templates.free")}
            </span>
          )}
          {!template.requiresApiKey && (
            <span
              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: "var(--vscode-badge-background)",
                color: "var(--vscode-badge-foreground)",
              }}
            >
              <Server className="w-3 h-3" />
              {t("templates.noApiKey")}
            </span>
          )}
        </div>
      </div>
    </Button>
  );
};

interface TemplateGridProps {
  templates: QuickStartTemplate[];
  selectedTemplateId: string | null;
  onSelect: (template: QuickStartTemplate) => void;
}

/**
 * 模板选择网格
 */
export const TemplateGrid = ({
  templates,
  selectedTemplateId,
  onSelect,
}: TemplateGridProps) => {
  const { t } = useTranslation("welcome-page");

  if (templates.length === 0) {
    return (
      <div
        className="text-center py-8 text-sm"
        style={{ color: "var(--vscode-descriptionForeground)" }}
      >
        {t("templates.loading")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          isSelected={selectedTemplateId === template.id}
          onClick={() => onSelect(template)}
        />
      ))}
    </div>
  );
};

export default TemplateGrid;
