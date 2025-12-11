import { CreatePromptModal } from "@/components/prompts/create-prompt-modal";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_DISPLAY_NAMES,
  CATEGORY_VARIABLES,
  PROMPT_CATEGORIES,
  PROMPT_DISPLAY_NAMES,
  PROMPT_VARIABLES,
  PromptCategory,
  PromptDetail,
  PromptKey,
  PromptVariable,
} from "@/types/prompts";
import { postMessage } from "@/utils/vscode";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import { CheckCircle2, Circle } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface Prompts {
  [key: string]: PromptDetail;
}

export const PromptsPage: React.FC = () => {
  const { t } = useTranslation("prompts-page");
  const [prompts, setPrompts] = useState<Prompts>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [currentContent, setCurrentContent] = useState<string>("");
  const [activePromptKey, setActivePromptKey] =
    useState<string>("generate-commit");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsertVariable = (variableName: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const variableText = `{{${variableName}}}`;
      const newText =
        text.substring(0, start) + variableText + text.substring(end);

      setCurrentContent(newText);

      // Restore cursor position after insertion
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + variableText.length,
          start + variableText.length,
        );
      }, 0);
    } else {
      setCurrentContent((prev) => prev + `{{${variableName}}}`);
    }
  };

  const getAvailableVariables = useCallback(
    (key: string | null): PromptVariable[] => {
      if (!key) return [];

      // First try to get variables specific to this prompt key
      const promptVars = PROMPT_VARIABLES[key as PromptKey];
      if (promptVars) return promptVars;

      // Fall back to category-level variables
      const category = PROMPT_CATEGORIES[key as PromptKey];
      if (category) return CATEGORY_VARIABLES[category] || [];

      // For custom prompts, try to infer category from the prompt detail
      const promptDetail = prompts[key];
      if (promptDetail?.category) {
        return (
          CATEGORY_VARIABLES[promptDetail.category as PromptCategory] || []
        );
      }

      return [];
    },
    [prompts],
  );

  const fetchPrompts = useCallback(() => {
    postMessage(UIRequest.PromptGetAll);
    postMessage(UIRequest.FeaturesLoadSettings);
  }, []);

  const handleSelectChange = useCallback(
    (key: string) => {
      const selectedPrompt = prompts[key];
      if (!selectedPrompt) return;

      setSelectedKey(key);
      setCurrentContent(selectedPrompt.content);
    },
    [prompts],
  );

  useEffect(() => {
    fetchPrompts();

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === ExtensionResponse.PromptAllLoaded) {
        const receivedPrompts: Prompts = message.payload;
        setPrompts(receivedPrompts);

        // If there's no selection yet, select the first prompt
        if (Object.keys(receivedPrompts).length > 0) {
          setSelectedKey((prevSelectedKey) => {
            if (!prevSelectedKey) {
              const firstKey = Object.keys(receivedPrompts)[0];
              const firstPrompt = receivedPrompts[firstKey];
              if (firstPrompt) {
                setCurrentContent(firstPrompt.content);
                return firstKey;
              }
            }
            return prevSelectedKey;
          });
        }
      } else if (
        message.command === ExtensionResponse.FeaturesSettingsLoaded &&
        message.data
      ) {
        // Assuming the backend sends the full settings object including our new key
        // We need to make sure the backend actually sends this.
        // The current backend implementation of "loadFeaturesSettings" sends what's in the config.
        // We added "dish-ai-commit.features.commitMessage.activePromptKey" to package.json
        // So it should be available in the settings object if we update the backend handler.
        const settings = message.data as { activePromptKey?: string };
        if (settings.activePromptKey) {
          setActivePromptKey(settings.activePromptKey);
        }
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [fetchPrompts]);

  const handleSave = () => {
    if (!selectedKey) return;
    postMessage(UIRequest.PromptUpdate, {
      key: selectedKey,
      content: currentContent,
    });
  };

  const handleReset = () => {
    if (!selectedKey) return;
    postMessage(UIRequest.PromptReset, {
      key: selectedKey,
    });
  };

  const handleResetAll = () => {
    postMessage(UIRequest.PromptResetAll);
  };

  const handleCreateNew = () => {
    setIsModalOpen(true);
  };

  const handleDelete = (key: string) => {
    if (window.confirm(t("deleteConfirm", { key }))) {
      postMessage(UIRequest.PromptDelete, {
        key,
        target: prompts[key].source,
      });
    }
  };

  const handleRename = (oldKey: string) => {
    const newKey = window.prompt(t("renamePrompt", { oldKey }), oldKey);
    if (newKey && newKey !== oldKey) {
      postMessage(UIRequest.PromptRename, {
        oldKey,
        newKey,
        target: prompts[oldKey].source,
      });
    }
  };

  const handleSetActive = () => {
    if (!selectedKey) return;
    // We need a new message type for this or reuse saveFeaturesSettings
    // Let's reuse saveFeaturesSettings but we need to be careful not to overwrite other settings
    // Or we can create a specific message.
    // For simplicity, let's assume we can send a partial update or a specific command.
    // Let's use a specific command "setActivePrompt"
    postMessage(UIRequest.FeaturesSetActivePrompt, { key: selectedKey });
    setActivePromptKey(selectedKey);
  };

  return (
    <div className="h-full flex flex-col text-[var(--vscode-foreground)] bg-[var(--vscode-editor-background)]">
      <CreatePromptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      <div className="flex justify-between items-center p-4 border-b border-[var(--vscode-panel-border)]">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <Button onClick={handleResetAll}>{t("resetAll")}</Button>
      </div>

      <div className="flex flex-grow overflow-hidden p-4 gap-4">
        {/* Left Sidebar for prompt list */}
        <div className="w-1/3 flex flex-col gap-4">
          <Button onClick={handleCreateNew} className="w-full">
            {t("createNew")}
          </Button>
          <div className="flex-grow overflow-y-auto border border-[var(--vscode-panel-border)] rounded-md">
            {Object.values(PromptCategory).map((category) => {
              const categoryPrompts = Object.entries(prompts).filter(
                ([key]) => {
                  const mappedCategory = PROMPT_CATEGORIES[key as PromptKey];
                  if (category === PromptCategory.Custom) {
                    return !mappedCategory;
                  }
                  return mappedCategory === category;
                },
              );

              if (categoryPrompts.length === 0) return null;

              return (
                <div key={category}>
                  <div className="px-3 py-2 text-xs font-bold uppercase text-[var(--vscode-descriptionForeground)] bg-[var(--vscode-sideBar-background)] border-b border-[var(--vscode-panel-border)] sticky top-0">
                    {CATEGORY_DISPLAY_NAMES[category]}
                  </div>
                  {categoryPrompts.map(([key, detail]) => (
                    <div
                      key={key}
                      onClick={() => handleSelectChange(key)}
                      className={`p-3 cursor-pointer flex justify-between items-center border-b border-[var(--vscode-panel-border)]
                        hover:bg-[var(--vscode-list-hoverBackground)]
                        ${
                          selectedKey === key
                            ? "bg-[var(--vscode-list-activeSelectionBackground)]"
                            : ""
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        {activePromptKey === key && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                        <div>
                          <div className="font-semibold">
                            {PROMPT_DISPLAY_NAMES[key as PromptKey] || key}
                          </div>
                          {detail.isCustomized && (
                            <div className="text-xs text-[var(--vscode-descriptionForeground)]">
                              {detail.isNew ? t("custom") : t("modified")} -
                              {detail.source === "workspace"
                                ? t("workspace")
                                : detail.source === "project"
                                  ? "Project"
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
                              handleRename(key);
                            }}
                            className="h-6 w-6"
                          >
                            ✏️
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(key);
                            }}
                            className="h-6 w-6 text-red-500"
                          >
                            🗑️
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side for editing */}
        <div className="w-2/3 flex flex-col gap-4">
          {selectedKey ? (
            <div className="h-full flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-[var(--vscode-descriptionForeground)]">
                  {activePromptKey === selectedKey ? (
                    <span className="flex items-center gap-1 text-green-500 font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Active Prompt
                    </span>
                  ) : (
                    <Button
                      variant="link"
                      onClick={handleSetActive}
                      className="p-0 h-auto"
                    >
                      <Circle className="w-4 h-4 mr-1" /> Set as Active
                    </Button>
                  )}
                </div>
              </div>

              {/* System Generated Prompt Notice */}
              {prompts[selectedKey]?.isSystemGenerated && (
                <div className="p-3 bg-[var(--vscode-editor-inactiveSelectionBackground)] border border-[var(--vscode-inputValidation-infoBackground)] rounded-md text-sm text-[var(--vscode-descriptionForeground)]">
                  🔒
                  这是系统内置提示词，使用复杂逻辑动态生成。如需自定义，请创建新的提示词并设为
                  Active。
                </div>
              )}

              <textarea
                ref={textareaRef}
                className="w-full flex-grow p-2 border rounded-md bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border-[var(--vscode-input-border)] font-mono"
                value={currentContent}
                onChange={(e) => setCurrentContent(e.target.value)}
                readOnly={
                  prompts[selectedKey]?.source === "project" ||
                  prompts[selectedKey]?.isSystemGenerated
                }
              />
              {getAvailableVariables(selectedKey).length > 0 && (
                <div className="p-3 bg-[var(--vscode-editor-inactiveSelectionBackground)] rounded-md">
                  <div className="text-sm font-medium mb-2">可用变量：</div>
                  <div className="flex flex-wrap gap-2">
                    {getAvailableVariables(selectedKey).map((v) => (
                      <span
                        key={v.name}
                        className="px-2 py-1 text-xs bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)] rounded cursor-pointer hover:opacity-80"
                        onClick={() => handleInsertVariable(v.name)}
                        title={v.description}
                      >
                        {`{{${v.name}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end items-center space-x-2">
                <Button
                  onClick={handleSave}
                  disabled={
                    prompts[selectedKey]?.source === "project" ||
                    prompts[selectedKey]?.isSystemGenerated
                  }
                >
                  {t("save")}
                </Button>
                {selectedKey &&
                  prompts[selectedKey] &&
                  !prompts[selectedKey].isNew &&
                  prompts[selectedKey].isCustomized && (
                    <Button
                      variant="secondary"
                      onClick={handleReset}
                      disabled={
                        prompts[selectedKey]?.source === "project" ||
                        prompts[selectedKey]?.isSystemGenerated
                      }
                    >
                      {t("reset")}
                    </Button>
                  )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-[var(--vscode-descriptionForeground)]">
              {t("noPromptSelected")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
