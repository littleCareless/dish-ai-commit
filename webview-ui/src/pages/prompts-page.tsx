import { CreatePromptModal } from "@/components/prompts/create-prompt-modal";
import { StorageLevelModal } from "@/components/prompts/storage-level-modal";
import { PromptList } from "@/components/prompts/prompt-list";
import { PromptEditor } from "@/components/prompts/prompt-editor";
import { PromptInfoPanel } from "@/components/prompts/prompt-info-panel";
import { PromptGuidePanel } from "@/components/prompts/prompt-guide-panel";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePrompts } from "@/hooks/usePrompts";
import React from "react";

export const PromptsPage: React.FC = () => {
  const {
    // State
    prompts,
    selectedKey,
    currentContent,
    showCreateModal,
    showStorageModal,
    activePromptsByCategory,
    activePromptsBySubCategory,
    activeSources,
    workspaces,
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
    handleDelete,
    handleSetActive,
    handleInsertVariable,
    setShowCreateModal,
    setShowStorageModal,
    setCategoryFilter,
    setGuideExpanded,

    // Helpers
    getAvailableVariables,
    getCategoryFromKey,
  } = usePrompts();

  return (
    <TooltipProvider delayDuration={0}>
      <div className="h-full flex flex-col text-[var(--vscode-foreground)] bg-[var(--vscode-editor-background)]">
        {/* 模态框 */}
        <CreatePromptModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />

        <StorageLevelModal
          isOpen={showStorageModal}
          onClose={() => setShowStorageModal(false)}
          onSelect={handleStorageConfirm}
          workspaces={workspaces}
          selectedPromptKey={selectedKey || ""}
          selectedCategory={selectedKey ? getCategoryFromKey(selectedKey) : ""}
        />

        {/* 主布局 */}
        <div className="flex-1 flex overflow-hidden p-4 gap-4">
          {/* 左侧：提示词列表 */}
          <PromptList
            prompts={prompts}
            selectedKey={selectedKey}
            activePromptsByCategory={activePromptsByCategory}
            activePromptsBySubCategory={activePromptsBySubCategory}
            activeSources={activeSources}
            workspaces={workspaces}
            categoryFilter={categoryFilter}
            onSelectChange={handleSelectChange}
            onDelete={handleDelete}
            onCreateNew={handleCreateNew}
            onResetAll={handleResetAll}
            onCategoryFilterChange={setCategoryFilter}
          />

          {/* 右侧：编辑区域 */}
          <div className="w-2/3 flex flex-col gap-4 p-4 bg-[var(--vscode-editor-background)] rounded-md border border-[var(--vscode-panel-border)] overflow-hidden min-h-0 relative">
            {/* 提示词信息面板 */}
            <PromptInfoPanel
              selectedKey={selectedKey}
              prompts={prompts}
              activePromptsByCategory={activePromptsByCategory}
              activePromptsBySubCategory={activePromptsBySubCategory}
              activeSources={activeSources}
              workspaces={workspaces}
              guideExpanded={guideExpanded}
              setGuideExpanded={setGuideExpanded}
              getCategoryFromKey={getCategoryFromKey}
            />

            {/* 引导信息面板 */}
            <PromptGuidePanel
              selectedKey={selectedKey}
              guideExpanded={guideExpanded}
              setGuideExpanded={setGuideExpanded}
              getCategoryFromKey={getCategoryFromKey}
            />

            {/* 编辑器 */}
            <PromptEditor
              selectedKey={selectedKey}
              prompts={prompts}
              currentContent={currentContent}
              activePromptsByCategory={activePromptsByCategory}
              activePromptsBySubCategory={activePromptsBySubCategory}
              textareaRef={textareaRef}
              availableVariables={
                selectedKey ? getAvailableVariables(selectedKey) : []
              }
              onContentChange={handleContentChange}
              onInsertVariable={handleInsertVariable}
              onSave={handleSave}
              onReset={handleReset}
              onSetActive={handleSetActive}
              getCategoryFromKey={getCategoryFromKey}
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default PromptsPage;
