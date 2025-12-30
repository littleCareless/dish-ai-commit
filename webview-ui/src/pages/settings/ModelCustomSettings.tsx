import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModelList } from "@/components/model-custom/ModelList";
import { ModelEditDialog } from "@/components/model-custom/ModelEditDialog";
import { ProviderFilter } from "@/components/model-custom/ProviderFilter";
import {
  CustomModelInfo,
  ProviderInfo,
  CustomModelRegistry,
} from "@/types/model-custom";
import { UIRequest, ExtensionResponse } from "@shared/types/messages";
import { postMessage } from "@/utils/vscode";
import { useMessageHandler } from "@/utils/vscode";
import { themeStyles } from "@/utils/theme";

export const ModelCustomSettings: React.FC = () => {
  const { t } = useTranslation("model-custom");
  const [models, setModels] = useState<CustomModelInfo[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [editingModel, setEditingModel] = useState<CustomModelInfo | null>(
    null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterProvider, setFilterProvider] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // 处理消息响应
  const handleMessage = useCallback((event: MessageEvent) => {
    const { command, payload, error } = event.data;

    // 处理错误
    if (command === ExtensionResponse.ModelCustomError) {
      console.error("Model Custom Error:", error);
      setIsLoading(false);
      return;
    }

    // 处理模型列表加载
    if (command === ExtensionResponse.ModelCustomAllLoaded && payload) {
      const registry = payload as CustomModelRegistry;
      const modelList = Object.values(registry.models);
      setModels(modelList);
      setIsLoading(false);
    }

    // 处理提供商列表加载
    if (command === ExtensionResponse.ModelCustomProvidersLoaded && payload) {
      setProviders(payload as ProviderInfo[]);
    }

    // 处理保存成功
    if (command === ExtensionResponse.ModelCustomSaved) {
      console.log("Model saved successfully");
    }

    // 处理删除成功
    if (command === ExtensionResponse.ModelCustomDeleted) {
      console.log("Model deleted successfully");
    }

    // 处理导出
    if (command === ExtensionResponse.ModelCustomExported && payload) {
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `custom-models-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    // 处理导入
    if (command === ExtensionResponse.ModelCustomImported) {
      console.log("Model imported successfully");
    }
  }, []);

  useMessageHandler(handleMessage);

  // Initialize data on mount - using setTimeout to avoid setState in effect
  useEffect(() => {
    // Use requestAnimationFrame or setTimeout to defer state updates
    // This avoids the "setState in effect" warning while maintaining behavior
    const initLoad = () => {
      setIsLoading(true);
      postMessage(UIRequest.ModelCustomGetAll);
      postMessage(UIRequest.ModelCustomGetProviders);
    };
    // Defer to next tick to avoid synchronous state update in effect
    setTimeout(initLoad, 0);
  }, []);

  const loadData = useCallback(() => {
    setIsLoading(true);
    postMessage(UIRequest.ModelCustomGetAll);
  }, []);

  const handleSave = useCallback(
    async (info: CustomModelInfo) => {
      postMessage(UIRequest.ModelCustomSave, { info });
      // 延迟一下等待后端处理，然后刷新列表
      setTimeout(() => {
        loadData();
      }, 100);
    },
    [loadData],
  );

  const handleDelete = useCallback(
    async (providerId: string, modelId: string) => {
      postMessage(UIRequest.ModelCustomDelete, { providerId, modelId });
      // 乐观更新 UI
      setModels((prev) =>
        prev.filter((m) => !(m.providerId === providerId && m.id === modelId)),
      );
    },
    [],
  );

  const handleExport = useCallback(() => {
    postMessage(UIRequest.ModelCustomExport);
  }, []);

  const handleImport = useCallback(
    async (file: File) => {
      const content = await file.text();
      const data = JSON.parse(content);
      postMessage(UIRequest.ModelCustomImport, { registry: data });
      // 延迟一下然后刷新
      setTimeout(() => {
        loadData();
      }, 100);
    },
    [loadData],
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await handleImport(file);
        e.target.value = "";
      }
    },
    [handleImport],
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p
            className="text-sm"
            style={{ color: themeStyles.mutedForeground() }}
          >
            {t("description")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> {t("addModel")}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> {t("export")}
          </Button>
          <label className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            导入
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <ProviderFilter
        value={filterProvider}
        onChange={setFilterProvider}
        providers={providers}
      />

      <ModelList
        models={models.filter(
          (m) => filterProvider === "all" || m.providerId === filterProvider,
        )}
        onEdit={setEditingModel}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      <ModelEditDialog
        open={isDialogOpen || !!editingModel}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingModel(null);
        }}
        model={editingModel}
        providers={providers}
        onSave={handleSave}
      />
    </div>
  );
};
