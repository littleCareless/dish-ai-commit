import { StorageLevel, WorkspaceInfo } from "@shared/types/prompts";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

interface StorageLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (level: StorageLevel, workspaceId?: string) => void;
  workspaces: WorkspaceInfo[];
  selectedPromptKey: string;
  selectedCategory: string;
}

export const StorageLevelModal: React.FC<StorageLevelModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  workspaces,
  selectedPromptKey,
  selectedCategory,
}) => {
  const { t } = useTranslation("prompts-page");
  const [selectedLevel, setSelectedLevel] = useState<StorageLevel>("global");
  const [selectedWorkspace, setSelectedWorkspace] = useState<
    string | undefined
  >();

  const handleConfirm = () => {
    if (
      (selectedLevel === "workspace" || selectedLevel === "project") &&
      !selectedWorkspace
    ) {
      return; // 需要{t('selectWorkspace')}
    }
    console.log(
      "[StorageLevelModal] Calling onSelect with:",
      selectedLevel,
      selectedWorkspace,
    );
    onSelect(selectedLevel, selectedWorkspace);
    onClose();
  };

  // 重置状态当模态框关闭时
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedLevel("global");
      setSelectedWorkspace(undefined);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-[var(--vscode-editor-background)] border border-[var(--vscode-widget-border)] rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--vscode-list-hoverBackground)] text-[var(--vscode-foreground)]"
          aria-label="Close dialog"
        >
          ×
        </button>
        <h2 className="text-lg font-bold mb-4 text-[var(--vscode-foreground)] pr-6">
          {t("storageSelection")}
        </h2>

        <div className="space-y-4">
          {/* {t('storageLevel')}选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--vscode-foreground)]">
              {t("storageLevel")}
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-[var(--vscode-list-hoverBackground)] border border-transparent hover:border-[var(--vscode-widget-border)]">
                <input
                  type="radio"
                  checked={selectedLevel === "global"}
                  onChange={() => setSelectedLevel("global")}
                  className="cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-semibold text-[var(--vscode-foreground)]">
                    🌍 {t("storageGlobal")}
                  </div>
                  <div className="text-xs text-[var(--vscode-descriptionForeground)]">
                    {t("storageGlobalDesc")}
                  </div>
                </div>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-[var(--vscode-list-hoverBackground)] border border-transparent hover:border-[var(--vscode-widget-border)]">
                <input
                  type="radio"
                  checked={selectedLevel === "workspace"}
                  onChange={() => setSelectedLevel("workspace")}
                  className="cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-semibold text-[var(--vscode-foreground)]">
                    📁 {t("storageWorkspace")}
                  </div>
                  <div className="text-xs text-[var(--vscode-descriptionForeground)]">
                    {t("storageWorkspaceDesc")}
                  </div>
                </div>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-[var(--vscode-list-hoverBackground)] border border-transparent hover:border-[var(--vscode-widget-border)]">
                <input
                  type="radio"
                  checked={selectedLevel === "project"}
                  onChange={() => setSelectedLevel("project")}
                  className="cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-semibold text-[var(--vscode-foreground)]">
                    📂 {t("storageProject")}
                  </div>
                  <div className="text-xs text-[var(--vscode-descriptionForeground)]">
                    {t("storageProjectDesc")}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* {t('workspaceLevel')}选择（当选择 workspace 或 project 时） */}
          {(selectedLevel === "workspace" || selectedLevel === "project") && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--vscode-foreground)]">
                {t("selectWorkspace")}
              </label>
              <select
                className="w-full p-2 border rounded bg-[var(--vscode-dropdown-background)] text-[var(--vscode-dropdown-foreground)] border-[var(--vscode-widget-border)] focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder)]"
                value={selectedWorkspace || ""}
                onChange={(e) =>
                  setSelectedWorkspace(e.target.value || undefined)
                }
              >
                <option value="">请{t("selectWorkspace")}...</option>
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name} - {ws.path}
                  </option>
                ))}
              </select>
              <div className="text-xs text-[var(--vscode-descriptionForeground)] bg-[var(--vscode-editor-inactiveSelectionBackground)] p-2 rounded">
                💡 提示：工作区 ID 存储在{" "}
                <code className="bg-[var(--vscode-editor-background)] px-1 rounded">
                  .dish/workspace-id
                </code>
                （已加入{" "}
                <code className="bg-[var(--vscode-editor-background)] px-1 rounded">
                  .gitignore
                </code>
                ）
              </div>
            </div>
          )}

          {/* 预览信息 */}
          <div className="p-3 bg-[var(--vscode-editor-inactiveSelectionBackground)] rounded text-sm border border-[var(--vscode-widget-border)]">
            <div className="font-medium mb-2 text-[var(--vscode-foreground)]">
              {t("previewInfo")}
            </div>
            <div className="space-y-1 text-[var(--vscode-descriptionForeground)]">
              <div>
                {t("promptKey")}:{" "}
                <span className="text-[var(--vscode-foreground)] font-mono">
                  {selectedPromptKey}
                </span>
              </div>
              <div>
                {t("category")}:{" "}
                <span className="text-[var(--vscode-foreground)]">
                  {selectedCategory}
                </span>
              </div>
              <div>
                {t("storageLocation")}:
                <span className="text-[var(--vscode-foreground)]">
                  {selectedLevel === "global"
                    ? ` ${t("globalLevel")}`
                    : selectedLevel === "workspace"
                      ? ` ${t("workspaceLevel")}`
                      : ` ${t("projectLevel")}`}
                </span>
              </div>
              {selectedWorkspace && (
                <div>
                  {t("workspaceName")}:
                  <span className="text-[var(--vscode-foreground)]">
                    {workspaces.find((w) => w.id === selectedWorkspace)?.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 按钮区域 */}
        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-[var(--vscode-button-secondary-background)] text-[var(--vscode-button-secondary-foreground)] hover:bg-[var(--vscode-button-secondary-hover-background)] border border-[var(--vscode-button-border)]"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleConfirm}
            disabled={
              (selectedLevel === "workspace" || selectedLevel === "project") &&
              !selectedWorkspace
            }
            className={`px-4 py-2 rounded border ${
              (selectedLevel === "workspace" || selectedLevel === "project") &&
              !selectedWorkspace
                ? "bg-[var(--vscode-button-background)] opacity-50 cursor-not-allowed text-[var(--vscode-button-foreground)] border-[var(--vscode-button-border)]"
                : "bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hover-background)] border-[var(--vscode-button-border)]"
            }`}
          >
            {t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
};
