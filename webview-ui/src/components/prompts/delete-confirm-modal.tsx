import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { PromptDetail } from "@shared/types/prompts";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  promptKey: string;
  promptDetail?: PromptDetail;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  promptKey,
  promptDetail,
}) => {
  const { t } = useTranslation("prompts-page");

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  // 显示名称优先级：title > key
  const displayName = promptDetail?.title || promptKey;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[400px] bg-[var(--vscode-editor-background)] text-[var(--vscode-foreground)] border-[var(--vscode-panel-border)]"
        onClose={onClose}
      >
        <DialogHeader>
          <DialogTitle className="text-red-500">
            {t("deleteConfirmTitle") || "确认删除"}
          </DialogTitle>
          <DialogDescription className="text-[var(--vscode-descriptionForeground)]">
            {t("deleteConfirm", { key: displayName })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            onClick={onClose}
            className="bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] border-0"
          >
            {t("cancel") || "取消"}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {t("delete") || "删除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
