import { Form } from "@/components/ui/form";
import { providerRegistry } from "@/config/provider-registry";
import { ExtendedProviderConfig } from "@/types/provider-metadata";
import { canFetchModels } from "@/utils/config-validator";
import {
  createProviderSchema,
  getFieldDefaultValue,
} from "@/utils/validation-helpers";
import { postMessage, useMessageHandler } from "@/utils/vscode";
import { zodResolver } from "@hookform/resolvers/zod";
import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
import { AlertCircle, Loader } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { DynamicFieldGroup } from "./DynamicFieldRenderer";

interface ProviderConfigFormProps {
  provider: ExtendedProviderConfig;
  config: ExtendedProviderConfig | Record<string, unknown>;
  onConfigChange: (providerId: string, config: Record<string, unknown>) => void;
  onTestProvider: (providerId: string) => void;
  onOpenSettings: (providerId: string) => void;
}

// 分离的错误 UI 组件
const ProviderNotSupportedError: React.FC<{
  providerId: string;
  t: (key: string) => string;
}> = ({ providerId, t }) => (
  <div className="p-4 text-center text-red-600">
    {t("unsupportedProvider")}: {providerId}
  </div>
);

export const ProviderConfigForm: React.FC<ProviderConfigFormProps> = ({
  provider,
  config,
  onConfigChange,
  // onTestProvider,
  // onOpenSettings,
}) => {
  const { t } = useTranslation("provider-registry");
  const ProviderRegistry = providerRegistry;
  // 将所有 hooks 调用移到组件顶部（必须在条件检查之前）

  // 1. 初始化所有状态 - 这些必须无条件地调用
  const [models, setModels] = useState<Array<{ id: string; name?: string }>>(
    [],
  );
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  // 2. 初始化 refs
  const pendingFetchRef = useRef<NodeJS.Timeout | null>(null);
  const responseReceivedRef = useRef<boolean>(false);

  // 3. 获取提供商元数据（可以为 null）
  const providerMeta = ProviderRegistry[provider.id];

  // 4. 创建 schema 和类型（必须无条件调用）
  const providerSchema = useMemo(
    () =>
      providerMeta
        ? createProviderSchema(providerMeta.fields, t)
        : z.object({}),
    [providerMeta, t],
  );

  type ProviderConfigFormData = z.infer<typeof providerSchema>;

  // 5. 生成默认值函数
  const getDefaultValues = (): ProviderConfigFormData => {
    const defaults: Record<string, unknown> = {};
    const configData = config as Record<string, unknown>;

    if (providerMeta) {
      providerMeta.fields.forEach((field) => {
        defaults[field.key] =
          configData?.[field.key] ?? getFieldDefaultValue(field);
      });
    }

    // 处理模型选择字段
    if (configData?.model) {
      defaults["model"] = configData.model;
    }

    return defaults as ProviderConfigFormData;
  };

  // 6. 初始化 form
  const form = useForm<ProviderConfigFormData>({
    resolver: zodResolver(providerSchema),
    defaultValues: getDefaultValues(),
  });

  // Track previous config to detect actual changes
  const prevConfigRef = useRef<Record<string, unknown> | null>(null);
  const prevProviderIdRef = useRef<string | null>(null);

  // When config truly changes (e.g., switching profiles or providers), reset form
  useEffect(() => {
    console.log(
      `[ProviderConfigForm] Config/Provider changed, resetting form for provider: ${provider.id}`,
    );

    const newDefaults = getDefaultValues();
    form.reset(newDefaults);

    // We still need to update the prevConfigRef for the initial load.
    prevConfigRef.current = config as Record<string, unknown>;
    prevProviderIdRef.current = provider.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    provider.id,
    (config as ExtendedProviderConfig & { model?: string }).model,
  ]); // Depends on provider.id and model field

  // 7. 获取监听的值
  const watchedValues = form.watch();

  // 8. 处理配置变更
  const handleConfigChange = (fieldKey: string, value: unknown): void => {
    // 🔑 关键修复：不依赖 props 的 config，而是基于 form 的当前状态
    // 这确保了即使 props 没有及时更新，也不会丢失已编辑的字段
    const currentFormValues = form.getValues();

    // 创建完整的新配置对象
    // 优先使用 form 中的值，然后才是 props 中的值
    const newConfig = {
      ...config,
      ...currentFormValues, // 🛡️ 包含所有 form 中的当前值
      [fieldKey]: value, // 覆盖正在修改的字段
    };

    // 特别处理 model 字段
    if (fieldKey === "model") {
      // 确保 model 字段被设置
      (newConfig as Record<string, unknown>)["model"] = value;
      form.setValue("model", value as never);
    }

    // 将完整配置传递给父组件
    // 关键：确保 newConfig 对象本身包含了所有字段
    console.log(`[ProviderConfigForm] handleConfigChange - 传输配置给父组件:`, {
      fieldKey,
      value,
      configObj: newConfig,
    });

    onConfigChange(provider.id, newConfig);

    // 更新表单值
    form.setValue(fieldKey as keyof ProviderConfigFormData, value as never);

    console.log(`[ProviderConfigForm] 配置已更新:`, {
      fieldKey,
      value,
      hasModel: !!(newConfig as Record<string, unknown>).model,
    });
  };

  useMessageHandler(
    useCallback(
      (event: MessageEvent<unknown>) => {
        const message = event.data as Record<string, unknown>;
        const messageData = message.data as Record<string, unknown> | undefined;

        if (
          message.command === "providerModelsFetched" &&
          messageData?.providerId === provider.id
        ) {
          responseReceivedRef.current = true;
          if (pendingFetchRef.current) {
            clearTimeout(pendingFetchRef.current);
            pendingFetchRef.current = null;
          }

          setIsLoadingModels(false);

          if (messageData.success) {
            const modelsList =
              (messageData.models as Array<{ id: string; name?: string }>) ||
              [];
            setModels(modelsList);
            setModelError(null);

            const currentModel = watchedValues.model;
            if (modelsList.length > 0 && currentModel) {
              const foundModel = modelsList.find((m) => m.id === currentModel);
              if (foundModel) {
                console.log(`[ProviderConfigForm] 恢复模型选择:`, {
                  modelId: foundModel.id,
                  modelName: foundModel.name || foundModel.id,
                });

                // 确保 form 中的 model 值是最新的
                form.setValue("model", foundModel.id as never);

                console.log(
                  `[ProviderConfigForm] 从模型列表中恢复模型选择:`,
                  foundModel,
                );
              }
            }
          } else {
            setModels([]);
            setModelError(
              (messageData.error as string) || t("fetchModelsFailed"),
            );
          }
        }
      },
      [provider.id, watchedValues, config, form],
    ),
  );

  // 9. 获取模型列表的函数
  const fetchModels = useCallback(async (): Promise<void> => {
    if (!providerMeta) return;

    // 关键修复：直接从 form 中获取最新值，而不是依赖 watchedValues
    // 这使得 fetchModels 函数本身更稳定，不会在每次输入时都重新创建
    const currentValues = form.getValues();
    const apiKey = (currentValues.apiKey as string | undefined)?.trim();
    const baseUrl =
      (currentValues.baseURL as string | undefined)?.trim() ||
      (currentValues.baseUrl as string | undefined)?.trim();

    if (currentValues.model) {
      console.log(`[ProviderConfigForm] 当前模型选择状态:`, {
        model: currentValues.model,
      });
    }

    const { canFetch } = canFetchModels(providerMeta, currentValues);

    if (!canFetch) {
      setModels([]);
      setModelError(null);
      return;
    }

    setIsLoadingModels(true);
    setModelError(null);
    responseReceivedRef.current = false;

    try {
      postMessage("fetchProviderModels", {
        providerId: provider.id,
        apiKey: apiKey || undefined,
        baseUrl: baseUrl || undefined,
      });

      if (pendingFetchRef.current) {
        clearTimeout(pendingFetchRef.current);
      }

      pendingFetchRef.current = setTimeout(() => {
        if (!responseReceivedRef.current) {
          setIsLoadingModels(false);
          setModelError(t("fetchModelsTimeout"));
        }
      }, 30000);
    } catch (error) {
      setIsLoadingModels(false);
      setModelError(
        error instanceof Error ? error.message : t("fetchModelsFailed"),
      );
    }
  }, [provider.id, providerMeta, form]);

  const fetchModelsRef = useRef(fetchModels);
  fetchModelsRef.current = fetchModels;

  // 10. Per user feedback, disable automatic model fetching when API key/URL changes.
  // Model fetching should only happen on initial load (handled by the effect below).

  // 10.1 新增：当组件加载或提供商变更时，主动触发模型列表加载
  // 这确保每次打开配置时都会尝试加载模型列表
  useEffect(() => {
    if (providerMeta?.features.streaming) {
      console.log(`[ProviderConfigForm] 组件加载/提供商变更，主动触发模型加载`);
      // 延迟加载，确保组件完全初始化
      const timer = setTimeout(() => {
        fetchModelsRef.current();
      }, 300);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.id]);

  // 10.2 Auto-fetch when API Key or Base URL changes (Debounced)
  useEffect(() => {
    if (!providerMeta?.features.streaming) return;

    // We watch these values in the dependency array, but don't need to assign them to variables
    // if we are just triggering the ref.

    const timer = setTimeout(() => {
      console.log(
        `[ProviderConfigForm] API Key or Base URL changed, triggering fetch`,
      );
      fetchModelsRef.current();
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [
    watchedValues.apiKey,
    watchedValues.baseURL,
    watchedValues.baseUrl,
    providerMeta?.features.streaming,
  ]);

  // 11. 清理资源
  useEffect(() => {
    return () => {
      if (pendingFetchRef.current) {
        clearTimeout(pendingFetchRef.current);
      }
    };
  }, []);

  // ========== 现在可以进行条件检查 ==========
  // 如果提供商不支持，返回错误 UI
  if (!providerMeta) {
    return <ProviderNotSupportedError providerId={provider.id} t={t} />;
  }

  // 检查配置是否有效
  // const configValidation = isProviderConfigValid(providerMeta, watchedValues);
  // const canTestConnection = configValidation.isValid;
  const canSelectModel = models.length > 0 && !isLoadingModels;

  return (
    <Form {...form}>
      <div className="flex flex-col gap-6 p-4 border rounded-lg">
        {/* Dynamic Form Fields */}
        {providerMeta.fields.length > 0 && (
          <DynamicFieldGroup
            fields={providerMeta.fields}
            t={t}
            values={
              watchedValues as Record<
                string,
                string | number | boolean | null | undefined
              >
            }
            onChange={handleConfigChange}
          />
        )}
        {/* Model Selection (保留作为通用功能) */}
        {providerMeta.features.streaming && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {t("modelSelection")}
              </label>
              {isLoadingModels && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader className="w-3 h-3 animate-spin" />
                  {t("loading")}...
                </div>
              )}
            </div>

            <VSCodeDropdown
              value={(watchedValues.model as string) || ""}
              onChange={
                ((e: Event) => {
                  const target = e.target as HTMLSelectElement;
                  if (target.value) {
                    console.log(
                      `[ProviderConfigForm] 选择模型: ${target.value}`,
                    );

                    // 直接更新 model 字段
                    handleConfigChange("model", target.value);

                    // 记录最终状态用于调试
                    setTimeout(() => {
                      console.log(
                        `[ProviderConfigForm] 模型选择已保存:`,
                        form.getValues("model"),
                      );
                    }, 100);
                  }
                }) as any // eslint-disable-line @typescript-eslint/no-explicit-any
              }
              disabled={!canSelectModel}
            >
              <VSCodeOption value="">
                {models.length === 0
                  ? t("enterApiKeyOrBaseUrl")
                  : t("selectModel")}
              </VSCodeOption>
              {models
                .filter(
                  (model: { id: string; name?: string; category?: string }) => {
                    const category = model.category;
                    // Only show text-based models
                    return (
                      !category ||
                      category === "chat" ||
                      category === "text" ||
                      category === "completion"
                    );
                  },
                )
                .map((model) => (
                  <VSCodeOption key={model.id} value={model.id}>
                    {model.name || model.id}
                  </VSCodeOption>
                ))}
            </VSCodeDropdown>
            {modelError && (
              <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950 rounded text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{modelError}</span>
              </div>
            )}
          </div>
        )}
        {/* Action Buttons */}
        {/* <div className="flex gap-2">
          <VSCodeButton
            appearance="secondary"
            onClick={() => onTestProvider(provider.id)}
            disabled={!canTestConnection}
            title={
              !canTestConnection
                ? `请先填写: ${configValidation.missingFields.join(", ")}`
                : "测试与提供商的连接"
            }
          >
            <TestTube className="w-4 h-4 mr-2" />
            测试连接
          </VSCodeButton>
          <VSCodeButton
            appearance="secondary"
            onClick={() => onOpenSettings(provider.id)}
          >
            <Settings className="w-4 h-4 mr-2" />
            高级设置
          </VSCodeButton>
        </div> */}
      </div>
    </Form>
  );
};
