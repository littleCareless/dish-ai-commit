import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Folder, FolderGit, Globe } from "lucide-react";
import {
  PromptCategory,
  PromptDetail,
  PromptKey,
  CATEGORY_DISPLAY_NAMES,
  PROMPT_DISPLAY_NAMES,
  PROMPT_CATEGORIES,
  CommitSubCategory,
  SUB_CATEGORY_DISPLAY_NAMES,
  ActivePromptSource,
  WorkspaceInfo,
} from "@shared/types/prompts";
import { Button } from "@/components/ui/button";
import { getSubCategoryFromKey } from "@/utils/prompt-helpers";
import { DeleteConfirmModal } from "@/components/prompts/delete-confirm-modal";

interface PromptListProps {
  prompts: { [key: string]: PromptDetail };
  selectedKey: string | null;
  activePromptsByCategory: Record<PromptCategory, string>;
  activePromptsBySubCategory: Record<PromptCategory, Record<string, string>>;
  activeSources: Record<string, ActivePromptSource | null>;
  workspaces: WorkspaceInfo[];
  categoryFilter: PromptCategory | "all";
  onSelectChange: (key: string) => void;
  onDelete: (key: string) => void;
  onCreateNew: () => void;
  onResetAll: () => void;
  onCategoryFilterChange: (filter: PromptCategory | "all") => void;
}

