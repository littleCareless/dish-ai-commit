import { useEffect, useState } from "react";
import { vscode } from "@/lib/vscode";
import { useToast } from "@/hooks/use-toast";
import { SettingItem, AIModel } from "./types";

export const useMessageHandler = () => {
  const [settingsSchema, setSettingsSchema] = useState<SettingItem[]>([]);
  const [embeddingModels, setEmbeddingModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  const [indexingProgress, setIndexingProgress] = useState<string>("");
  const [indexedCount, setIndexedCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isIndexed, setIsIndexed] = useState<number>(0);
  const [indexingError, setIndexingError] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (vscode) {
      vscode.postMessage({ command: "getSettings" });
    } else {
      console.warn("vscode API not available at the time of getSettings call.");
    }

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!message || !message.command) {
        return;
      }

      switch (message.command) {
        case "indexingProgress": {
          setIndexingError(""); // Clear previous errors on new progress
          setIndexingProgress(message.data.message);
          setIndexedCount(message.data.current);
          setTotalCount(message.data.total);
          break;
        }
        case "loadSettings":
          {
            const loadedSchema = message.data.schema || [];
            const isIndexed = message.data.isIndexed || 0;
            const indexStatusError = message.data.indexStatusError || null;
            const embeddingModels = message.data.embeddingModels || [];
            setEmbeddingModels(embeddingModels);
            setIsIndexed(isIndexed);
            setIndexingError(indexStatusError);
            setSettingsSchema(loadedSchema);
            setIsLoading(false);
            setHasChanges(false);
            if (vscode) {
              const baseProviderSetting = loadedSchema.find(
                (s: SettingItem) => s.key === "base.provider"
              );
              const baseModelSettingExists = loadedSchema.some(
                (s: SettingItem) => s.key === "base.model"
              );

              if (
                baseProviderSetting &&
                baseProviderSetting.value &&
                baseModelSettingExists
              ) {
                const providerId = String(baseProviderSetting.value);
                const modelSettingKey = "base.model";
                if (providerId) {
                  vscode.postMessage({
                    command: "getModelsForProvider",
                    data: {
                      providerId: providerId,
                      modelSettingKey: modelSettingKey,
                      providerContextKey: `providers.${providerId.toLowerCase()}`,
                    },
                  });
                }
              }
            }
          }
          break;
        case "loadSettingsError":
          toast({
            title: "Error loading settings",
            description: message.error,
            variant: "destructive",
          });
          setIsLoading(false);
          break;
        case "getModelsForProviderError":
          toast({
            title: "Error loading models",
            description: `Could not load models for ${message.data.modelSettingKey}: ${message.error}`,
            variant: "destructive",
          });
          break;
        case "indexingStatusError":
          setIndexingError(message.error);
          toast({
            title: "无法获取索引状态",
            description: message.error,
            variant: "destructive",
          });
          break;
        case "settingsSaved":
          toast({
            title: "Settings Saved",
            description: "Your settings have been saved successfully.",
          });
          setHasChanges(false);
          if (vscode) {
            vscode.postMessage({ command: "getSettings" });
          }
          break;
        case "saveSettingsError":
          toast({
            title: "Error Saving Settings",
            description: message.error,
            variant: "destructive",
          });
          break;
        case "indexingFinished":
          setIsIndexing(false);
          setIndexingError(""); // Clear error on success
          if (typeof message.data.isIndexed === "number") {
            setIsIndexed(message.data.isIndexed);
          }
          toast({
            title: "索引完成",
            description: "代码库已成功建立索引。",
          });
          break;
        case "indexCleared":
          setIsIndexing(false);
          if (
            message.data &&
            typeof message.data.isIndexed === "number"
          ) {
            setIsIndexed(message.data.isIndexed);
          } else {
            setIsIndexed(0); // Fallback for safety
          }
          toast({
            title: "索引已清除",
            description: "索引数据已成功清除。",
          });
          if (vscode) {
            vscode.postMessage({ command: "getSettings" });
          }
          break;
        case "indexingFailed": {
          setIsIndexing(false);
          setIndexingProgress(""); // Clear progress text
          const {
            message: errorMessage,
            source,
            type,
          } = message.data || {
            message: "An unknown error occurred.",
            source: "unknown",
          };

          // Capitalize first letter of source for the title
          const sourceTitle = source.charAt(0).toUpperCase() + source.slice(1);
          setIndexingError(
            `索引失败: ${sourceTitle} 错误. ${errorMessage} (类型: ${
              type || "unknown"
            })`
          );
          break;
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [toast]);

  return {
    settingsSchema,
    setSettingsSchema,
    isLoading,
    hasChanges,
    setHasChanges,
    isIndexing,
    setIsIndexing,
    indexingProgress,
    indexedCount,
    totalCount,
    isIndexed,
    embeddingModels,
    indexingError,
  };
};
