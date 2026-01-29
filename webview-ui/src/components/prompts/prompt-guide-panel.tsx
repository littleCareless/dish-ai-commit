import React from "react";
import { useTranslation } from "react-i18next";
import { PromptCategory, CommitSubCategory } from "@shared/types/prompts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getSubCategoryFromKey } from "@/utils/prompt-helpers";

interface PromptGuidePanelProps {
  selectedKey: string | null;
  guideExpanded: Record<string, boolean>;
  setGuideExpanded: (expanded: Record<string, boolean>) => void;
  getCategoryFromKey: (key: string) => PromptCategory;
}

interface GuideInfo {
  title: string;
  color: string;
  brief: string;
  content: string[];
  tooltip: string;
}

export const PromptGuidePanel: React.FC<PromptGuidePanelProps> = ({
  selectedKey,
  guideExpanded,
  setGuideExpanded,
  getCategoryFromKey,
}) => {
  const { t } = useTranslation("prompts-page");

  if (!selectedKey) return null;

  const category = getCategoryFromKey(selectedKey);
  if (category !== PromptCategory.Commit) return null;

  const subCategory = getSubCategoryFromKey(selectedKey);
  if (!subCategory) return null;

  // 标准提交模式不需要特殊引导提示
  if (subCategory === CommitSubCategory.Standard) {
    return null;
  }

  // 根据子分类显示不同的引导信息
  const guideInfo: Record<CommitSubCategory, GuideInfo> = {
    [CommitSubCategory.LayeredFile]: {
      title: t("guideLayeredFileTitle"),
      color: "text-yellow-600",
      brief: t("guideLayeredFileLine1"),
      content: [
        t("guideLayeredFileLine2"),
        t("guideLayeredFileLine3"),
        t("guideLayeredFileLine4"),
        t("guideLayeredFileLine5"),
      ],
      tooltip: t("tooltipLayeredFile"),
    },
    [CommitSubCategory.LayeredBatch]: {
      title: t("guideLayeredBatchTitle"),
      color: "text-orange-600",
      brief: t("guideLayeredBatchLine1"),
      content: [
        t("guideLayeredBatchLine2"),
        t("guideLayeredBatchLine3"),
        t("guideLayeredBatchLine4"),
        t("guideLayeredBatchLine5"),
      ],
      tooltip: t("tooltipLayeredBatch"),
    },
    [CommitSubCategory.System]: {
      title: t("guideSystemTitle"),
      color: "text-gray-600",
      brief: t("guideSystemLine1"),
      content: [t("guideSystemLine2"), t("guideSystemLine3")],
      tooltip: t("tooltipSystem"),
    },
    // 为其他可能的子分类提供默认值
    [CommitSubCategory.Standard]: {
      title: "",
      color: "",
      brief: "",
      content: [],
      tooltip: "",
    },
    [CommitSubCategory.Layered]: {
      title: "",
      color: "",
      brief: "",
      content: [],
      tooltip: "",
    },
  };

  const guide = guideInfo[subCategory];
  if (!guide || !guide.title) return null;

  const isExpanded = guideExpanded[selectedKey] || false;
  const toggleExpand = () => {
    setGuideExpanded({
      ...guideExpanded,
      [selectedKey]: !isExpanded,
    });
  };

  return (
    <div className="bg-[var(--vscode-editor-inactiveSelectionBackground)] rounded-md mb-4 border border-[var(--vscode-widget-border)]">
      {/* Header - Clickable to toggle */}
      <div
        className={`p-2 cursor-pointer flex items-center justify-between hover:bg-[var(--vscode-list-hoverBackground)] transition-colors ${
          isExpanded ? "border-b border-[var(--vscode-widget-border)]" : ""
        }`}
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`font-medium text-sm ${guide.color} truncate`}>
            {guide.title}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-[var(--vscode-descriptionForeground)] cursor-help hover:text-[var(--vscode-foreground)]">
                ⓘ
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-[250px]">{guide.tooltip}</div>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--vscode-descriptionForeground)]">
            {guide.brief}
          </span>
          <span className="text-xs text-[var(--vscode-descriptionForeground)]">
            {isExpanded ? "▼" : "▶"}
          </span>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-2 text-sm text-[var(--vscode-descriptionForeground)] space-y-1 bg-[var(--vscode-editor-background)]">
          {guide.content.map((line, idx) => (
            <div key={idx} className="pl-2">
              {line}
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-[var(--vscode-widget-border)] text-xs text-[var(--vscode-descriptionForeground)] italic">
            {t("customizationTip")}
          </div>
        </div>
      )}
    </div>
  );
};
