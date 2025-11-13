import { MessageType } from "@/types/messages";
import { PROMPT_DISPLAY_NAMES, PromptDetail, PromptKey } from "@/types/prompts";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CreatePromptModal } from "../components/prompts/create-prompt-modal";
import { postMessage } from "../utils/vscode";

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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPrompts = useCallback(() => {
    postMessage(MessageType.GetAllPrompts);
  }, []);

  const handleSelectChange = useCallback(
    (key: string) => {
      const selectedPrompt = prompts[key];
      if (!selectedPrompt) return;

      setSelectedKey(key);
      setCurrentContent(selectedPrompt.content);
      if (selectedPrompt.source !== "default") {
        setSaveTarget(selectedPrompt.source);
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
      if (message.command === MessageType.AllPrompts) {
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
                  firstPrompt.source !== "default"
                    ? firstPrompt.source
                    : "workspace",
                );
                return firstKey;
              }
            }
            return prevSelectedKey;
          });
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
    postMessage(MessageType.UpdatePrompt, {
      key: selectedKey,
      content: currentContent,
      target: saveTarget,
    });
  };

  const handleReset = () => {
    if (!selectedKey) return;
    postMessage(MessageType.ResetPrompt, {
      key: selectedKey,
      target: saveTarget,
    });
  };

  const handleResetAll = () => {
    postMessage(MessageType.ResetAllPrompts, {
      target: saveTarget,
    });
  };

  const handleCreateNew = () => {
    setIsModalOpen(true);
  };

  const handleDelete = (key: string) => {
    if (window.confirm(t("deleteConfirm", { key }))) {
      postMessage(MessageType.DeletePrompt, {
        key,
        target: prompts[key].source,
      });
    }
  };

  const handleRename = (oldKey: string) => {
    const newKey = window.prompt(t("renamePrompt", { oldKey }), oldKey);
    if (newKey && newKey !== oldKey) {
      postMessage(MessageType.RenamePrompt, {
        oldKey,
        newKey,
        target: prompts[oldKey].source,
      });
    }
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
            {Object.entries(prompts).map(([key, detail]) => (
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
                <div>
                  <div className="font-semibold">
                    {PROMPT_DISPLAY_NAMES[key as PromptKey] || key}
                  </div>
                  {detail.isCustomized && (
                    <div className="text-xs text-[var(--vscode-descriptionForeground)]">
                      {detail.isNew ? t("custom") : t("modified")} -
                      {detail.source === "workspace"
                        ? t("workspace")
                        : t("global")}
                    </div>
                  )}
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
        </div>

        {/* Right side for editing */}
        <div className="w-2/3 flex flex-col gap-4">
          {selectedKey ? (
            <div className="h-full flex flex-col gap-4">
              <textarea
                className="w-full flex-grow p-2 border rounded-md bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border-[var(--vscode-input-border)]"
                value={currentContent}
                onChange={(e) => setCurrentContent(e.target.value)}
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
                    />
                    <span>{t("global")}</span>
                  </label>
                </div>

                <div className="space-x-2">
                  <button
                    onClick={handleSave}
                    className="font-bold py-1 px-3 rounded text-[var(--vscode-button-foreground)] bg-[var(--vscode-button-background)] hover:bg-[var(--vscode-button-hoverBackground)]"
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
