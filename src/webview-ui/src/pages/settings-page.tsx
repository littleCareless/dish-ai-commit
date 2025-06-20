import React, { useState, useMemo, useEffect } from "react";
import {
  Layout,
  Button as ArcoButton,
  PageHeader,
  Alert,
} from "@arco-design/web-react";
import "@arco-design/web-react/dist/css/arco.css";
import { Save } from "lucide-react";
import { vscode } from "@/lib/vscode";
import SettingsMenu from "./setting/SettingsMenu";
import SettingsContent from "./setting/SettingsContent";
import { useMessageHandler } from "./setting/useMessageHandler";
import { menuItemsConfig } from "./setting/menuConfig";
import { ConfigValueType, SettingItem } from "./setting/types";

const ollamaEmbeddingModels = [
  { key: "nomic-embed-text", label: "nomic-embed-text" },
  { key: "mbai-embed-large", label: "mbai-embed-large" },
  { key: "all-minilm", label: "all-minilm" },
];

const openaiEmbeddingModels = [
  { key: "text-embedding-3-small", label: "text-embedding-3-small" },
  { key: "text-embedding-3-large", label: "text-embedding-3-large" },
  { key: "text-embedding-ada-002", label: "text-embedding-ada-002" },
];

const SettingsPage: React.FC = () => {
  const {
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
    indexingError,
  } = useMessageHandler();

  const [selectedMenuItemKey, setSelectedMenuItemKey] = useState<string>(
    menuItemsConfig[0].key
  );
  const [selectedEmbeddingProvider, setSelectedEmbeddingProvider] =
    useState<string>("");
  const [saveDisabled, setSaveDisabled] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<SettingItem[]>([]);

  useEffect(() => {
    if (settingsSchema.length > 0 && !hasChanges) {
      setOriginalSettings(JSON.parse(JSON.stringify(settingsSchema)));
    }
  }, [settingsSchema, hasChanges]);
 
   useEffect(() => {
    const providerSetting = settingsSchema.find(
      (s) => s.key === "codeIndexing.embeddingProvider"
    );
    if (providerSetting?.value) {
      setSelectedEmbeddingProvider(providerSetting.value as string);
    }
  }, [settingsSchema]);

  const handleSettingChange = (key: string, value: ConfigValueType) => {
    setSettingsSchema((prev) =>
      prev.map((setting) =>
        setting.key === key ? { ...setting, value } : setting
      )
    );
    setHasChanges(true);

    if (key === "codeIndexing.embeddingProvider") {
      setSelectedEmbeddingProvider(value as string);
    }
  };

  const handleSaveSettings = () => {
    const settingsToSave = settingsSchema.map(
      ({ key, value, fromPackageJSON }) => ({
        key,
        value,
        fromPackageJSON,
      })
    );
    if (vscode) {
      vscode.postMessage({ command: "saveSettings", data: settingsToSave });
    }
  };

  const hasEmbeddingSettingsChanged = () => {
    if (originalSettings.length === 0) return false;

    const keysToCompare = [
      "codeIndexing.embeddingProvider",
      "codeIndexing.ollama.embeddingModel",
      "codeIndexing.openai.embeddingModel",
      "experimental.codeIndex.qdrantUrl",
    ];

    for (const key of keysToCompare) {
      const originalSetting = originalSettings.find((s) => s.key === key);
      const currentSetting = settingsSchema.find((s) => s.key === key);

      if (
        originalSetting &&
        currentSetting &&
        originalSetting.value !== currentSetting.value
      ) {
        return true;
      }
    }

    return false;
  };

  const handleClearIndex = () => {
    if (vscode) {
      vscode.postMessage({ command: "clearIndex" });
    }
  };
 
  const handleStartIndexing = () => {
    setIsIndexing(true);
    if (vscode) {
      const clearIndex = !!isIndexed && hasEmbeddingSettingsChanged();
      vscode.postMessage({
        command: "startIndexing",
        data: {
          reIndex: !!isIndexed,
          clearIndex,
        },
      });
    }
  };

  const embeddingProviders = useMemo(() => {
    const providerSetting = settingsSchema.find(
      (s) => s.key === "codeIndexing.embeddingProvider"
    );
    if (providerSetting?.enum) {
      return providerSetting.enum.map((p: string) => ({
        key: p,
        label: p,
      }));
    }
    return [];
  }, [settingsSchema]);

  const embeddingModels = useMemo(() => {
    if (selectedEmbeddingProvider === "Ollama") {
      return ollamaEmbeddingModels.map((model) => model.key);
    }
    if (selectedEmbeddingProvider === "OpenAI") {
      return openaiEmbeddingModels.map((model) => model.key);
    }
    return [];
  }, [selectedEmbeddingProvider]);

  const embeddingSettingsChanged = hasEmbeddingSettingsChanged();
 
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
        width={150}
        collapsed={false}
        collapsible
        style={{
          background: "var(--color-bg-2)",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        <SettingsMenu
          selectedMenuItemKey={selectedMenuItemKey}
          setSelectedMenuItemKey={setSelectedMenuItemKey}
        />
      </Layout.Sider>
      <Layout.Content style={{ display: "flex", flexDirection: "column" }}>
        <PageHeader
          title="设置"
          style={{
            background: "var(--color-bg-2)",
            padding: "12px 0px",
            borderBottom: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
          extra={
            <div style={{ display: "flex", alignItems: "center" }}>
              {hasChanges && (
                <Alert
                  type="warning"
                  content="有未保存的更改"
                  style={{ marginRight: 8 }}
                />
              )}
              <ArcoButton
                type="primary"
                onClick={handleSaveSettings}
                disabled={!hasChanges || saveDisabled}
                icon={<Save size={16} />}
              >
                保存
              </ArcoButton>
            </div>
          }
        />
        <div style={{ flexGrow: 1, overflowY: "auto", padding: "24px" }}>
          <SettingsContent
            selectedMenuItemKey={selectedMenuItemKey}
            settingsSchema={settingsSchema}
            isIndexed={isIndexed}
            isIndexing={isIndexing}
            indexingProgress={indexingProgress}
            indexedCount={indexedCount}
            totalCount={totalCount}
            indexingError={indexingError}
            selectedEmbeddingProvider={selectedEmbeddingProvider}
            embeddingSettingsChanged={embeddingSettingsChanged}
            setSelectedEmbeddingProvider={setSelectedEmbeddingProvider}
            embeddingProviders={embeddingProviders}
            processedModels={embeddingModels}
            handleClearIndex={handleClearIndex}
            handleStartIndexing={handleStartIndexing}
            onSettingChange={handleSettingChange}
            setHasChanges={setHasChanges}
            setSaveDisabled={setSaveDisabled}
          />
        </div>
      </Layout.Content>
    </Layout>
  );
};

export default SettingsPage;
