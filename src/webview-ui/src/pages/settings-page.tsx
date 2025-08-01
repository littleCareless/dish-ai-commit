import React, { useState, useEffect } from "react";
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
import { ConfigValueType, SettingItem } from "./setting/types";

const SettingsPage: React.FC = () => {
  const {
    settingsSchema,
    setSettingsSchema,
    embeddingModels,
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

  const [selectedMenuItemKey, setSelectedMenuItemKey] = useState<string>("base");
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
      (s) => s.key === "experimental.codeIndex.embeddingProvider"
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

    if (key === "experimental.codeIndex.embeddingProvider") {
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
      //  && hasEmbeddingSettingsChanged()
      const clearIndex = !!isIndexed;
      vscode.postMessage({
        command: "startIndexing",
        data: {
          reIndex: !!isIndexed,
          clearIndex,
        },
      });
    }
  };


  const embeddingSettingsChanged = hasEmbeddingSettingsChanged();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg">Loading settings...</p>
      </div>
    );
  }

  return (
    <Layout style={{ height: "100vh", backgroundColor: "var(--color-background)" }}>
      <Layout.Sider
        width={150}
        collapsed={false}
        collapsible
        style={{
          background: "var(--color-card)",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        <SettingsMenu
          selectedMenuItemKey={selectedMenuItemKey}
          setSelectedMenuItemKey={setSelectedMenuItemKey}
          settingsSchema={settingsSchema}
        />
      </Layout.Sider>
      <Layout.Content style={{ display: "flex", flexDirection: "column", backgroundColor: "var(--color-background)" }}>
        <PageHeader
          title="设置"
          style={{
            background: "var(--color-card)",
            padding: "12px 0px",
            borderBottom: "1px solid var(--color-border)",
            flexShrink: 0,
            color: "var(--color-foreground)",
          }}
          extra={
            <div style={{ display: "flex", alignItems: "center" }}>
              {hasChanges && (
                <Alert
                  type="warning"
                  content="有未保存的更改"
                  style={{ marginRight: 8, backgroundColor: "var(--color-muted)", color: "var(--color-foreground)" }}
                />
              )}
              <ArcoButton
                type="primary"
                onClick={handleSaveSettings}
                disabled={!hasChanges || saveDisabled}
                icon={<Save size={16} />}
                style={{
                  backgroundColor: "var(--color-primary)",
                  borderColor: "var(--color-primary)",
                  color: "var(--color-primary-foreground)",
                }}
              >
                保存
              </ArcoButton>
            </div>
          }
        />
        <div style={{ flexGrow: 1, overflowY: "auto", padding: "24px", backgroundColor: "var(--color-background)", color: "var(--color-foreground)" }}>
          <SettingsContent
            selectedMenuItemKey={selectedMenuItemKey}
            settingsSchema={settingsSchema}
            isIndexed={isIndexed}
            isIndexing={isIndexing}
            indexingProgress={indexingProgress}
            indexedCount={indexedCount}
            totalCount={totalCount}
            indexingError={indexingError}
            embeddingModels={embeddingModels || []}
            selectedEmbeddingProvider={selectedEmbeddingProvider}
            setSelectedEmbeddingProvider={setSelectedEmbeddingProvider}
            embeddingSettingsChanged={embeddingSettingsChanged}
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
