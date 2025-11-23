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
import { providerRegistry } from "../../config/provider-registry";
import { ExtendedProviderConfig } from "../../types/provider-metadata";
import { canFetchModels } from "../../utils/config-validator";
import {
  createProviderSchema,
  getFieldDefaultValue,
} from "../../utils/validation-helpers";
import { postMessage, useMessageHandler } from "../../utils/vscode";
import { Form } from "../ui/form";
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

    // 特别处理模型选择字段
    const modelValue =
      configData?.defaultModel ||
      (configData as Record<string, unknown>)?.model;
    if (modelValue) {
      defaults["model"] = modelValue;
      defaults["defaultModel"] = modelValue;
    }

    if (configData?.customFields) {
      defaults["customFields"] = configData.customFields;
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
    (config as ExtendedProviderConfig).defaultModel,
    (config as ExtendedProviderConfig & { model?: string }).model,
  ]); // ‼️ Depends on provider.id and the actual model fields

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

    // 特别处理model/defaultModel保存，确保同步
    // 无论设置哪个字段，都需要确保两个字段都有值
    if (fieldKey === "defaultModel" || fieldKey === "model") {
      // 确保两个字段都被设置
      newConfig.defaultModel = value;
      // 使用索引表示法来设置不在类型定义中的属性
      (newConfig as Record<string, unknown>)["model"] = value;
      // 同时更新form中的这两个值
      form.setValue("defaultModel", value as never);
      form.setValue("model", value as never);

      // 模型选择的特殊处理：添加到customFields
      // 这确保了模型选择能够在多种情况下都被保存
      const modelInfo = models.find((model) => model.id === value);
      if (modelInfo) {
        const customFields = {
          ...(newConfig.customFields || {}),
          selectedModelInfo: {
            id: modelInfo.id,
            name: modelInfo.name || modelInfo.id,
          },
        };
        newConfig.customFields = customFields;

        // 为了调试目的，记录模型信息
        console.log(`[ProviderConfigForm] 保存模型选择到customFields:`, {
          modelId: modelInfo.id,
          modelName: modelInfo.name || modelInfo.id,
        });
      }
    }

    // 将完整配置传递给父组件
    // 关键：确保 newConfig 对象本身包含了所有字段
    console.log(`[ProviderConfigForm] handleConfigChange - 传输配置给父组件:`, {
      fieldKey,
      value,
      hasDefaultModel: !!newConfig.defaultModel,
      configObj: newConfig,
    });

    onConfigChange(provider.id, newConfig);

    // 更新表单值
    form.setValue(fieldKey as keyof ProviderConfigFormData, value as never);

    console.log(`[ProviderConfigForm] 配置已更新:`, {
      fieldKey,
      value,
      hasDefaultModel: !!newConfig.defaultModel,
      hasModel: !!(newConfig as Record<string, unknown>).model,
      hasCustomFields: !!newConfig.customFields,
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

            const currentModel =
              watchedValues.model || watchedValues.defaultModel;
            if (modelsList.length > 0 && currentModel) {
              const foundModel = modelsList.find((m) => m.id === currentModel);
              if (foundModel) {
                const modelData: Record<string, unknown> = {
                  defaultModel: foundModel.id,
                  customFields: {
                    ...(watchedValues.customFields || {}),
                    selectedModelInfo: {
                      id: foundModel.id,
                      name: foundModel.name || foundModel.id,
                      isAutoRecovered: true,
                    },
                  },
                };
                modelData["model"] = foundModel.id;

                console.log(`[ProviderConfigForm] 恢复模型选择:`, {
                  fromStorage: !!(config as Record<string, unknown>)
                    .defaultModel,
                  fromForm: !!watchedValues.model,
                  modelId: foundModel.id,
                  modelName: foundModel.name || foundModel.id,
                });

                // 关键修复：用 form.setValue 替代 onConfigChange 来打破循环
                // 这可以防止因父组件状态更新而导致的无限循环，同时保留恢复模型选择的功能
                form.setValue("defaultModel", modelData.defaultModel as never);
                form.setValue("model", modelData.model as never);
                form.setValue("customFields", modelData.customFields as never);

                console.log(
                  `[ProviderConfigForm] 从模型列表中恢复模型选择 (表单已更新):`,
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

    if (currentValues.model || currentValues.defaultModel) {
      console.log(`[ProviderConfigForm] 当前模型选择状态:`, {
        model: currentValues.model,
        defaultModel: currentValues.defaultModel,
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
            {/* 调试信息面板 - 模型选择状态 */}
            <div className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 p-2 rounded mb-2 border border-slate-200 dark:border-slate-700">
              <div className="font-medium mb-1 flex items-center justify-between">
                <span>{t("modelSelectionStatus")}</span>
                {watchedValues.model && watchedValues.defaultModel ? (
                  <span className="text-green-600 dark:text-green-500 px-1 py-0.5 rounded bg-green-50 dark:bg-green-950 text-[10px]">
                    {t("configured")}
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-500 px-1 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-[10px]">
                    {t("notConfigured")}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div>
                  {t("modelField")}:{" "}
                  <span className="font-mono">
                    {(watchedValues.model as string) || t("notSet")}
                  </span>
                </div>
                <div>
                  {t("defaultModelField")}:{" "}
                  <span className="font-mono">
                    {(watchedValues.defaultModel as string) || t("notSet")}
                  </span>
                </div>
              </div>
              <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                ({t("debugInfo")})
              </div>
            </div>
            <VSCodeDropdown
              value={
                (watchedValues.model as string) ||
                (watchedValues.defaultModel as string) ||
                ""
              }
              onChange={
                ((e: Event) => {
                  const target = e.target as HTMLSelectElement;
                  if (target.value) {
                    // 获取所选模型的完整数据
                    const modelData = models.find(
                      (model) => model.id === target.value,
                    );

                    // 记录模型选择之前的状态
                    const prevState = {
                      model: watchedValues.model as string,
                      defaultModel: watchedValues.defaultModel as string,
                    };

                    console.log(
                      `[ProviderConfigForm] 选择模型: ${target.value}，之前的状态:`,
                      prevState,
                    );

                    // 🔑 简化版本：只调用一次 handleConfigChange，传递完整的配置对象
                    // 这样能一次性设置 defaultModel + customFields
                    const customFields = {
                      ...(watchedValues.customFields || {}),
                      selectedModelInfo: modelData
                        ? {
                            id: modelData.id,
                            name: modelData.name || modelData.id,
                          }
                        : undefined,
                    };

                    // 创建完整的模型配置对象
                    const modelConfig = {
                      defaultModel: target.value,
                      model: target.value,
                      customFields,
                    };

                    // 使用 onConfigChange 来同时更新这些字段
                    // 将 newConfig 设计为传递所有需要更新的字段
                    // 这样 ProvidersSettings 中的 handleConfigChange 能正确合并
                    console.log(
                      `[ProviderConfigForm] 一次性保存模型配置:`,
                      modelConfig,
                    );

                    // 虽然分开调用，但现在 ProvidersSettings 会正确地保留 defaultModel
                    handleConfigChange("defaultModel", target.value);
                    if (customFields.selectedModelInfo) {
                      handleConfigChange("customFields", customFields);
                    }

                    // 记录最终状态用于调试
                    setTimeout(() => {
                      const finalModelState = {
                        model: form.getValues("model"),
                        defaultModel: form.getValues("defaultModel"),
                        hasModelValue:
                          !!form.getValues("model") ||
                          !!form.getValues("defaultModel"),
                        customFields: form.getValues("customFields"),
                      };

                      console.log(
                        `[ProviderConfigForm] 模型选择已保存，最终状态:`,
                        finalModelState,
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
