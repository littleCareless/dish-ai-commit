import { Button } from "@/components/ui/button";
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
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
import { AlertCircle, RefreshCw } from "lucide-react";
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
import { DynamicFieldGroup } from "./DynamicFieldGroup";

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
  const { t, i18n } = useTranslation("provider-registry");
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

  // 新增：跟踪已获取的模型配置，避免重复请求
  const lastFetchedConfigRef = useRef<{
    providerId: string;
    apiKey?: string;
    baseUrl?: string;
  } | null>(null);

  // 3. 获取提供商元数据（可以为 null）
  const providerMeta = ProviderRegistry[provider.id];

  // 4. 创建 schema 和类型（必须无条件调用）
  const providerSchema = useMemo(() => {
    const baseSchema = providerMeta
      ? createProviderSchema(providerMeta.fields, t)
      : z.object({});

    // 始终添加 model 字段作为可选字符串，以解决类型错误
    return baseSchema.extend({
      model: z.string().optional(),
    });
  }, [providerMeta, t]);

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

      // 如果当前 provider 有 baseUrl 设置的话，默认勾选 useCustomUrl
      // 仅当 config 中未显式设置 useCustomUrl 时才生效，避免覆盖用户的显式取消操作
      if (
        configData?.baseUrl &&
        typeof configData.baseUrl === "string" &&
        configData.baseUrl.trim() !== "" &&
        configData?.useCustomUrl === undefined &&
        providerMeta.fields.some((f) => f.key === "useCustomUrl")
      ) {
        defaults["useCustomUrl"] = true;
      }
    }

    // 处理模型选择字段
    if (configData?.model || configData?.defaultModel) {
      defaults["model"] = configData.model || configData.defaultModel;
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
  const internalUpdateRef = useRef(false);

  // When config truly changes (e.g., switching profiles or providers), reset form
  useEffect(() => {
    const providerChanged = prevProviderIdRef.current !== provider.id;
    const configChanged =
      prevConfigRef.current !== (config as Record<string, unknown>);

    if (!providerChanged && (!configChanged || internalUpdateRef.current)) {
      if (internalUpdateRef.current) {
        console.log(`[ProviderConfigForm] 检测到内部配置更新，跳过表单重置`);
        internalUpdateRef.current = false;
      }
      return;
    }

    console.log(
      `[ProviderConfigForm] Config/Provider changed, resetting form for provider: ${provider.id}`,
      {
        providerChanged,
        configChanged,
      },
    );

    const newDefaults = getDefaultValues();
    form.reset(newDefaults);

    // 清空模型列表和错误状态，确保切换 provider 时状态干净
    setModels([]);
    setModelError(null);
    setIsLoadingModels(false);

    prevConfigRef.current = config as Record<string, unknown>;
    prevProviderIdRef.current = provider.id;
    internalUpdateRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.id, config]);

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
      // 同时更新 defaultModel，以匹配 ProviderConfig 类型定义
      (newConfig as Record<string, unknown>)["defaultModel"] = value;
      form.setValue("model", value as never);
    }

    internalUpdateRef.current = true;

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

        // 添加详细的日志以便调试
        console.log(`[ProviderConfigForm] 收到消息:`, {
          command: message.command,
          expectedCommand: ExtensionResponse.ConnectionAllModelsFetched,
          providerId: messageData?.providerId,
          currentProviderId: provider.id,
        });

        if (
          message.command === ExtensionResponse.ConnectionAllModelsFetched &&
          messageData?.providerId === provider.id
        ) {
          console.log(`[ProviderConfigForm] 匹配到正确的消息，处理响应:`, {
            success: messageData.success,
            modelsCount: Array.isArray(messageData.models)
              ? messageData.models.length
              : 0,
            error: messageData.error,
          });

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
            console.log(
              `[ProviderConfigForm] 成功获取模型列表，共 ${modelsList.length} 个模型`,
            );
            setModels(modelsList);
            setModelError(null);

            // 更新最后获取的配置，用于后续去重判断
            const currentValues = form.getValues() as Record<string, unknown>;
            const apiKey = (currentValues.apiKey as string | undefined)?.trim();
            const baseUrl = (
              currentValues.baseUrl as string | undefined
            )?.trim();
            lastFetchedConfigRef.current = {
              providerId: provider.id,
              apiKey: apiKey || undefined,
              baseUrl: baseUrl || undefined,
            };
            console.log(
              `[ProviderConfigForm] 已更新最后获取的配置记录`,
              lastFetchedConfigRef.current,
            );

            if (modelsList.length > 0) {
              const currentModel =
                form.getValues("model") ||
                (config as any).defaultModel ||
                (config as any).model; // 多重回退策略

              if (currentModel) {
                const foundModel = modelsList.find(
                  (m) => m.id === currentModel,
                );
                if (foundModel) {
                  console.log(`[ProviderConfigForm] 恢复模型选择:`, {
                    modelId: foundModel.id,
                    modelName: foundModel.name || foundModel.id,
                  });

                  // 延迟设置值，确保 Dropdown 选项已渲染（解决 Web Component 时序问题）
                  setTimeout(() => {
                    form.setValue("model", foundModel.id as never, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }, 50);
                }
              }
            }
          } else {
            const errorMessage =
              (messageData.error as string) || t("fetchModelsFailed");
            console.error(
              `[ProviderConfigForm] 获取模型列表失败:`,
              errorMessage,
            );
            setModels([]);
            setModelError(errorMessage);
          }
        } else {
          // 记录不匹配的消息（用于调试）
          if (
            message.command === ExtensionResponse.ConnectionAllModelsFetched
          ) {
            console.warn(`[ProviderConfigForm] 收到消息但 providerId 不匹配:`, {
              messageProviderId: messageData?.providerId,
              currentProviderId: provider.id,
            });
          }
        }
      },
      [provider.id, form, t, config],
    ),
  );

  // 9. 获取模型列表的函数
  const fetchModels = useCallback(async (): Promise<void> => {
    if (!providerMeta) return;

    // 关键修复：直接从 form 中获取最新值，而不是依赖 watchedValues
    // 这使得 fetchModels 函数本身更稳定，不会在每次输入时都重新创建
    const currentValues = form.getValues() as Record<string, unknown>;
    const apiKey = (currentValues.apiKey as string | undefined)?.trim();
    const baseUrl =
      (currentValues.baseUrl as string | undefined)?.trim() ||
      (currentValues.baseUrl as string | undefined)?.trim();

    // 新增：检查是否已获取过相同配置的模型列表
    const currentConfigKey = {
      providerId: provider.id,
      apiKey: apiKey || undefined,
      baseUrl: baseUrl || undefined,
    };

    // 如果已有模型数据且配置相同，跳过请求
    if (
      models.length > 0 &&
      lastFetchedConfigRef.current &&
      lastFetchedConfigRef.current.providerId === currentConfigKey.providerId &&
      lastFetchedConfigRef.current.apiKey === currentConfigKey.apiKey &&
      lastFetchedConfigRef.current.baseUrl === currentConfigKey.baseUrl
    ) {
      console.log(
        `[ProviderConfigForm] 已有模型列表且配置未变化，跳过重复请求`,
      );
      return;
    }

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
      console.log(`[ProviderConfigForm] 开始获取模型列表:`, {
        providerId: provider.id,
        hasApiKey: !!apiKey,
        hasBaseUrl: !!baseUrl,
      });

      postMessage(UIRequest.ConnectionFetchProviderModels, {
        providerId: provider.id,
        apiKey: apiKey || undefined,
        baseUrl: baseUrl || undefined,
      });

      if (pendingFetchRef.current) {
        clearTimeout(pendingFetchRef.current);
      }

      // 设置 60 秒超时（后端超时是 120 秒，加上网络延迟和重试时间，60 秒是合理的）
      pendingFetchRef.current = setTimeout(() => {
        if (!responseReceivedRef.current) {
          console.warn(
            `[ProviderConfigForm] 获取模型列表超时（60秒），可能的原因：`,
            {
              providerId: provider.id,
              message: "后端可能没有响应，或者网络连接有问题",
            },
          );
          setIsLoadingModels(false);
          setModelError(t("fetchModelsTimeout"));
        }
      }, 60000);
    } catch (error) {
      console.error(`[ProviderConfigForm] 发送获取模型列表请求失败:`, error);
      setIsLoadingModels(false);
      setModelError(
        error instanceof Error ? error.message : t("fetchModelsFailed"),
      );
    }
  }, [provider.id, providerMeta, form, t, models.length]);

  const fetchModelsRef = useRef(fetchModels);
  fetchModelsRef.current = fetchModels;

  // 10. Per user feedback, disable automatic model fetching when API key/URL changes.
  // Model fetching should only happen on initial load (handled by the effect below).

  // 10.1 新增：当组件加载或提供商变更时，主动触发模型列表加载
  // 这确保每次打开配置时都会尝试加载模型列表
  useEffect(() => {
    if (providerMeta?.features.streaming) {
      console.log(`[ProviderConfigForm] 组件加载/提供商变更，主动触发模型加载`);
      // 重置最后获取的配置记录，确保新 provider 会触发请求
      lastFetchedConfigRef.current = null;
      // 清空当前模型列表，避免显示旧数据
      setModels([]);
      setModelError(null);
      setIsLoadingModels(false);

      // 延迟加载，确保组件完全初始化
      const timer = setTimeout(() => {
        fetchModelsRef.current();
      }, 300);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.id]);

  // 10.2 Auto-fetch when API Key or Base URL changes (Debounced)
  const watchedApiKey = (watchedValues as Record<string, unknown>).apiKey;
  const watchedBaseUrl = (watchedValues as Record<string, unknown>).baseUrl;
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
  }, [watchedApiKey, watchedBaseUrl, providerMeta?.features.streaming]);

  // 11. 清理资源
  useEffect(() => {
    return () => {
      if (pendingFetchRef.current) {
        clearTimeout(pendingFetchRef.current);
      }
      // 重置配置记录，避免下次组件复用时跳过请求
      lastFetchedConfigRef.current = null;
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
            key={i18n.language} // 语言切换时强制重新渲染
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
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    fetchModelsRef.current();
                  }}
                  disabled={isLoadingModels}
                  title={t("refreshModels")}
                  className="shrink-0"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 mr-2 ${isLoadingModels ? "animate-spin" : ""}`}
                  />
                  {t("detectModels")}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <VSCodeDropdown
                className="flex-1"
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
                  }) as any
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
                    (model: {
                      id: string;
                      name?: string;
                      category?: string;
                    }) => {
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
            </div>
            {modelError && (
              <div
                className="flex items-start gap-2 p-2 rounded text-xs break-all whitespace-pre-wrap"
                style={{
                  backgroundColor: "hsl(var(--destructive) / 0.1)",
                  color: "hsl(var(--destructive))",
                  border: "1px solid hsl(var(--destructive) / 0.3)",
                }}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{modelError}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Form>
  );
};
