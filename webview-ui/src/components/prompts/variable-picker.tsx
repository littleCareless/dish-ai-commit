import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { PromptVariable } from "../../../../src/types/prompts";

interface VariablePickerProps {
  variables: PromptVariable[];
  onInsert: (variableName: string) => void;
}

export const VariablePicker: React.FC<VariablePickerProps> = ({
  variables,
  onInsert,
}) => {
  const { t } = useTranslation("prompts-page");
  const [isExpanded, setIsExpanded] = useState(false);

  if (!variables || variables.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col border rounded-md border-[var(--vscode-panel-border)] bg-[var(--vscode-sideBar-background)]">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-[var(--vscode-list-hoverBackground)] transition-colors"
      >
        <h3 className="font-bold text-sm uppercase text-[var(--vscode-descriptionForeground)]">
          {t("availableVariables")} ({variables.length})
        </h3>
        <span className="text-[var(--vscode-descriptionForeground)] text-sm">
          {isExpanded ? "▼" : "▶"}
        </span>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-3 px-4 pb-4">
          <div className="flex flex-col gap-2">
            {variables.map((variable) => {
              // 尝试从翻译文件获取描述，如果不存在则使用原始描述
              const translatedDescription = t(`variables.${variable.name}`, {
                defaultValue: variable.description,
              });

              return (
                <button
                  key={variable.name}
                  onClick={() => onInsert(variable.name)}
                  className="flex flex-col items-start gap-1 px-3 py-2 text-left rounded border border-[var(--vscode-button-border)] bg-[var(--vscode-button-secondaryBackground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] transition-colors group"
                >
                  <div className="flex items-center gap-2 w-full">
                    <code className="text-xs font-mono text-[var(--vscode-textLink-foreground)] group-hover:text-[var(--vscode-textLink-activeForeground)]">
                      {`{{${variable.name}}}`}
                    </code>
                  </div>
                  <div className="text-xs text-[var(--vscode-descriptionForeground)] leading-relaxed">
                    {translatedDescription}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="text-xs text-[var(--vscode-descriptionForeground)] mt-1">
            {t("variableHint")}
          </div>
        </div>
      )}
    </div>
  );
};
