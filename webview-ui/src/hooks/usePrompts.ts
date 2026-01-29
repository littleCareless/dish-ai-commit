import {
  deletePrompt,
  loadAllPrompts,
  loadWorkspaceInfo,
  loadWorkspaceStates,
  renamePrompt,
  resetAllPrompts,
  resetPrompt,
  setActivePrompt,
  updatePrompt,
} from "@/services/prompts-api";
import {
  getActivePromptForDefaultSelection,
  getAvailableVariables,
  getCategoryFromKey,
} from "@/utils/prompt-helpers";
import { ExtensionResponse } from "@shared/types/messages";
import {
  ActivePromptSource,
  CommitSubCategory,
  PromptCategory,
  PromptDetail,
  StorageLevel,
  WorkspaceActiveState,
  WorkspaceInfo,
} from "@shared/types/prompts";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface Prompts {
  [key: string]: PromptDetail;
}

interface UsePromptsReturn {
  // State
  prompts: Prompts;
  selectedKey: string | null;
  currentContent: string;
  showCreateModal: boolean;
  showStorageModal: boolean;
  showDeleteModal: boolean;
  pendingDeleteKey: string | null;
  pendingSaveContent: string | null;
  activePromptsByCategory: Record<PromptCategory, string>;
  activePromptsBySubCategory: Record<PromptCategory, Record<string, string>>;
  // activeSources 支持子分类级别：按 promptKey 存储源信息
  activeSources: Record<string, ActivePromptSource | null>;
  workspaces: WorkspaceInfo[];
  selectedWorkspace: string;
  categoryFilter: PromptCategory | "all";
  guideExpanded: Record<string, boolean>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;

  // Actions
  handleSelectChange: (key: string) => void;
  handleContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleCreateNew: () => void;
  handleSave: () => void;
  handleStorageConfirm: (level: StorageLevel, workspaceId?: string) => void;
  handleReset: () => void;
  handleResetAll: () => void;
  handleRename: (key: string) => void;
  handleDelete: (key: string) => void;
  handleSetActive: () => void;
  handleInsertVariable: (variableName: string) => void;
  setShowCreateModal: (show: boolean) => void;
  setShowStorageModal: (show: boolean) => void;
  setShowDeleteModal: (show: boolean) => void;
  setCategoryFilter: (filter: PromptCategory | "all") => void;
  setGuideExpanded: (expanded: Record<string, boolean>) => void;
  setSelectedWorkspace: (workspace: string) => void;

  // Helpers
  getAvailableVariables: (
    key: string,
  ) => ReturnType<typeof getAvailableVariables>;
  getCategoryFromKey: (key: string) => PromptCategory;
}

