import { useEffect, useState } from "react";
import { vscode } from "@/lib/vscode";
import { useToast } from "@/hooks/use-toast";
import { SettingItem } from "./types";

export const useMessageHandler = () => {
  const [settingsSchema, setSettingsSchema] = useState<SettingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  const [indexingProgress, setIndexingProgress] = useState<string>("");
  const [indexedCount, setIndexedCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isIndexed, setIsIndexed] = useState<number>(0);
  const [processedModels, setProcessedModels] = useState<string[]>([]);
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
            setIsIndexed(isIndexed);
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
        case "modelsForProviderLoaded": {
          const rawModels = message.data.models;
          type ModelItem = {
            id: string | number;
            name?: string;
            [key: string]: unknown;
          };

          if (Array.isArray(rawModels) && rawModels.length > 0) {
            const firstModelItem = rawModels[0];
            if (typeof firstModelItem === "string") {
              setProcessedModels(rawModels as string[]);
            } else if (
              typeof firstModelItem === "object" &&
              firstModelItem !== null &&
              "id" in firstModelItem
            ) {
              setProcessedModels(
                rawModels.map((model: ModelItem) => String(model.id))
              );
            } else {
              console.warn(
                `Received models for ${message.data.modelSettingKey} in an unexpected array item format:`,
                rawModels
              );
              setProcessedModels([]);
            }
          } else if (
            typeof rawModels === "object" &&
            rawModels !== null &&
            "id" in rawModels
          ) {
            setProcessedModels([String((rawModels as ModelItem).id)]);
          } else {
            if (
              rawModels !== null &&
              rawModels !== undefined &&
              !Array.isArray(rawModels)
            ) {
              console.warn(
                `Received models for ${message.data.modelSettingKey} in an unexpected format:`,
                rawModels
              );
            }
            setProcessedModels([]);
          }
          break;
        }
        case "getModelsForProviderError":
          toast({
            title: "Error loading models",
            description: `Could not load models for ${message.data.modelSettingKey}: ${message.error}`,
            variant: "destructive",
          });
          break;
        case "indexingStatusError":
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
    processedModels,
    indexingError,
  };
};
