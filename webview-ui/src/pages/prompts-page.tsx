import { CreatePromptModal } from "@/components/prompts/create-prompt-modal";
import { StorageLevelModal } from "@/components/prompts/storage-level-modal";
import { Button } from "@/components/ui/button";
import { postMessage } from "@/utils/vscode";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import {
  ActivePromptSource,
  CATEGORY_DISPLAY_NAMES,
  CATEGORY_VARIABLES,
  PROMPT_CATEGORIES,
  PROMPT_DISPLAY_NAMES,
  PROMPT_VARIABLES,
  PromptCategory,
  PromptDetail,
  PromptKey,
  PromptVariable,
  StorageLevel,
  WorkspaceInfo,
} from "@shared/types/prompts";
import { CheckCircle2, Circle, Folder, FolderGit, Globe } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface Prompts {
  [key: string]: PromptDetail;
}

// Utility function to determine category from prompt key
const getCategoryFromKey = (key: string, prompts: Prompts): PromptCategory => {
  // First try standard mapping
  const category = PROMPT_CATEGORIES[key as PromptKey];
  if (category) return category;

  // Then try custom prompt category
  const promptDetail = prompts[key];
  if (promptDetail?.category) {
    return promptDetail.category;
  }

  // Fallback for legacy keys
  const legacyMap: Record<string, PromptCategory> = {
    "generate-commit": PromptCategory.Commit,
    "code-review": PromptCategory.CodeReview,
    "pr-summary": PromptCategory.PR,
    "weekly-report": PromptCategory.Report,
    "branch-name": PromptCategory.Git,
  };

  return legacyMap[key] || PromptCategory.Custom;
};

// Default system prompts for each category
const DEFAULT_SYSTEM_PROMPTS: Record<PromptCategory, PromptKey> = {
  [PromptCategory.Commit]: PromptKey.GenerateCommitSystem,
  [PromptCategory.CodeReview]: PromptKey.CodeReviewSystem,
  [PromptCategory.PR]: PromptKey.PRSummarySystem,
  [PromptCategory.Report]: PromptKey.WeeklyReport,
  [PromptCategory.Git]: PromptKey.BranchNameSystem,
  [PromptCategory.Custom]: PromptKey.GenerateCommitSimple, // Fallback for custom
};

