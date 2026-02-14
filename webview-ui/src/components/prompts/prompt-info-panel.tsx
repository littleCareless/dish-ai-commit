import { getSubCategoryFromKey } from "@/utils/prompt-helpers";
import {
  ActivePromptSource,
  CATEGORY_DISPLAY_NAMES,
  CommitSubCategory,
  PromptCategory,
  PromptDetail,
  SUB_CATEGORY_DISPLAY_NAMES,
  WorkspaceInfo,
} from "@shared/types/prompts";
import React from "react";
import { useTranslation } from "react-i18next";

interface PromptInfoPanelProps {
  selectedKey: string | null;
  prompts: { [key: string]: PromptDetail };
  activePromptsByCategory: Record<PromptCategory, string>;
  activePromptsBySubCategory: Record<PromptCategory, Record<string, string>>;
  activeSources: Record<string, ActivePromptSource | null>;
  workspaces: WorkspaceInfo[];
  guideExpanded: Record<string, boolean>;
  setGuideExpanded: (expanded: Record<string, boolean>) => void;
  getCategoryFromKey: (key: string) => PromptCategory;
}

export const PromptInfoPanel: React.FC<PromptInfoPanelProps> = ({
  selectedKey,
  prompts,
  activePromptsByCategory,
  activePromptsBySubCategory,
  activeSources,
  workspaces,
  guideExpanded,
  setGuideExpanded,
  getCategoryFromKey,
}) => {
  const { t } = useTranslation("prompts-page");

  if (!selectedKey) return null;

  const category = getCategoryFromKey(selectedKey);
  const detail = prompts[selectedKey];

  // 检查活跃状态（支持子分类级别）
  const subCategory = getSubCategoryFromKey(selectedKey);
  const isActive = subCategory
    ? activePromptsBySubCategory[category]?.[subCategory] === selectedKey
    : activePromptsByCategory[category] === selectedKey;

  // 从新的 activeSources 结构中获取源信息（按 promptKey 存储）
  const source = activeSources[selectedKey];

  // 使用独立的状态 key，避免与 guide 状态冲突
  const infoStateKey = `info_${selectedKey}`;
  const isExpanded = guideExpanded[infoStateKey] || false;
  const toggleExpand = () => {
    setGuideExpanded({
      ...guideExpanded,
      [infoStateKey]: !isExpanded,
    });
  };

  return (
    <div className="bg-[var(--vscode-editor-inactiveSelectionBackground)] rounded-md mb-4 border border-[var(--vscode-widget-border)]">
      {/* Header */}
      <div
        className="p-2 cursor-pointer flex items-center justify-between hover:bg-[var(--vscode-list-hoverBackground)] transition-colors"
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{t("promptInfo")}</span>
          <span
            className={`text-xs font-bold ${
              isActive
                ? "text-green-500"
                : "text-[var(--vscode-descriptionForeground)]"
            }`}
          >
            {isActive ? "✓" : "○"}
          </span>
        </div>
        <span className="text-xs text-[var(--vscode-descriptionForeground)]">
          {isExpanded ? "▼" : "▶"}
        </span>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-2 text-sm space-y-1 text-[var(--vscode-descriptionForeground)] border-t border-[var(--vscode-widget-border)] bg-[var(--vscode-editor-background)]">
          {detail?.title && (
            <div>
              {t("title")}:{" "}
              <span className="font-semibold text-[var(--vscode-foreground)]">
                {detail.title}
              </span>
            </div>
          )}
          <div>
            {t("key")}:{" "}
            <span className="font-mono text-[var(--vscode-foreground)]">
              {selectedKey}
            </span>
          </div>
          <div>
            {t("category")}:{" "}
            <span className="text-[var(--vscode-foreground)]">
              {CATEGORY_DISPLAY_NAMES[category]}
            </span>
          </div>
          {category === PromptCategory.Commit && (
            <div>
              {t("subCategory")}:{" "}
              <span className="text-[var(--vscode-foreground)]">
                {SUB_CATEGORY_DISPLAY_NAMES[
                  getSubCategoryFromKey(selectedKey) as CommitSubCategory
                ] || "-"}
              </span>
            </div>
          )}
          {source && (
            <div>
              {t("source")}:
              <span className="text-[var(--vscode-foreground)] ml-1">
                {source.source === "project" && t("projectLevel")}
                {source.source === "workspace" &&
                  `${t("workspaceLevel")} (${
                    workspaces.find((w) => w.id === source.workspaceId)?.name ||
                    "Unknown"
                  })`}
                {source.source === "global" && t("globalLevel")}
              </span>
            </div>
          )}
          <div>
            {t("status")}:
            <span
              className={`ml-1 font-bold ${
                isActive
                  ? "text-green-500"
                  : "text-[var(--vscode-descriptionForeground)]"
              }`}
            >
              {isActive ? `✓ ${t("active")}` : `○ ${t("inactive")}`}
            </span>
          </div>
          {workspaces.length > 1 && (
            <div className="text-xs mt-1 p-2 bg-[var(--vscode-editor-background)] rounded">
              {t("workspaceHintMulti", { count: workspaces.length })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
