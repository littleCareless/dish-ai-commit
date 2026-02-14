import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CSSProperties, useState } from "react";
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

  const stickyHeaderStyle: CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 2,
    backgroundColor: themeStyles.muted(),
    boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
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
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: themeStyles.border() }}
      >
        <div
          className="w-full overflow-x-auto"
          style={{ scrollbarColor: `${themeStyles.border()} transparent` }}
        >
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead
                style={{
                  backgroundColor: themeStyles.muted(),
                }}
              >
                <tr>
                  {[
                    "table.provider",
                    "table.modelId",
                    "table.name",
                    "table.input",
                    "table.output",
                    "table.contextWindow",
                    "table.capabilities",
                  ].map((key) => (
                    <th
                      key={key}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={stickyHeaderStyle}
                    >
                      {t(key)}
                    </th>
                  ))}
                  <th
                    className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide"
                    style={stickyHeaderStyle}
                  >
                    {t("table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {models.map((model) => {
                  const capabilities = getCapabilities(model);
                  return (
                    <tr
                      key={`${model.providerId}_${model.id}`}
                      className="border-t transition-colors hover:bg-[var(--vscode-list-hoverBackground)]"
                      style={{ borderColor: themeStyles.border() }}
                    >
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{model.providerId}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {model.id}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <span>{model.modelName}</span>
                          {model.deprecated ? (
                            <Badge variant="destructive">
                              {t("deprecated")}
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {model.maxTokens.input}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {model.maxTokens.output}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {model.contextWindow ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {capabilities.length > 0 ? (
                            capabilities.map((cap) => (
                              <Badge key={cap} variant="outline">
                                {cap}
                              </Badge>
                            ))
                          ) : (
                            <span
                              className="text-xs"
                              style={{ color: themeStyles.mutedForeground() }}
                            >
                              {t("table.none")}
                            </span>
                          )}
                        </div>
                      </td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
