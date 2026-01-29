import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Circle } from "lucide-react";
import {
  PromptCategory,
  PromptDetail,
  CATEGORY_DISPLAY_NAMES,
  PromptVariable,
} from "@shared/types/prompts";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getSubCategoryFromKey } from "@/utils/prompt-helpers";

interface PromptEditorProps {
  selectedKey: string | null;
  prompts: { [key: string]: PromptDetail };
  currentContent: string;
  activePromptsByCategory: Record<PromptCategory, string>;
  activePromptsBySubCategory: Record<PromptCategory, Record<string, string>>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  availableVariables: PromptVariable[];
  onContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onInsertVariable: (variableName: string) => void;
  onSave: () => void;
  onReset: () => void;
  onSetActive: () => void;
  getCategoryFromKey: (key: string) => PromptCategory;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
  selectedKey,
  prompts,
  currentContent,
  activePromptsByCategory,
  activePromptsBySubCategory,
  textareaRef,
  availableVariables,
  onContentChange,
  onInsertVariable,
  onSave,
  onReset,
  onSetActive,
  getCategoryFromKey,
}) => {
  const { t } = useTranslation("prompts-page");

  if (!selectedKey) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--vscode-editor-inactiveSelectionBackground)] rounded-md border border-[var(--vscode-widget-border)] text-[var(--vscode-descriptionForeground)]">
        {t("noPromptSelected")}
      </div>
    );
  }

  const category = getCategoryFromKey(selectedKey);
  // 检查活跃状态（支持子分类级别）
  const subCategory = getSubCategoryFromKey(selectedKey);
  let isActive = false;
  if (subCategory) {
    isActive =
      activePromptsBySubCategory[category]?.[subCategory] === selectedKey;
  } else {
    isActive = activePromptsByCategory[category] === selectedKey;
  }
  const detail = prompts[selectedKey];

  return (
    <div className="flex flex-col gap-4 min-h-0 flex-1 overflow-y-auto pr-2 custom-scrollbar">
      {/* 操作状态栏 */}
      <div className="flex justify-between items-center flex-shrink-0">
        <div className="text-sm text-[var(--vscode-descriptionForeground)]">
          {isActive ? (
            <span className="flex items-center gap-1 text-green-500 font-bold">
              <CheckCircle2 className="w-4 h-4" /> {t("active")} (
              {CATEGORY_DISPLAY_NAMES[category]})
            </span>
          ) : (
            <Button variant="link" onClick={onSetActive} className="p-0 h-auto">
              <Circle className="w-4 h-4 mr-1" /> {t("setActive")}
            </Button>
          )}
        </div>
      </div>

      {/* 系统生成提示词提示 */}
      {detail?.isSystemGenerated && (
        <div className="p-3 bg-[var(--vscode-editor-inactiveSelectionBackground)] border border-[var(--vscode-inputValidation-infoBackground)] rounded-md text-sm text-[var(--vscode-descriptionForeground)] flex items-start gap-2">
          <span className="text-lg">🔒</span>
          <span>{t("systemPromptNotice")}</span>
        </div>
      )}

      {/* 文本编辑器 */}
      <div className="flex-grow min-h-[400px] flex flex-col">
        <textarea
          ref={textareaRef}
          className="w-full h-full p-4 border-2 rounded-lg bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border-[var(--vscode-input-border)] font-mono text-base leading-relaxed focus:outline-none focus:border-[var(--vscode-focusBorder)] focus:ring-4 focus:ring-[var(--vscode-focusBorder)]/20 resize-none shadow-sm"
          value={currentContent}
          onChange={onContentChange}
          readOnly={detail?.source === "project" || detail?.isSystemGenerated}
          placeholder="输入提示词内容..."
          rows={18}
        />
      </div>

      {/* 可用变量 */}
      {availableVariables.length > 0 && (
        <div className="p-2 bg-[var(--vscode-editor-inactiveSelectionBackground)] rounded-md border border-[var(--vscode-widget-border)] flex-shrink-0">
          <div className="text-xs font-medium mb-1 text-[var(--vscode-foreground)]">
            可用变量：
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableVariables.map((v) => (
              <Tooltip key={v.name}>
                <TooltipTrigger asChild>
                  <span
                    className="px-2 py-1 text-xs bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)] rounded cursor-pointer hover:bg-[var(--vscode-button-hoverBackground)] hover:text-[var(--vscode-button-foreground)] hover:border-[var(--vscode-button-hoverBackground)] transition-all duration-200 border border-[var(--vscode-widget-border)]"
                    onClick={() => onInsertVariable(v.name)}
                  >
                    {`{{${v.name}}}`}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="max-w-[250px]">
                    <div className="font-semibold mb-1">{v.name}</div>
                    <div className="text-xs opacity-80">{v.description}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-end items-center space-x-2 flex-shrink-0">
        <Button
          onClick={onSave}
          disabled={detail?.source === "project" || detail?.isSystemGenerated}
        >
          {t("save")}
        </Button>
        {selectedKey && detail && !detail.isNew && detail.isCustomized && (
          <Button
            variant="secondary"
            onClick={onReset}
            disabled={detail?.source === "project" || detail?.isSystemGenerated}
          >
            {t("reset")}
          </Button>
        )}
      </div>
    </div>
  );
};