export const PromptsPage: React.FC = () => {
  const { t } = useTranslation("prompts-page");
  const [prompts, setPrompts] = useState<Prompts>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [currentContent, setCurrentContent] = useState<string>("");
  const [activePromptsByCategory, setActivePromptsByCategory] = useState<
    Record<PromptCategory, string>
  >({} as Record<PromptCategory, string>);

  // 新增状态：工作区和存储位置信息
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [currentWorkspace, setCurrentWorkspace] =
    useState<WorkspaceInfo | null>(null);
  const [activeSources, setActiveSources] = useState<
    Record<PromptCategory, ActivePromptSource>
  >({} as Record<PromptCategory, ActivePromptSource>);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 使用 ref 保存最新状态，避免闭包问题
  const promptsRef = useRef<Prompts>({});
  const selectedKeyRef = useRef<string | null>(null);
  const activePromptsByCategoryRef = useRef<Record<PromptCategory, string>>(
    {} as Record<PromptCategory, string>,
  );
  const currentWorkspaceRef = useRef<WorkspaceInfo | null>(null);

  // 使用 useEffect 同步 ref 和 state，避免 ESLint 错误
  useEffect(() => {
    promptsRef.current = prompts;
  }, [prompts]);

  useEffect(() => {
    selectedKeyRef.current = selectedKey;
  }, [selectedKey]);

  useEffect(() => {
    activePromptsByCategoryRef.current = activePromptsByCategory;
  }, [activePromptsByCategory]);

  useEffect(() => {
    currentWorkspaceRef.current = currentWorkspace;
  }, [currentWorkspace]);

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
    postMessage(UIRequest.FeaturesGetWorkspaceInfo);
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
      console.log("[Message Received]", message.command, message); // 调试日志
      if (message.command === ExtensionResponse.PromptAllLoaded) {
        const receivedPrompts: Prompts = message.payload;
        console.log(
          "[PromptAllLoaded] Received prompts:",
          Object.keys(receivedPrompts),
        );
        setPrompts(receivedPrompts);

        // 当 prompts 加载完成后，需要同步选中状态和内容
        if (Object.keys(receivedPrompts).length > 0) {
          // 使用 ref 获取最新状态，避免闭包问题
          const currentSelectedKey = selectedKeyRef.current;
          const currentActivePrompts = activePromptsByCategoryRef.current;

          console.log("[PromptAllLoaded] Current state:", {
            currentSelectedKey,
            currentActivePrompts,
          });

          // 检查当前选中的 key 是否存在于新加载的 prompts 中
          if (currentSelectedKey && receivedPrompts[currentSelectedKey]) {
            // 当前选中的提示词存在，更新其内容
            console.log(
              "[PromptAllLoaded] Updating content for existing key:",
              currentSelectedKey,
            );
            setCurrentContent(receivedPrompts[currentSelectedKey].content);
          } else if (!currentSelectedKey) {
            // 没有选中任何提示词，选择活跃的或第一个
            const hasActivePrompts =
              Object.keys(currentActivePrompts).length > 0;
            if (hasActivePrompts) {
              // 优先选中当前分类的活跃提示词
              const commitActive = currentActivePrompts[PromptCategory.Commit];
              console.log(
                "[PromptAllLoaded] No selection, using active prompt:",
                commitActive,
              );
              if (commitActive && receivedPrompts[commitActive]) {
                setSelectedKey(commitActive);
                setCurrentContent(receivedPrompts[commitActive].content);
              }
            } else {
              // 回退到选择第一个
              const firstKey = Object.keys(receivedPrompts)[0];
              const firstPrompt = receivedPrompts[firstKey];
              console.log(
                "[PromptAllLoaded] No selection, using first prompt:",
                firstKey,
              );
              if (firstPrompt) {
                setSelectedKey(firstKey);
                setCurrentContent(firstPrompt.content);
              }
            }
          } else {
            console.log(
              "[PromptAllLoaded] Key exists but no content update needed",
            );
          }
        }
      } else if (
        message.command === ExtensionResponse.FeaturesSettingsLoaded &&
        (message.data || message.settings)
      ) {
        // Support both 'data' and 'settings' fields for compatibility
        const settings = (message.data || message.settings) as {
          activePromptKey?: string;
          activePrompts?: Record<PromptCategory, string>;
          currentActiveSource?: ActivePromptSource;
        };

        console.log("[FeaturesSettingsLoaded] Received settings:", {
          activePrompts: settings.activePrompts,
          activePromptsKeys: settings.activePrompts
            ? Object.keys(settings.activePrompts)
            : "undefined",
          currentActiveSource: settings.currentActiveSource,
        });

        // New logic: use activePrompts by category
        if (
          settings.activePrompts &&
          Object.keys(settings.activePrompts).length > 0
        ) {
          setActivePromptsByCategory(settings.activePrompts);

          // 同步选中的提示词：如果当前没有选中，或者选中的不是活跃的，自动选中活跃的
          if (settings.currentActiveSource?.category) {
            const activeKey =
              settings.activePrompts[settings.currentActiveSource.category];
            console.log(
              "[FeaturesSettingsLoaded] Active key:",
              activeKey,
              "Category:",
              settings.currentActiveSource.category,
            );
            if (activeKey) {
              // 使用 ref 获取最新 prompts，避免闭包问题
              const currentPrompts = promptsRef.current;
              console.log(
                "[FeaturesSettingsLoaded] Current prompts keys:",
                Object.keys(currentPrompts),
              );
              // 优先使用 prompts 中的内容，如果 prompts 还没加载或没有该 key，则只更新选中状态
              if (currentPrompts[activeKey]) {
                console.log(
                  "[FeaturesSettingsLoaded] Found content, updating both key and content",
                );
                setSelectedKey(activeKey);
                setCurrentContent(currentPrompts[activeKey].content);
              } else {
                console.log(
                  "[FeaturesSettingsLoaded] No content in prompts, only updating key",
                );
                // prompts 还未加载完成，只更新选中状态，等待 prompts 加载后会自动同步
                setSelectedKey(activeKey);
              }
            }
          }
        }
        // Legacy fallback: convert single activePromptKey to category-based format
        else if (settings.activePromptKey) {
          const category = getCategoryFromKey(settings.activePromptKey, {});
          setActivePromptsByCategory({
            [category]: settings.activePromptKey,
          } as Record<PromptCategory, string>);

          // 同步选中状态
          const currentPrompts = promptsRef.current;
          if (currentPrompts[settings.activePromptKey]) {
            setSelectedKey(settings.activePromptKey);
            setCurrentContent(currentPrompts[settings.activePromptKey].content);
          }
        }
        // No stored data: apply default system prompts for all categories
        else {
          setActivePromptsByCategory(DEFAULT_SYSTEM_PROMPTS);
        }

        // 更新活跃提示词源信息
        if (
          settings.currentActiveSource &&
          settings.currentActiveSource.category
        ) {
          const currentSource = settings.currentActiveSource;
          setActiveSources((prev) => ({
            ...prev,
            [currentSource.category!]: currentSource,
          }));
        }
      } else if (message.command === ExtensionResponse.FeaturesWorkspaceInfo) {
        // 更新工作区信息
        setWorkspaces(message.data.allWorkspaces || []);
        setCurrentWorkspace(message.data.currentWorkspace);
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
    console.log("[handleSetActive] Called, selectedKey:", selectedKey);
    if (!selectedKey) return;

    // 打开模态框让用户选择存储位置
    setIsStorageModalOpen(true);
  };

  // 处理存储位置选择
  const handleStorageSelect = (level: StorageLevel, workspaceId?: string) => {
    console.log("[handleStorageSelect] Called with:", level, workspaceId);
    const currentSelectedKey = selectedKeyRef.current;
    console.log(
      "[handleStorageSelect] currentSelectedKey:",
      currentSelectedKey,
    );
    if (!currentSelectedKey) {
      console.error("[handleStorageSelect] No selected key found");
      return;
    }

    const currentPrompts = promptsRef.current;
    const currentWs = currentWorkspaceRef.current;
    const category = getCategoryFromKey(currentSelectedKey, currentPrompts);

    console.log("[handleStorageSelect] Debug info:", {
      currentSelectedKey,
      currentPrompts,
      category,
      level,
      workspaceId,
      currentWs,
    });

    // 发送消息到扩展
    postMessage(UIRequest.FeaturesSetActivePrompt, {
      key: currentSelectedKey,
      category,
      storageLevel: level,
      workspaceId: workspaceId || currentWs?.id,
    });

    // 立即更新本地状态（仅对全局和工作区级）
    if (level === "global" || level === "workspace") {
      setActivePromptsByCategory((prev) => ({
        ...prev,
        [category]: currentSelectedKey,
      }));

      // 确保选中状态同步
      setSelectedKey(currentSelectedKey);
      // 优先使用 prompts 中的内容，如果 prompts 还没加载或没有该 key，则等待后端返回的消息来更新内容
      if (currentPrompts[currentSelectedKey]) {
        setCurrentContent(currentPrompts[currentSelectedKey].content);
        console.log("[handleStorageSelect] Updated content from prompts");
      } else {
        console.log(
          "[handleStorageSelect] No content in prompts, waiting for backend",
        );
      }
      // 如果 prompts 中没有该 key，content 会在后端返回消息时更新
    }

    // 更新源信息
    setActiveSources((prev) => ({
      ...prev,
      [category]: {
        source: level,
        workspaceId: workspaceId || currentWs?.id,
        category,
      },
    }));
  };

  // 渲染活跃状态指示器
  const renderActiveIndicator = (category: PromptCategory, key: string) => {
    const isActive = activePromptsByCategory[category] === key;
    if (!isActive) return null;

    const source = activeSources[category];
    if (!source) {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }

    let tooltip = "";
    let icon = <CheckCircle2 className="w-4 h-4 text-green-500" />;

    switch (source.source) {
      case "project":
        tooltip = t("projectLevel");
        icon = <Folder className="w-4 h-4 text-blue-500" />;
        break;
      case "workspace": {
        const wsName = workspaces.find(
          (w) => w.id === source.workspaceId,
        )?.name;
        tooltip = `${t("workspaceLevel")} (${wsName || source.workspaceId})`;
        icon = <FolderGit className="w-4 h-4 text-green-500" />;
        break;
      }
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

  // 渲染提示词信息面板
  const renderPromptInfo = () => {
    if (!selectedKey) return null;

    const category = getCategoryFromKey(selectedKey, prompts);
    const source = activeSources[category];
    const isActive = activePromptsByCategory[category] === selectedKey;

    return (
      <div className="p-3 bg-[var(--vscode-editor-inactiveSelectionBackground)] rounded-md text-sm mb-4 border border-[var(--vscode-widget-border)]">
        <div className="font-medium mb-2">{t("promptInfo")}</div>
        <div className="space-y-1 text-[var(--vscode-descriptionForeground)]">
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
          {source && (
            <div>
              {t("source")}:
              <span className="text-[var(--vscode-foreground)] ml-1">
                {source.source === "project" && t("projectLevel")}
                {source.source === "workspace" &&
                  `${t("workspaceLevel")} (${workspaces.find((w) => w.id === source.workspaceId)?.name || "Unknown"})`}
                {source.source === "global" && t("globalLevel")}
              </span>
            </div>
          )}
          <div>
            {t("status")}:
            <span
              className={`ml-1 font-bold ${isActive ? "text-green-500" : "text-[var(--vscode-descriptionForeground)]"}`}
            >
              {isActive ? `✓ ${t("active")}` : `○ ${t("inactive")}`}
            </span>
          </div>
          {workspaces.length > 1 && (
            <div className="text-xs mt-2 p-2 bg-[var(--vscode-editor-background)] rounded">
              {t("workspaceHintMulti", { count: workspaces.length })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col text-[var(--vscode-foreground)] bg-[var(--vscode-editor-background)]">
      <CreatePromptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      <StorageLevelModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        onSelect={handleStorageSelect}
        workspaces={workspaces}
        selectedPromptKey={selectedKey || ""}
        selectedCategory={
          selectedKey ? getCategoryFromKey(selectedKey, prompts) : ""
        }
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
                ([key, detail]) => {
                  // 优先使用 prompt detail 中的 category（自定义提示词）
                  if (detail.category) {
                    return detail.category === category;
                  }

                  // 系统提示词使用映射表
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
                  {categoryPrompts.map(([key, detail]) => {
                    // 获取显示名称：系统提示词用映射表，自定义提示词用 key + 分类标识
                    const displayName =
                      PROMPT_DISPLAY_NAMES[key as PromptKey] ||
                      `${key} (${CATEGORY_DISPLAY_NAMES[detail.category || category]})`;

                    return (
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
                          {renderActiveIndicator(category, key)}
                          <div>
                            <div className="font-semibold">{displayName}</div>
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
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side for editing */}
        <div className="w-2/3 flex flex-col gap-4">
          {selectedKey ? (
            <div className="h-full flex flex-col gap-4">
              {/* 显示提示词信息面板 */}
              {renderPromptInfo()}

              <div className="flex justify-between items-center">
                <div className="text-sm text-[var(--vscode-descriptionForeground)]">
                  {(() => {
                    const category = getCategoryFromKey(selectedKey, prompts);
                    const isActive =
                      activePromptsByCategory[category] === selectedKey;

                    return isActive ? (
                      <span className="flex items-center gap-1 text-green-500 font-bold">
                        <CheckCircle2 className="w-4 h-4" /> {t("active")} (
                        {CATEGORY_DISPLAY_NAMES[category]})
                      </span>
                    ) : (
                      <Button
                        variant="link"
                        onClick={handleSetActive}
                        className="p-0 h-auto"
                      >
                        <Circle className="w-4 h-4 mr-1" /> {t("setActive")}
                      </Button>
                    );
                  })()}
                </div>
              </div>

              {/* System Generated Prompt Notice */}
              {prompts[selectedKey]?.isSystemGenerated && (
                <div className="p-3 bg-[var(--vscode-editor-inactiveSelectionBackground)] border border-[var(--vscode-inputValidation-infoBackground)] rounded-md text-sm text-[var(--vscode-descriptionForeground)]">
                  {t("systemPromptNotice")}
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