export function usePrompts(): UsePromptsReturn {
  const { t } = useTranslation("prompts-page");

  // State
  const [prompts, setPrompts] = useState<Prompts>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [currentContent, setCurrentContent] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [pendingDeleteKey, _setPendingDeleteKey] = useState<string | null>(
    null,
  );
  const [pendingSaveContent, setPendingSaveContent] = useState<string | null>(
    null,
  );
  const [activePromptsByCategory, setActivePromptsByCategory] = useState<
    Record<PromptCategory, string>
  >({} as Record<PromptCategory, string>);
  const [activePromptsBySubCategory, setActivePromptsBySubCategory] = useState<
    Record<PromptCategory, Record<string, string>>
  >({} as Record<PromptCategory, Record<string, string>>);
  const [activeSources, setActiveSources] = useState<
    Record<string, ActivePromptSource | null>
  >({});
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<PromptCategory | "all">(
    "all",
  );
  const [guideExpanded, setGuideExpanded] = useState<Record<string, boolean>>(
    {},
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load initial data
  useEffect(() => {
    loadAllPrompts();
    loadWorkspaceStates();
    loadWorkspaceInfo();
  }, []);

  // Message handler
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const { type, data, command, payload } = event.data;
      const messageType = type || command;
      const messageData = data || payload;

      if (messageType === ExtensionResponse.PromptAllLoaded) {
        const promptsData = messageData?.prompts || messageData || {};
        setPrompts(promptsData);

        if (Object.keys(promptsData).length > 0) {
          setTimeout(() => {
            const activeKey = getActivePromptForDefaultSelection(
              promptsData,
              activePromptsByCategory,
              activePromptsBySubCategory,
            );
            if (activeKey) {
              setSelectedKey(activeKey);
              setCurrentContent(promptsData[activeKey].content);
            } else if (!selectedKey) {
              const firstKey = Object.keys(promptsData)[0];
              setSelectedKey(firstKey);
              setCurrentContent(promptsData[firstKey].content);
            } else if (selectedKey && promptsData[selectedKey]) {
              // 如果已有选中的 key，更新内容以保持同步
              setCurrentContent(promptsData[selectedKey].content);
            }
          }, 0);
        }
      } else if (messageType === ExtensionResponse.FeaturesSettingsLoaded) {
        // 处理设置加载的响应
        if (messageData?.activePrompts) {
          setActivePromptsByCategory(messageData.activePrompts);
        }
        if (messageData?.activePromptsBySubCategory) {
          setActivePromptsBySubCategory(messageData.activePromptsBySubCategory);
        }
        // 注意：这里不处理 activeSources，因为 FeaturesSettingsLoaded 不包含这个信息
      } else if (messageType === ExtensionResponse.FeaturesAllWorkspaceStates) {
        // messageData 是 WorkspaceActiveState[] 数组
        // 我们需要合并所有工作区的配置，优先使用当前工作区的配置
        const workspaceStates = messageData as WorkspaceActiveState[];
        if (Array.isArray(workspaceStates) && workspaceStates.length > 0) {
          // 使用第一个工作区的配置（通常是当前工作区）
          const firstWorkspace = workspaceStates[0];

          setActivePromptsByCategory(firstWorkspace.activePrompts || {});

          // 处理子分类级别的活跃提示词
          if (firstWorkspace.activePromptsBySubCategory) {
            setActivePromptsBySubCategory(
              firstWorkspace.activePromptsBySubCategory,
            );
          }

          // 设置活跃源信息（按 promptKey 存储，支持子分类级别）
          const sources: Record<string, ActivePromptSource | null> = {};

          // 处理分类级别的活跃提示词源信息
          if (firstWorkspace.activePrompts) {
            for (const category of Object.keys(
              firstWorkspace.activePrompts,
            ) as PromptCategory[]) {
              const promptKey = firstWorkspace.activePrompts[category];
              sources[promptKey] = {
                source: firstWorkspace.source,
                workspaceId: firstWorkspace.workspaceId,
                category,
                promptKey,
              };
            }
          }

          // 处理子分类级别的活跃提示词源信息
          if (firstWorkspace.activePromptsBySubCategory) {
            for (const category of Object.keys(
              firstWorkspace.activePromptsBySubCategory,
            ) as PromptCategory[]) {
              const subCategoryPrompts: Record<string, string> =
                firstWorkspace.activePromptsBySubCategory[category];
              for (const subCategory in subCategoryPrompts) {
                const promptKey = subCategoryPrompts[subCategory];
                sources[promptKey] = {
                  source: firstWorkspace.source,
                  workspaceId: firstWorkspace.workspaceId,
                  category,
                  promptKey,
                  subCategory: subCategory as CommitSubCategory,
                };
              }
            }
          }

          setActiveSources(sources);
        }
      } else if (messageType === ExtensionResponse.FeaturesWorkspaceInfo) {
        setWorkspaces(messageData?.workspaces || []);
        if (messageData?.workspaces && messageData.workspaces.length > 0) {
          setSelectedWorkspace(messageData.workspaces[0].id);
        }
      } else if (
        messageType === ExtensionResponse.FeaturesActivePromptChanged
      ) {
        // 处理活跃提示词设置变更的响应
        if (messageData?.activePrompts) {
          setActivePromptsByCategory(messageData.activePrompts);
        }
        // 处理子分类级别的活跃提示词
        if (messageData?.activePromptsBySubCategory) {
          setActivePromptsBySubCategory(messageData.activePromptsBySubCategory);
        }
        if (messageData?.currentActiveSource) {
          const source = messageData.currentActiveSource;
          const promptKey = source.promptKey;
          if (promptKey) {
            const sources = { ...activeSources };
            // 按 promptKey 存储源信息，支持子分类级别
            sources[promptKey] = source;
            setActiveSources(sources);
          }
        }
      } else if (
        messageType === ExtensionResponse.PromptUpdated ||
        messageType === ExtensionResponse.PromptCreated ||
        messageType === ExtensionResponse.PromptRenamed ||
        messageType === ExtensionResponse.PromptResetComplete ||
        messageType === ExtensionResponse.PromptAllResetComplete
      ) {
        loadAllPrompts();
        loadWorkspaceStates();
      } else if (messageType === ExtensionResponse.PromptDeleted) {
        loadAllPrompts();
        loadWorkspaceStates();
        if (selectedKey === messageData?.key) {
          setSelectedKey(null);
          setCurrentContent("");
        }
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [
    selectedKey,
    activePromptsByCategory,
    activePromptsBySubCategory,
    activeSources,
  ]);

  // Handle selection and content updates
  useEffect(() => {
    if (categoryFilter !== "all" && Object.keys(prompts).length > 0) {
      const activeKey =
        activePromptsByCategory[categoryFilter as PromptCategory];
      if (activeKey && prompts[activeKey]) {
        setTimeout(() => {
          setSelectedKey(activeKey);
          setCurrentContent(prompts[activeKey].content);
        }, 0);
      } else {
        const firstInCategory = Object.entries(prompts).find(
          ([key, detail]) => {
            const promptCategory =
              detail.category || getCategoryFromKey(key, prompts);
            return promptCategory === categoryFilter;
          },
        );
        if (firstInCategory) {
          setTimeout(() => {
            setSelectedKey(firstInCategory[0]);
            setCurrentContent(firstInCategory[1].content);
          }, 0);
        }
      }
      return;
    }

    // 仅在 selectedKey 变化时更新内容，避免与用户输入冲突
    if (selectedKey && prompts[selectedKey]) {
      const content = prompts[selectedKey].content;
      // 使用 setTimeout 将 setState 移至 effect 之外，避免级联渲染
      setTimeout(() => {
        setCurrentContent(content);
      }, 0);
    }
  }, [categoryFilter, prompts, activePromptsByCategory, selectedKey]);

  // Event handlers
  const handleSelectChange = useCallback(
    (key: string) => {
      setSelectedKey(key);
      // 立即更新内容以避免延迟
      if (prompts[key]) {
        setCurrentContent(prompts[key].content);
      }
    },
    [prompts],
  );

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCurrentContent(e.target.value);
    },
    [],
  );

  const handleCreateNew = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!selectedKey) return;

    const detail = prompts[selectedKey];
    if (detail.isNew && !detail.category) {
      setPendingSaveContent(currentContent);
      setShowStorageModal(true);
    } else {
      updatePrompt(selectedKey, currentContent, "global");
    }
  }, [selectedKey, currentContent, prompts]);

  const handleStorageConfirm = useCallback(
    (level: StorageLevel, workspaceId?: string) => {
      if (!selectedKey || !pendingSaveContent) return;

      let target: any = "global";
      if (level === "workspace") {
        target = "workspace";
      } else if (level === "project") {
        target = "workspaceFolder";
      }

      updatePrompt(selectedKey, pendingSaveContent, target, workspaceId);

      setShowStorageModal(false);
      setPendingSaveContent(null);
    },
    [selectedKey, pendingSaveContent],
  );

  const handleReset = useCallback(() => {
    if (!selectedKey) return;

    const detail = prompts[selectedKey];
    const target = detail.source === "global" ? "global" : "workspace";

    resetPrompt(selectedKey, target);
  }, [selectedKey, prompts]);

  const handleResetAll = useCallback(() => {
    resetAllPrompts("global");
  }, []);

  const handleRename = useCallback(
    (key: string) => {
      const oldKey = key;
      const newKey = prompt(t("renamePrompt", { oldKey }), oldKey);
      if (newKey && newKey !== oldKey) {
        const source = prompts[oldKey].source;
        // 将 PromptSource 映射为 renamePrompt 接受的类型
        const target: "global" | "workspace" | "project" =
          source === "workspace"
            ? "workspace"
            : source === "project"
              ? "project"
              : "global";
        renamePrompt(oldKey, newKey, target);
      }
    },
    [t, prompts],
  );

  const handleDelete = useCallback(
    async (key: string) => {
      if (!prompts || !prompts[key]) {
        console.error("[handleDelete] Prompt not found for key:", key);
        return;
      }

      const detail = prompts[key];

      // UI 层面已经通过 DeleteConfirmModal 处理了确认逻辑
      // 这里直接执行删除操作
      let target: any = "global";
      if (detail.source === "workspace") {
        target = "workspace";
      } else if (detail.source === "project") {
        target = "workspaceFolder";
      }

      deletePrompt(key, target);
    },
    [prompts],
  );

  const handleSetActive = useCallback(() => {
    if (!selectedKey) return;

    const category = getCategoryFromKey(selectedKey, prompts);
    // 只在有实际的 workspaceId 时传递，否则传递 undefined
    const workspaceId = selectedWorkspace || undefined;
    setActivePrompt(category, selectedKey, workspaceId);
  }, [selectedKey, prompts, selectedWorkspace]);

  const handleInsertVariable = useCallback((variableName: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const variable = `{{${variableName}}}`;

    setCurrentContent(
      text.substring(0, start) + variable + text.substring(end),
    );

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          start + variable.length,
          start + variable.length,
        );
      }
    }, 0);
  }, []);

  // Helper functions
  const getAvailableVariablesHelper = useCallback(
    (key: string) => {
      return getAvailableVariables(key, prompts);
    },
    [prompts],
  );

  const getCategoryFromKeyHelper = useCallback(
    (key: string) => {
      return getCategoryFromKey(key, prompts);
    },
    [prompts],
  );

  return {
    // State
    prompts,
    selectedKey,
    currentContent,
    showCreateModal,
    showStorageModal,
    showDeleteModal,
    pendingDeleteKey,
    pendingSaveContent,
    activePromptsByCategory,
    activePromptsBySubCategory,
    activeSources,
    workspaces,
    selectedWorkspace,
    categoryFilter,
    guideExpanded,
    textareaRef,

    // Actions
    handleSelectChange,
    handleContentChange,
    handleCreateNew,
    handleSave,
    handleStorageConfirm,
    handleReset,
    handleResetAll,
    handleRename,
    handleDelete,
    handleSetActive,
    handleInsertVariable,
    setShowCreateModal,
    setShowStorageModal,
    setShowDeleteModal,
    setCategoryFilter,
    setGuideExpanded,
    setSelectedWorkspace,

    // Helpers
    getAvailableVariables: getAvailableVariablesHelper,
    getCategoryFromKey: getCategoryFromKeyHelper,
  };
}