export const PromptList: React.FC<PromptListProps> = ({
  prompts,
  selectedKey,
  activePromptsByCategory,
  activePromptsBySubCategory,
  activeSources,
  workspaces,
  categoryFilter,
  onSelectChange,
  onDelete,
  onCreateNew,
  onResetAll,
  onCategoryFilterChange,
}) => {
  const { t } = useTranslation("prompts-page");

  // 确认删除弹窗状态
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetKey, setDeleteTargetKey] = useState<string>("");

  // 渲染活跃指示器
  const renderActiveIndicator = (category: PromptCategory, key: string) => {
    // 检查是否有子分类映射
    const subCategory = getSubCategoryFromKey(key);
    const isActive = subCategory
      ? activePromptsBySubCategory[category]?.[subCategory] === key
      : activePromptsByCategory[category] === key;

    if (!isActive) return null;

    // 从新的 activeSources 结构中获取源信息（按 promptKey 存储）
    const source = activeSources[key];
    if (!source) return null;

    let icon = null;
    let tooltip = "";

    switch (source.source) {
      case "project":
        tooltip = t("projectLevel");
        icon = <Folder className="w-4 h-4 text-blue-500" />;
        break;
      case "workspace":
        tooltip = `${t("workspaceLevel")} (${workspaces.find((w) => w.id === source.workspaceId)?.name || "Unknown"})`;
        icon = <FolderGit className="w-4 h-4 text-green-500" />;
        break;
      case "global":
        tooltip = t("globalLevel");
        icon = <Globe className="w-4 h-4 text-gray-500" />;
        break;
    }

    return (
      <span title={tooltip} className="cursor-help ml-1">
        {icon}
      </span>
    );
  };

  // 渲染子分类活跃指示器
  const renderSubCategoryActiveIndicator = (subCat: CommitSubCategory) => {
    // 在子分类映射中查找该子分类的活跃提示词
    const subCategoryPrompts =
      activePromptsBySubCategory[PromptCategory.Commit] || {};
    const activeKey = subCategoryPrompts[subCat];

    if (!activeKey || !prompts[activeKey]) return null;

    const displayName =
      PROMPT_DISPLAY_NAMES[activeKey as PromptKey] || activeKey;

    return (
      <span className="text-green-500 text-xs ml-2 font-mono">
        ✓ {displayName}
      </span>
    );
  };

  // 渲染单个提示词列表项
  const renderPromptListItem = (
    key: string,
    detail: PromptDetail,
    category: PromptCategory,
  ) => {
    // 优先显示 title，然后是系统预设名称，最后是 key
    const displayName =
      detail.title ||
      PROMPT_DISPLAY_NAMES[key as PromptKey] ||
      `${key} (${CATEGORY_DISPLAY_NAMES[detail.category || category]})`;

    // 检查活跃状态（支持子分类级别）
    // 优先使用 detail.subCategory，如果没有则从 key 映射获取
    const subCategory = detail.subCategory || getSubCategoryFromKey(key);
    const isActive = subCategory
      ? activePromptsBySubCategory[category]?.[subCategory] === key
      : activePromptsByCategory[category] === key;

    return (
      <div
        key={key}
        onClick={() => onSelectChange(key)}
        className={`p-3 cursor-pointer flex justify-between items-center border-b border-[var(--vscode-panel-border)]
          hover:bg-[var(--vscode-list-hoverBackground)]
          ${
            selectedKey === key
              ? "bg-[var(--vscode-list-activeSelectionBackground)]"
              : ""
          }
          ${isActive ? "border-l-2 border-l-green-500" : ""}
        `}
      >
        <div className="flex items-center gap-2">
          {renderActiveIndicator(category, key)}
          <div>
            <div
              className={`font-semibold ${isActive ? "text-green-500" : ""}`}
            >
              {displayName}
              {isActive && " ✓"}
            </div>
            {detail.isCustomized && (
              <div className="text-xs text-[var(--vscode-descriptionForeground)]">
                {detail.isNew ? t("custom") : t("modified")} -
                {detail.source === "workspace"
                  ? t("workspace")
                  : detail.source === "project"
                    ? t("project")
                    : t("global")}
              </div>
            )}
          </div>
        </div>
        {detail.isNew && (
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTargetKey(key);
                setDeleteModalOpen(true);
              }}
              className="h-6 w-6 text-red-500"
            >
              🗑️
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-1/3 flex flex-col gap-4">
      <div className="flex gap-2">
        <Button onClick={onCreateNew} className="flex-1">
          {t("createNew")}
        </Button>
        <Button onClick={onResetAll} variant="secondary" className="flex-1">
          {t("resetAll")}
        </Button>
      </div>

      {/* 分类筛选器 */}
      <div className="flex gap-2 items-center">
        <span className="text-xs text-[var(--vscode-descriptionForeground)]">
          {t("filterCategory")}:
        </span>
        <select
          className="flex-1 p-1.5 border rounded bg-[var(--vscode-dropdown-background)] text-[var(--vscode-dropdown-foreground)] border-[var(--vscode-widget-border)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder)]"
          value={categoryFilter}
          onChange={(e) =>
            onCategoryFilterChange(e.target.value as PromptCategory | "all")
          }
        >
          <option value="all">{t("allCategories")}</option>
          {Object.values(PromptCategory).map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_DISPLAY_NAMES[cat]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-grow overflow-y-auto border border-[var(--vscode-panel-border)] rounded-md bg-[var(--vscode-editor-background)]">
        {Object.values(PromptCategory).map((category) => {
          if (categoryFilter !== "all" && categoryFilter !== category) {
            return null;
          }

          const categoryPrompts = Object.entries(prompts).filter(
            ([key, detail]) => {
              if (detail.category) {
                return detail.category === category;
              }

              const mappedCategory = PROMPT_CATEGORIES[key as PromptKey];
              if (category === PromptCategory.Custom) {
                return !mappedCategory;
              }
              return mappedCategory === category;
            },
          );

          if (categoryPrompts.length === 0) return null;

          if (category === PromptCategory.Commit) {
            const groupedBySubCategory: Record<string, typeof categoryPrompts> =
              {};

            categoryPrompts.forEach(([key, detail]) => {
              // 优先使用 detail.subCategory，如果没有则从 key 映射获取
              const subCategory =
                detail.subCategory || getSubCategoryFromKey(key);
              const groupKey = subCategory || "other";
              if (!groupedBySubCategory[groupKey]) {
                groupedBySubCategory[groupKey] = [];
              }
              groupedBySubCategory[groupKey].push([key, detail]);
            });

            const subCategoryOrder = [
              CommitSubCategory.LayeredFile,
              CommitSubCategory.LayeredBatch,
              CommitSubCategory.Standard,
              CommitSubCategory.System,
            ];

            // 获取所有分组，包括不在标准顺序中的
            const allGroups = Object.keys(groupedBySubCategory) as string[];

            // 按照 subCategoryOrder 排序，其他分组放在最后
            const sortedGroups = [
              ...subCategoryOrder.filter((g) => allGroups.includes(g)),
              ...allGroups.filter(
                (g) => !subCategoryOrder.includes(g as CommitSubCategory),
              ),
            ];

            return (
              <div key={category}>
                <div className="px-3 py-2 text-xs font-bold uppercase text-[var(--vscode-descriptionForeground)] bg-[var(--vscode-sideBar-background)] border-b border-[var(--vscode-panel-border)] sticky top-0">
                  {CATEGORY_DISPLAY_NAMES[category]}
                </div>
                {sortedGroups.map((subCat) => {
                  const promptsInSubCategory = groupedBySubCategory[subCat];
                  if (
                    !promptsInSubCategory ||
                    promptsInSubCategory.length === 0
                  ) {
                    return null;
                  }

                  // 获取子分类显示名称，如果不存在则使用 key
                  const displayName =
                    SUB_CATEGORY_DISPLAY_NAMES[subCat as CommitSubCategory] ||
                    subCat;

                  return (
                    <div key={subCat}>
                      <div className="px-3 py-1.5 text-xs font-semibold text-[var(--vscode-descriptionForeground)] bg-[var(--vscode-editor-inactiveSelectionBackground)] border-b border-[var(--vscode-panel-border)] flex justify-between items-center">
                        <span>{displayName}</span>
                        {renderSubCategoryActiveIndicator(
                          subCat as CommitSubCategory,
                        )}
                      </div>
                      {promptsInSubCategory.map(([key, detail]) =>
                        renderPromptListItem(key, detail, category),
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }

          return (
            <div key={category}>
              <div className="px-3 py-2 text-xs font-bold uppercase text-[var(--vscode-descriptionForeground)] bg-[var(--vscode-sideBar-background)] border-b border-[var(--vscode-panel-border)] sticky top-0">
                {CATEGORY_DISPLAY_NAMES[category]}
              </div>
              {categoryPrompts.map(([key, detail]) =>
                renderPromptListItem(key, detail, category),
              )}
            </div>
          );
        })}
      </div>

      {/* 确认删除弹窗 */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => {
          if (deleteTargetKey) {
            onDelete(deleteTargetKey);
          }
        }}
        promptKey={deleteTargetKey}
        promptDetail={deleteTargetKey ? prompts[deleteTargetKey] : undefined}
      />
    </div>
  );
};
