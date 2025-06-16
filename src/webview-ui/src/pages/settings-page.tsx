/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useMemo } from "react"; // React import for SettingsPage
import {
  Layout,
  Menu as ArcoMenu,
  Select as ArcoSelect,
  Input as ArcoInput,
  Switch as ArcoSwitch,
  InputNumber as ArcoInputNumber,
  Typography,
  Button as ArcoButton, // Specifically for SettingsPage save button
  PageHeader, // Added for SettingsPage header
} from "@arco-design/web-react";
import "@arco-design/web-react/dist/css/arco.css";

import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { vscode } from "@/lib/vscode";

// Define a more specific type for setting values
type ConfigValueType = string | number | boolean | undefined | null | object;

// Define the structure of a setting item

interface SettingItem {
  key: string;
  type: string;
  default: ConfigValueType;
  description: string;
  enum?: string[];
  value: ConfigValueType;
  markdownDescription?: string; // Added for more detailed descriptions
}

// Settings Page Component
const SettingsPage: React.FC = () => {
  const [settingsSchema, setSettingsSchema] = useState<SettingItem[]>([
    {
      key: "experimental.codeIndex.ollamaUrl",
      type: "string",
      default: "http://localhost:11434",
      description: "Ollama URL",
      value: "http://localhost:11434",
    },
    {
      key: "experimental.codeIndex.qdrantUrl",
      type: "string",
      default: "http://localhost:6333",
      description: "Qdrant URL",
      value: "http://localhost:6333",
    },
    {
      key: "experimental.codeIndex.qdrantKey",
      type: "string",
      default: "",
      description: "Qdrant Key",
      value: "",
    },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [hasChanges, setHasChanges] = useState(false);
  const [dynamicModels, setDynamicModels] = useState<{
    [modelSettingKey: string]: string[] | null | undefined;
  }>({});

  // Hardcoded menu structure based on CONFIG_SCHEMA
  // Setting keys are expected to be like "base.language", "providers.openai.apiKey", "features.codeAnalysis.simplifyDiff"
  const menuItemsConfig = useMemo(
    () => [
      { key: "base", label: "基本设置" },
      {
        key: "providers", // Parent key, not directly for filtering settings
        label: "提供商设置",
        children: [
          { key: "providers.openai", label: "OpenAI" },
          { key: "providers.ollama", label: "Ollama" },
          { key: "providers.zhipu", label: "智谱AI (Zhipu)" },
          { key: "providers.dashscope", label: "灵积 (DashScope)" },
          { key: "providers.doubao", label: "豆包 (Doubao)" },
          { key: "providers.gemini", label: "Gemini" },
          { key: "providers.deepseek", label: "Deepseek" },
          { key: "providers.siliconflow", label: "Siliconflow" },
          { key: "providers.openrouter", label: "OpenRouter" },
        ],
      },
      {
        key: "features", // Parent key
        label: "功能特性",
        children: [
          { key: "features.codeAnalysis", label: "代码分析" },
          { key: "features.commitFormat", label: "提交格式" },
          { key: "features.commitMessage", label: "提交信息生成" },
          { key: "features.weeklyReport", label: "周报生成" },
          { key: "features.codeReview", label: "代码审查" },
          { key: "features.branchName", label: "分支名称生成" },
          { key: "features.prSummary", label: "PR摘要" },
        ],
      },
      {
        key: "experimental",
        label: "实验性功能",
        children: [{ key: "experimental.codeIndex", label: "代码库索引" }],
      },
    ],
    []
  );

  // State for code index settings
  const [ollamaUrl, setOllamaUrl] = useState<string>("http://localhost:11434");
  const [qdrantUrl, setQdrantUrl] = useState<string>("http://localhost:6333");
  const [qdrantKey, setQdrantKey] = useState<string>("");
  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  const [indexingProgress, setIndexingProgress] = useState<string>("");
  const [indexedCount, setIndexedCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isIndexed, setIsIndexed] = useState<number>(0); // 添加 isIndexed 状态变量

  const [selectedMenuItemKey, setSelectedMenuItemKey] = useState<string>(
    menuItemsConfig[0].key
  ); // Default to "base"

  useEffect(() => {
    if (vscode) {
      vscode.postMessage({ command: "getSettings" });
    } else {
      console.warn("vscode API not available at the time of getSettings call.");
    }

    const handleMessage = (event: MessageEvent) => {
      console.log("handleMessage", event);
      const message = event.data;
      if (!message || !message.command) {
        return;
      }
      switch (message.command) {
        case "indexingProgress": {
          setIndexingProgress(message.data.message);
          setIndexedCount(message.data.current);
          setTotalCount(message.data.total);
          break;
        }
        case "loadSettings":
          {
            const loadedSchema = message.data.schema || [];
            const isIndexed = message.data.isIndexed || 0; // 获取索引状态
            setIsIndexed(isIndexed);
            setSettingsSchema(loadedSchema);
            setIsLoading(false);
            setHasChanges(false); // Reset changes on load
            console.log("getModelsForProvider for base.model");
            // Trigger initial model fetch for base.model based on base.provider
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
                  // Ensure providerId is not empty
                  console.log(
                    `Initial load: Fetching models for ${modelSettingKey} due to ${baseProviderSetting.key}=${providerId}`
                  );
                  vscode.postMessage({
                    command: "getModelsForProvider",
                    data: {
                      providerId: providerId,
                      modelSettingKey: modelSettingKey,
                      providerContextKey: `providers.${providerId.toLowerCase()}`,
                    },
                  });
                  setDynamicModels((prev) => ({
                    ...prev,
                    [modelSettingKey]: null, // Set to loading
                  }));
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
          // Handle successful model loading
          const rawModels = message.data.models;
          let processedModels: string[];

          // Define a more specific type for model items
          type ModelItem = {
            id: string | number;
            name?: string;
            [key: string]: unknown;
          };

          if (Array.isArray(rawModels) && rawModels.length > 0) {
            // Case 1: Models data is an array of items
            const firstModelItem = rawModels[0];
            if (typeof firstModelItem === "string") {
              // Subcase 1.1: Array of strings
              processedModels = rawModels as string[];
            } else if (
              typeof firstModelItem === "object" &&
              firstModelItem !== null &&
              "id" in firstModelItem
            ) {
              // Subcase 1.2: Array of model objects (e.g., {id: '...', name: '...'})
              // Extract 'id' for the Select options. The Select will display these IDs.
              processedModels = rawModels.map((model: ModelItem) =>
                String(model.id)
              );
            } else {
              // Subcase 1.3: Array of something unexpected
              console.warn(
                `Received models for ${message.data.modelSettingKey} in an unexpected array item format:`,
                rawModels
              );
              processedModels = [];
            }
          } else if (
            typeof rawModels === "object" &&
            rawModels !== null &&
            "id" in rawModels
          ) {
            // Case 2: Models data is a single model object
            processedModels = [String((rawModels as ModelItem).id)];
          } else {
            // Case 3: Covers empty array, null, undefined, or other unexpected formats
            if (
              rawModels !== null &&
              rawModels !== undefined &&
              !Array.isArray(rawModels)
            ) {
              // Log if it's an unexpected non-array, non-object type that isn't null/undefined
              console.warn(
                `Received models for ${message.data.modelSettingKey} in an unexpected format:`,
                rawModels
              );
            }
            processedModels = []; // Default to empty array
          }

          setDynamicModels((prev) => ({
            ...prev,
            [message.data.modelSettingKey]: processedModels,
          }));
          break;
        }
        case "getModelsForProviderError": // Handle model loading error
          toast({
            title: "Error loading models",
            description: `Could not load models for ${message.data.modelSettingKey}: ${message.error}`,
            variant: "destructive",
          });
          setDynamicModels((prev) => ({
            ...prev,
            [message.data.modelSettingKey]: [], // Treat error as no models available
          }));
          break;
        case "settingsSaved":
          toast({
            title: "Settings Saved",
            description: "Your settings have been saved successfully.",
          });
          setHasChanges(false); // Reset changes on save
          if (vscode) {
            // Re-fetch to confirm and get updated values, especially if defaults were applied
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
          break;
        case "indexingFailed":
          setIsIndexing(false);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [toast]);

  const handleSettingChange = (key: string, value: ConfigValueType) => {
    setSettingsSchema((prevSchema) =>
      prevSchema.map((setting) =>
        setting.key === key ? { ...setting, value: value } : setting
      )
    );
    setHasChanges(true);

    // If base.provider changes, fetch models for base.model
    if (key === "base.provider") {
      const providerId = String(value);
      const modelSettingKey = "base.model";

      // Always reset base.model value when provider changes
      setSettingsSchema((prevSchema) =>
        prevSchema.map((setting) =>
          setting.key === modelSettingKey
            ? { ...setting, value: "" } // Reset model value
            : setting
        )
      );

      if (providerId && vscode) {
        // Only fetch if a provider is selected
        const modelSettingExists = settingsSchema.some(
          (s) => s.key === modelSettingKey
        );

        if (modelSettingExists) {
          console.log(
            `Base provider setting ${key} changed to ${providerId}. Fetching models for ${modelSettingKey}`
          );
          vscode.postMessage({
            command: "getModelsForProvider",
            data: {
              providerId: providerId,
              modelSettingKey: modelSettingKey,
              providerContextKey: `providers.${providerId.toLowerCase()}`,
            },
          });
          setDynamicModels((prev) => ({ ...prev, [modelSettingKey]: null })); // Set to loading
        }
      } else {
        // Provider is cleared, so clear models for base.model
        setDynamicModels((prev) => ({ ...prev, [modelSettingKey]: undefined }));
      }
    } else if (key === "experimental.codeIndex.ollamaUrl") {
      setOllamaUrl(String(value));
    } else if (key === "experimental.codeIndex.qdrantUrl") {
      setQdrantUrl(String(value));
    } else if (key === "experimental.codeIndex.qdrantKey") {
      setQdrantKey(String(value));
    }
  };

  const handleSaveSettings = () => {
    const settingsToSave = settingsSchema.map(({ key, value }) => ({
      key,
      value,
    }));
    if (vscode) {
      vscode.postMessage({ command: "saveSettings", data: settingsToSave });
    }
  };

  const handleClearIndex = () => {
    // Implement clear index logic here
    console.log("Clear index data");
  };

  const handleStartIndexing = () => {
    setIsIndexing(true);
    // Implement start indexing logic here
    console.log("Start indexing");

    if (vscode) {
      vscode.postMessage({ command: "startIndexing" });
    }
  };

  const displayedSettings = useMemo(() => {
    if (!settingsSchema) return [];
    // Filter settings based on the selected menu item key (which acts as a prefix)
    // e.g., if selectedMenuItemKey is "base", show settings like "base.language"
    // e.g., if selectedMenuItemKey is "providers.openai", show "providers.openai.apiKey"
    return settingsSchema.filter((setting) =>
      setting.key.startsWith(selectedMenuItemKey + ".")
    );
  }, [settingsSchema, selectedMenuItemKey]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg">Loading settings...</p>
      </div>
    );
  }

  return (
    <Layout style={{ height: "100vh" }}>
      <Layout.Sider
        width={150} // Controlled by collapsed state
        collapsed={false} // Make sider collapsed
        collapsible
        // collapsedWidth={60} // Optional: default is 48
        style={{
          background: "var(--color-bg-2)",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        <ArcoMenu
          selectedKeys={[selectedMenuItemKey]}
          onClickMenuItem={(key) => setSelectedMenuItemKey(key)}
          style={{ width: "100%", height: "100%" }}
          // defaultOpenKeys={['providers', 'features']} // Optionally open parent menus
          collapse={false} // Menu will auto-collapse if Sider is collapsed
        >
          {menuItemsConfig.map((item) =>
            item.children ? (
              <ArcoMenu.SubMenu
                key={item.key}
                title={<span>{item.label}</span>}
              >
                {item.children.map((child) => (
                  <ArcoMenu.Item key={child.key}>{child.label}</ArcoMenu.Item>
                ))}
              </ArcoMenu.SubMenu>
            ) : (
              <ArcoMenu.Item key={item.key}>{item.label}</ArcoMenu.Item>
            )
          )}
        </ArcoMenu>
      </Layout.Sider>
      <Layout.Content style={{ display: "flex", flexDirection: "column" }}>
        <PageHeader
          title="设置"
          style={{
            background: "var(--color-bg-2)",
            padding: "16px 24px",
            borderBottom: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
          extra={
            <ArcoButton
              type="primary"
              onClick={handleSaveSettings}
              disabled={!hasChanges}
              icon={<Save size={16} />}
            >
              保存
            </ArcoButton>
          }
        />
        <div style={{ flexGrow: 1, overflowY: "auto", padding: "24px" }}>
          <div className="container max-w-3xl mx-auto space-y-8">
            {/* Old header (lines 212-221) is removed */}

            {settingsSchema.length === 0 && !isLoading && (
              <div className="text-center text-muted-foreground mt-10">
                <p>No settings available or failed to load settings.</p>
                <p>Please ensure the extension is configured correctly.</p>
              </div>
            )}

            {settingsSchema.length > 0 &&
              displayedSettings.length === 0 &&
              !isLoading &&
              selectedMenuItemKey !== "providers" &&
              selectedMenuItemKey !== "features" && (
                <div className="text-center text-muted-foreground mt-10">
                  <p>
                    No settings found for "
                    {menuItemsConfig
                      .find(
                        (i) =>
                          i.key === selectedMenuItemKey ||
                          i.children?.find((c) => c.key === selectedMenuItemKey)
                      )
                      ?.children?.find((c) => c.key === selectedMenuItemKey)
                      ?.label ||
                      menuItemsConfig.find((i) => i.key === selectedMenuItemKey)
                        ?.label}
                    ".
                  </p>
                </div>
              )}

            {selectedMenuItemKey === "experimental.codeIndex" && (
              <div className="container max-w-3xl mx-auto space-y-8">
                <div className="p-4 border rounded-lg shadow-sm bg-card md:p-6 space-y-3">
                  <Typography.Text
                    style={{
                      fontSize: "16px",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Ollama URL
                  </Typography.Text>
                  <ArcoInput
                    style={{ width: "100%" }}
                    value={ollamaUrl}
                    onChange={(value) => setOllamaUrl(value)}
                    placeholder="http://localhost:11434"
                  />
                </div>

                <div className="p-4 border rounded-lg shadow-sm bg-card md:p-6 space-y-3">
                  <Typography.Text
                    style={{
                      fontSize: "16px",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Qdrant URL
                  </Typography.Text>
                  <ArcoInput
                    style={{ width: "100%" }}
                    value={qdrantUrl}
                    onChange={(value) => setQdrantUrl(value)}
                    placeholder="http://localhost:6333"
                  />
                </div>

                <div className="p-4 border rounded-lg shadow-sm bg-card md:p-6 space-y-3">
                  <Typography.Text
                    style={{
                      fontSize: "16px",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Qdrant Key
                  </Typography.Text>
                  <ArcoInput
                    style={{ width: "100%" }}
                    value={qdrantKey}
                    onChange={(value) => setQdrantKey(value)}
                    placeholder="Qdrant Key"
                  />
                </div>

                <div className="flex justify-between">
                  <ArcoButton onClick={handleClearIndex}>
                    清除索引数据
                  </ArcoButton>
                  <ArcoButton
                    type="primary"
                    onClick={handleStartIndexing}
                    disabled={isIndexing}
                  >
                    {isIndexing ? "Indexing..." : "开始索引"}
                  </ArcoButton>
                </div>
                {/* {indexingProgress && (
                  <div className="text-center text-muted-foreground mt-2">
                    {indexingProgress}
                  </div>
                )} */}
                {isIndexing && (
                  <div className="text-center text-muted-foreground mt-2">
                    正在处理文件: {indexingProgress} ({indexedCount} /{" "}
                    {totalCount})
                  </div>
                )}
                {/* 显示索引状态 */}
                <div className="text-center text-muted-foreground mt-2">
                  {isIndexed}
                  {isIndexed ? "代码库已建立索引" : "代码库尚未建立索引"}
                </div>
              </div>
            )}

            {displayedSettings.map((setting) => (
              <div
                key={setting.key}
                className="p-4 border rounded-lg shadow-sm bg-card md:p-6 space-y-3"
              >
                <Typography.Text
                  style={{
                    fontSize: "16px",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  {setting.key
                    .substring(selectedMenuItemKey.length + 1) // Show only the part after the prefix
                    .split(".")
                    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                    .join(" ")}
                </Typography.Text>
                <p className="text-sm text-muted-foreground">
                  {setting.description || setting.markdownDescription}
                </p>

                {(() => {
                  if (setting.type === "string") {
                    // Handle base.model specifically for dynamic loading
                    if (setting.key === "base.model") {
                      const modelSettingKey = "base.model";
                      const currentModels = dynamicModels
                        ? dynamicModels[modelSettingKey]
                        : undefined;
                      const selectedProvider = settingsSchema.find(
                        (s) => s.key === "base.provider"
                      )?.value;

                      return (
                        <ArcoSelect
                          id={setting.key}
                          style={{ width: "100%" }}
                          value={String(setting.value ?? "")}
                          onChange={(value) =>
                            handleSettingChange(setting.key, value)
                          }
                          placeholder={
                            currentModels === null
                              ? "Loading models..."
                              : !selectedProvider || currentModels === undefined
                              ? "Select a provider first"
                              : currentModels && currentModels.length === 0
                              ? "No models available (check provider config)"
                              : "Select a model"
                          }
                          loading={currentModels === null}
                          disabled={
                            !selectedProvider ||
                            (currentModels === undefined &&
                              currentModels !== null)
                          }
                        >
                          {Array.isArray(currentModels) &&
                            currentModels.map((option) => (
                              <ArcoSelect.Option
                                key={option}
                                value={option}
                              >
                                {option}
                              </ArcoSelect.Option>
                            ))}
                        </ArcoSelect>
                      );
                    }
                    // Standard string rendering for other string types (including enums)
                    else if (setting.enum) {
                      return (
                        <ArcoSelect
                          id={setting.key}
                          style={{ width: "100%" }}
                          value={String(setting.value ?? setting.default ?? "")}
                          onChange={(value) =>
                            handleSettingChange(setting.key, value)
                          }
                          placeholder={
                            setting.default
                              ? String(setting.default)
                              : "Select an option"
                          }
                        >
                          {setting.enum.map((option) => (
                            <ArcoSelect.Option
                              key={option}
                              value={option}
                            >
                              {option}
                            </ArcoSelect.Option>
                          ))}
                        </ArcoSelect>
                      );
                    } else {
                      // Plain string input
                      return (
                        <ArcoInput
                          id={setting.key}
                          style={{ width: "100%" }}
                          value={
                            typeof setting.value === "string" ||
                            typeof setting.value === "number"
                              ? String(setting.value)
                              : ""
                          }
                          onChange={(value) => {
                            handleSettingChange(setting.key, value);
                          }}
                          placeholder={String(setting.default) || ""}
                        />
                      );
                    }
                  } else if (setting.type === "boolean") {
                    return (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <ArcoSwitch
                          id={setting.key}
                          checked={!!setting.value}
                          onChange={(checked) =>
                            handleSettingChange(setting.key, checked)
                          }
                        />
                        <label
                          htmlFor={setting.key}
                          style={{ cursor: "pointer" }}
                        >
                          {setting.value ? "Enabled" : "Disabled"}
                        </label>
                      </div>
                    );
                  } else if (setting.type === "number") {
                    return (
                      <ArcoInputNumber
                        id={setting.key}
                        style={{ width: "100%" }}
                        value={
                          setting.value === undefined || setting.value === null
                            ? undefined
                            : Number(setting.value)
                        }
                        onChange={(value) =>
                          handleSettingChange(setting.key, value)
                        }
                        placeholder={String(setting.default) || ""}
                      />
                    );
                  } else if (setting.type === "object") {
                    return (
                      <div className="p-3 border rounded-md bg-amber-50 border-amber-200">
                        <p className="text-sm text-amber-700">
                          <span className="font-semibold">Note:</span> Object
                          type settings (<code>{setting.key}</code>) are
                          complex. For detailed configuration, please edit them
                          directly in your VS Code <code>settings.json</code>{" "}
                          file.
                        </p>
                      </div>
                    );
                  }
                  return null; // Should not happen if all types are covered
                })()}
              </div>
            ))}

            {/* Old save button (lines 365-383) is removed */}
          </div>
        </div>
      </Layout.Content>
    </Layout>
  );
};

export default SettingsPage;
