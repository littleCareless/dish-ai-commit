import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { postMessage } from "@/utils/vscode";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Control, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { AdvancedIndexingSettings } from "@/components/settings/indexing/advanced-indexing-settings";
import { GeminiSettings } from "@/components/settings/indexing/gemini-settings";
import { MistralSettings } from "@/components/settings/indexing/mistral-settings";
import { OllamaSettings } from "@/components/settings/indexing/ollama-settings";
import { OpenAICompatibleSettings } from "@/components/settings/indexing/openai-compatible-settings";
import { OpenAISettings } from "@/components/settings/indexing/openai-settings";
import { ProviderSelector } from "@/components/settings/indexing/provider-selector";
import { VercelAIGatewaySettings } from "@/components/settings/indexing/vercel-ai-gateway-settings";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useVSCodeMessage } from "@/hooks/use-vscode-message";

// Define message payload types
interface IndexingProgressPayload {
  message: string;
  current: number;
  total: number;
}

interface IndexStatusPayload {
  isIndexed: number;
}

interface IndexingFailedPayload {
  error: string;
}

interface IndexingStats {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  failedFiles: Array<{ path: string; error: string }>;
}

// Define the form schema using Zod
const formSchema = z.object({
  enabled: z.boolean(),
  provider: z.string(),
  qdrantUrl: z.string().optional(),
  qdrantApiKey: z.string().optional(),
  searchScoreThreshold: z.number().optional(),
  maxSearchResults: z.number().optional(),
  embeddingModel: z.string().optional(), // Keep this to track active model if needed, or rely on provider config
  providers: z
    .object({
      ollama: z
        .object({
          model: z.string().optional(),
          baseUrl: z.string().optional(),
          modelDimensions: z.number().optional(),
        })
        .optional(),
      openai: z
        .object({
          apiKey: z.string().optional(),
          model: z.string().optional(),
        })
        .optional(),
      gemini: z
        .object({
          apiKey: z.string().optional(),
          model: z.string().optional(),
        })
        .optional(),
      mistral: z
        .object({
          apiKey: z.string().optional(),
          model: z.string().optional(),
        })
        .optional(),
      "vercel-ai-gateway": z
        .object({
          apiKey: z.string().optional(),
          model: z.string().optional(),
        })
        .optional(),
      "openai-compatible": z
        .object({
          baseUrl: z.string().optional(),
          apiKey: z.string().optional(),
          model: z.string().optional(),
          modelDimensions: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type IndexingFormValues = z.infer<typeof formSchema>;

const providerComponents: {
  [key: string]: React.FC<{ control: Control<IndexingFormValues> }>;
} = {
  ollama: OllamaSettings,
  openai: OpenAISettings,
  "openai-compatible": OpenAICompatibleSettings,
  gemini: GeminiSettings,
  mistral: MistralSettings,
  "vercel-ai-gateway": VercelAIGatewaySettings,
};

export const IndexingPage: React.FC = () => {
  const { t } = useTranslation();
  const form = useForm<IndexingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      enabled: false,
      provider: "ollama",
      qdrantUrl: "http://localhost:6333",
      providers: {
        ollama: {
          baseUrl: "http://localhost:11434",
        },
      },
    },
  });

  const [statusInfo, setStatusInfo] = useState<{
    key?: string;
    message?: string;
    options?: Record<string, unknown>;
  } | null>(null);
  const [indexingProgress, setIndexingProgress] = useState({
    current: 0,
    total: 0,
  });
  const [isIndexed, setIsIndexed] = useState<number>(0);
  const [indexingStats, setIndexingStats] = useState<IndexingStats | null>(
    null,
  );
  const [showDetails, setShowDetails] = useState(false);

  const selectedProvider = useWatch({
    control: form.control,
    name: "provider",
  });
  const enabled = useWatch({
    control: form.control,
    name: "enabled",
  });
  const ProviderComponent = providerComponents[selectedProvider];

  const indexingStatus = useMemo(() => {
    if (!statusInfo) {
      return null;
    }
    if (statusInfo.key) {
      const translated = t(statusInfo.key, statusInfo.options);
      if (statusInfo.message) {
        return `${translated}: ${statusInfo.message}`;
      }
      return translated;
    }
    return statusInfo.message;
  }, [statusInfo, t]);

  const onSubmit = useCallback((values: IndexingFormValues) => {
    // 清除之前的状态
    setStatusInfo(null);
    setIndexingProgress({ current: 0, total: 0 });
    setIndexingStats(null);

    console.log("save value", values);

    // 先保存设置
    postMessage("saveSettings", values);

    // 只有在启用索引时才触发扫描
    if (values.enabled) {
      postMessage("startIndexing", { clearIndex: false });
    }
  }, []);

  const handleClearIndex = useCallback(() => {
    postMessage("clearIndex");
  }, []);

  useVSCodeMessage(
    "indexingProgress",
    (payload: { data: IndexingProgressPayload }) => {
      setStatusInfo({ message: payload.data.message });
      setIndexingProgress({
        current: payload.data.current,
        total: payload.data.total,
      });
    },
  );

  useVSCodeMessage(
    "indexingFinished",
    (payload: {
      data: IndexStatusPayload & { stats?: IndexingStats; warning?: string };
    }) => {
      setStatusInfo(
        payload.data.warning
          ? { message: payload.data.warning }
          : { key: "indexing-page:status.indexingComplete" },
      );
      console.log("payload", payload);
      setIsIndexed(payload.data.isIndexed);
      if (payload.data.stats) {
        setIndexingStats(payload.data.stats);
      }
    },
  );

  useVSCodeMessage("indexCleared", (payload: { data: IndexStatusPayload }) => {
    setStatusInfo({ key: "indexing-page:status.indexCleared" });
    setIsIndexed(payload.data.isIndexed);
  });

  useVSCodeMessage(
    "indexingFailed",
    (payload: { data: IndexingFailedPayload }) => {
      setStatusInfo({
        key: "indexing-page:status.indexingFailed",
        message: payload.data.error,
      });
    },
  );

  useVSCodeMessage("settingsSaved", () => {
    setStatusInfo({ key: "indexing-page:status.settingsSaved" });
  });

  // 加载设置
  useVSCodeMessage(
    "loadIndexingSettings",
    (payload: {
      data: { config: Partial<IndexingFormValues>; isIndexed: number };
    }) => {
      const { config, isIndexed } = payload.data;
      console.log("config", config);

      // 更新表单值 - 合并现有值和新加载的设置以保持表单状态
      const currentValues = form.getValues();
      form.reset(
        {
          ...currentValues,
          ...config, // config is now a flat object matching IndexingFormValues
        },
        {
          keepDefaultValues: false,
        },
      );

      // 更新索引状态
      setIsIndexed(isIndexed);
      if (isIndexed > 0) {
        setStatusInfo({ key: "indexing-page:status.upToDate" });
      }
    },
  );

  // 组件挂载时请求设置
  useEffect(() => {
    postMessage("getSettings");
  }, []);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">{t("indexing-page:title")}</h1>
          <p className="mt-2 text-gray-600">
            {t("indexing-page:description")}{" "}
            <a href="#">{t("indexing-page:learnMore")}</a>
          </p>
        </div>
        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    console.log("Form field enabled changed:", checked);
                    field.onChange(checked);
                  }}
                />
              </FormControl>
              <FormLabel className="font-normal">
                {t("indexing-page:enableIndexing")}
              </FormLabel>
            </FormItem>
          )}
        />
        <div>
          <h2 className="text-lg font-medium text-gray-900">
            {t("indexing-page:status.title")}
          </h2>

          {/* 状态概览 */}
          <div className="mt-2 space-y-2">
            {/* 进度条和状态 */}
            <div className="w-full">
              <div className="flex justify-between text-sm mb-1 min-h-[20px]">
                <span>
                  {indexingStatus
                    ? `${t("indexing-page:status.current")}: ${indexingStatus}`
                    : ""}
                </span>
                {indexingProgress.total > 0 && (
                  <span className="text-gray-500">
                    {indexingProgress.current} / {indexingProgress.total}
                  </span>
                )}
              </div>
              {indexingProgress.total > 0 && (
                <progress
                  value={indexingProgress.current}
                  max={indexingProgress.total}
                  className="w-full h-2 rounded-full overflow-hidden"
                />
              )}
            </div>

            {/* 统计信息 */}
            {indexingStats && (
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-green-600 font-medium">
                  {t("indexing-page:stats.succeeded")}:{" "}
                  {indexingStats.succeeded + indexingStats.skipped}/
                  {indexingStats.total}
                </span>
                <span
                  className={`font-medium ${indexingStats.failed > 0 ? "text-red-600 cursor-pointer hover:underline" : "text-gray-400"}`}
                  onClick={() =>
                    indexingStats.failed > 0 && setShowDetails(true)
                  }
                >
                  {t("indexing-page:stats.failed")}: {indexingStats.failed}/
                  {indexingStats.total}
                  {indexingStats.failed > 0 &&
                    ` (${t("indexing-page:stats.viewFailureDetails")})`}
                </span>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex space-x-3 mt-4">
              {!indexingStats && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    postMessage("startIndexing", { clearIndex: false })
                  }
                  disabled={!enabled}
                >
                  {isIndexed > 0
                    ? t("indexing-page:buttons.updateIndex")
                    : t("indexing-page:buttons.startIndexing")}
                </Button>
              )}
              {indexingStats && indexingStats.failed > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(true)}
                >
                  {t("indexing-page:buttons.viewDetails")}
                </Button>
              )}
            </div>

            {/* 失败详情弹窗 */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
              <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>
                    {t("indexing-page:dialog.failedFilesTitle", {
                      count: indexingStats?.failed || 0,
                    })}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-1">
                  {indexingStats &&
                  indexingStats.failedFiles &&
                  indexingStats.failedFiles.length > 0 ? (
                    <ul className="space-y-3">
                      {indexingStats.failedFiles.map((file, idx) => (
                        <li
                          key={idx}
                          className="text-sm border-b pb-2 last:border-0"
                        >
                          <div className="font-mono font-semibold text-gray-800 break-all">
                            {file.path}
                          </div>
                          <div className="text-red-600 mt-1 text-xs break-words">
                            {t("indexing-page:dialog.errorLabel")}: {file.error}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">
                      {t("indexing-page:dialog.noFailedFiles")}
                    </p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t("indexing-page:embeddingProvider")}</FormLabel>
                <FormControl>
                  <ProviderSelector
                    selectedProvider={field.value}
                    onProviderChange={(value) =>
                      form.setValue("provider", value)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {ProviderComponent && (
            <ProviderComponent
              control={form.control as Control<IndexingFormValues>}
            />
          )}
        </div>
        <AdvancedIndexingSettings
          control={form.control as Control<IndexingFormValues>}
        />
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="secondary" onClick={handleClearIndex}>
            {t("indexing-page:clearIndex")}
          </Button>
          <Button type="submit">{t("indexing-page:save")}</Button>
        </div>
      </form>
    </Form>
  );
};
