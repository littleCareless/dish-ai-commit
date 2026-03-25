import { Button } from "@/components/ui/button";
import {
  ModelRegistryRow,
  ModelRegistryTable,
} from "@/components/settings/ModelRegistryTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomModelInfo } from "@/types/model-custom";
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

  const getCapabilities = (model: CustomModelInfo) => {
    const caps: string[] = [];
    if (model.capabilities?.streaming) {
      caps.push(t("capabilities.streaming"));
    }
    if (model.capabilities?.functionCalling) {
      caps.push(t("capabilities.functionCalling"));
    }
    if (model.capabilities?.vision) {
      caps.push(t("capabilities.vision"));
    }
    return caps;
  };
  const rows: ModelRegistryRow[] = models.map((model) => ({
    providerId: model.providerId,
    modelId: model.id,
    modelName: model.modelName,
    inputTokens: model.maxTokens.input,
    outputTokens: model.maxTokens.output,
    contextWindow: model.contextWindow,
    capabilities: getCapabilities(model),
    deprecated: model.deprecated,
    source: "custom",
    updatedAt: model.lastUpdated,
  }));

  return (
    <>
      <ModelRegistryTable
        rows={rows}
        isLoading={isLoading}
        loadingText={t("status.loading")}
        emptyTitle={t("emptyState.title")}
        emptyDescription={t("emptyState.description")}
        showActions={true}
        renderActions={(row) => (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onEdit(
                  models.find(
                    (m) =>
                      m.providerId === row.providerId && m.id === row.modelId,
                  ) as CustomModelInfo,
                )
              }
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleDeleteClick(row.providerId, row.modelId)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      />

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
