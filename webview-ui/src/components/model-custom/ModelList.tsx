import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomModelInfo } from "@/types/model-custom";
import { themeStyles } from "@/utils/theme";
import { Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface ModelListProps {
  models: CustomModelInfo[];
  onEdit: (model: CustomModelInfo) => void;
  onDelete: (providerId: string, modelId: string) => Promise<void>;
  isLoading: boolean;
}

export function ModelList({
  models,
  onEdit,
  onDelete,
  isLoading,
}: ModelListProps) {
  const { t } = useTranslation("model-custom");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    providerId: string;
    modelId: string;
  } | null>(null);

  const handleDeleteClick = (providerId: string, modelId: string) => {
    setDeleteConfirm({ open: true, providerId, modelId });
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirm) {
      await onDelete(deleteConfirm.providerId, deleteConfirm.modelId);
      setDeleteConfirm(null);
    }
  };

  if (isLoading) {
    return (
      <div
        className="text-center py-8"
        style={{ color: themeStyles.mutedForeground() }}
      >
        {t("status.loading")}
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div
        className="text-center py-12 border rounded-lg"
        style={{
          backgroundColor: themeStyles.background(0.5),
          borderColor: themeStyles.border(),
        }}
      >
        <p className="text-lg font-medium mb-2">{t("emptyState.title")}</p>
        <p className="text-sm" style={{ color: themeStyles.mutedForeground() }}>
          {t("emptyState.description")}
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="border rounded-lg overflow-hidden"
        style={{ borderColor: themeStyles.border() }}
      >
        <table className="w-full text-sm">
          <thead
            style={{
              backgroundColor: themeStyles.muted(),
            }}
          >
            <tr>
              <th className="px-4 py-3 text-left">{t("table.provider")}</th>
              <th className="px-4 py-3 text-left">{t("table.modelId")}</th>
              <th className="px-4 py-3 text-left">{t("table.name")}</th>
              <th className="px-4 py-3 text-left">{t("table.input")}</th>
              <th className="px-4 py-3 text-left">{t("table.output")}</th>
              <th className="px-4 py-3 text-right">{t("table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr
                key={`${model.providerId}_${model.id}`}
                className="border-t"
                style={{ borderColor: themeStyles.border() }}
              >
                <td className="px-4 py-3">{model.providerId}</td>
                <td className="px-4 py-3 font-mono text-xs">{model.id}</td>
                <td className="px-4 py-3">{model.modelName}</td>
                <td className="px-4 py-3">{model.maxTokens.input}</td>
                <td className="px-4 py-3">{model.maxTokens.output}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(model)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      handleDeleteClick(model.providerId, model.id)
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm?.open ?? false}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmDelete")}</DialogTitle>
            <DialogDescription>{t("confirmDelete")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
