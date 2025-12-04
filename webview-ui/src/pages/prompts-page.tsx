import { CreatePromptModal } from "@/components/prompts/create-prompt-modal";
import { VariablePicker } from "@/components/prompts/variable-picker";
import {
  CATEGORY_DISPLAY_NAMES,
  PROMPT_CATEGORIES,
  PROMPT_DISPLAY_NAMES,
  PROMPT_VARIABLES,
  PromptCategory,
  PromptDetail,
  PromptKey,
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
  const [saveTarget, setSaveTarget] = useState<"workspace" | "global">(
    "workspace",
  );
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

  const fetchPrompts = useCallback(() => {
    postMessage(UIRequest.PromptGetAll);
    // Also fetch active prompt key - we might need a new message type or piggyback
    // For now, let's assume we can get it via a separate message or part of GetAllPrompts payload if we modified backend
    // Since we didn't modify GetAllPrompts payload structure in backend yet to include active key,
    // we should probably add a way to get it.
    // Actually, let's add a new message type "GetActivePromptKey" in backend or just use "loadFeaturesSettings"
    // since we added it to features settings.
    postMessage(UIRequest.FeaturesLoadSettings);
  }, []);

  const handleSelectChange = useCallback(
    (key: string) => {
      const selectedPrompt = prompts[key];
      if (!selectedPrompt) return;

      setSelectedKey(key);
      setCurrentContent(selectedPrompt.content);
      if (
        selectedPrompt.source !== "default" &&
        selectedPrompt.source !== "project"
      ) {
        setSaveTarget(selectedPrompt.source as "workspace" | "global");
      } else {
        setSaveTarget("workspace"); // Default to workspace if not customized
      }
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
                setSaveTarget(
                  firstPrompt.source !== "default" &&
                    firstPrompt.source !== "project"
                    ? (firstPrompt.source as "workspace" | "global")
                    : "workspace",
                );
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
        const settings = message.data as any;
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
      target: saveTarget,
    });
  };

  const handleReset = () => {
    if (!selectedKey) return;
    postMessage(UIRequest.PromptReset, {
      key: selectedKey,
      target: saveTarget,
    });
  };

  const handleResetAll = () => {
    postMessage(UIRequest.PromptResetAll, {
      target: saveTarget,
    });
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
        <button
          onClick={handleResetAll}
          className="font-bold py-1 px-3 rounded text-[var(--vscode-button-foreground)] bg-[var(--vscode-button-background)] hover:bg-[var(--vscode-button-hoverBackground)]"
        >
          {t("resetAll")}
        </button>
      </div>

      <div className="flex flex-grow overflow-hidden p-4 gap-4">
        {/* Left Sidebar for prompt list */}
        <div className="w-1/3 flex flex-col gap-4">
          <button
            onClick={handleCreateNew}
            className="w-full font-bold py-2 px-4 rounded text-[var(--vscode-button-foreground)] bg-[var(--vscode-button-background)] hover:bg-[var(--vscode-button-hoverBackground)]"
          >
            {t("createNew")}
          </button>
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRename(key);
                            }}
                            className="p-1 text-xs hover:text-[var(--vscode-foreground)]"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(key);
                            }}
                            className="p-1 text-xs hover:text-[var(--vscode-foreground)]"
                          >
                            🗑️
                          </button>
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
                    <button
                      onClick={handleSetActive}
                      className="flex items-center gap-1 text-[var(--vscode-textLink-foreground)] hover:underline"
                    >
                      <Circle className="w-4 h-4" /> Set as Active
                    </button>
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
              <VariablePicker
                variables={
                  selectedKey
                    ? PROMPT_VARIABLES[selectedKey as PromptKey] ||
                      PROMPT_VARIABLES[PromptKey.GenerateCommitSystem]
                    : []
                }
                onInsert={handleInsertVariable}
              />
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <span>{t("saveTo")}:</span>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="saveTarget"
                      value="workspace"
                      checked={saveTarget === "workspace"}
                      onChange={() => setSaveTarget("workspace")}
                      className="h-4 w-4 accent-[var(--vscode-button-background)]"
                      disabled={
                        prompts[selectedKey]?.source === "project" ||
                        prompts[selectedKey]?.isSystemGenerated
                      }
                    />
                    <span>{t("workspace")}</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="saveTarget"
                      value="global"
                      checked={saveTarget === "global"}
                      onChange={() => setSaveTarget("global")}
                      className="h-4 w-4 accent-[var(--vscode-button-background)]"
                      disabled={
                        prompts[selectedKey]?.source === "project" ||
                        prompts[selectedKey]?.isSystemGenerated
                      }
                    />
                    <span>{t("global")}</span>
                  </label>
                </div>

                <div className="space-x-2">
                  <button
                    onClick={handleSave}
                    className="font-bold py-1 px-3 rounded text-[var(--vscode-button-foreground)] bg-[var(--vscode-button-background)] hover:bg-[var(--vscode-button-hoverBackground)]"
                    disabled={
                      prompts[selectedKey]?.source === "project" ||
                      prompts[selectedKey]?.isSystemGenerated
                    }
                  >
                    {t("save")}
                  </button>
                  {selectedKey &&
                    prompts[selectedKey] &&
                    !prompts[selectedKey].isNew &&
                    prompts[selectedKey].isCustomized && (
                      <button
                        onClick={handleReset}
                        className="font-bold py-1 px-3 rounded text-[var(--vscode-button-secondaryForeground)] bg-[var(--vscode-button-secondaryBackground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)]"
                        disabled={
                          prompts[selectedKey]?.source === "project" ||
                          prompts[selectedKey]?.isSystemGenerated
                        }
                      >
                        {t("reset")}
                      </button>
                    )}
                </div>
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
