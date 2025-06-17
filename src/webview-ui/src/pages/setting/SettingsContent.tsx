import React from "react";
import { vscode } from "@/lib/vscode";
import { SettingItem, ConfigValueType } from "./types";
import { menuItemsConfig } from "./menuConfig";
import {
  Form,
  Input,
  Switch,
  Select,
  Typography,
  Button as ArcoButton,
  Message,
} from "@arco-design/web-react";
import { IconCheckCircle, IconCloseCircle } from "@arco-design/web-react/icon";

interface SettingsContentProps {
  selectedMenuItemKey: string;
  settingsSchema: SettingItem[];
  isIndexed: number;
  isIndexing: boolean;
  indexingProgress: string;
  indexedCount: number;
  totalCount: number;
  selectedEmbeddingProvider: string;
  setSelectedEmbeddingProvider: (value: string) => void;
  embeddingProviders: { key: string; label: string }[];
  processedModels: string[];
  handleClearIndex: () => void;
  handleStartIndexing: () => void;
  onSettingChange: (key: string, value: ConfigValueType) => void;
  setHasChanges: (value: boolean) => void;
  setSaveDisabled: (value: boolean) => void;
}

const SettingsContent: React.FC<SettingsContentProps> = ({
  selectedMenuItemKey,
  settingsSchema,
  isIndexed,
  isIndexing,
  indexingProgress,
  indexedCount,
  totalCount,
  // selectedEmbeddingProvider,
  // setSelectedEmbeddingProvider,
  // embeddingProviders,
  // processedModels,
  handleClearIndex,
  handleStartIndexing,
  onSettingChange,
  setHasChanges,
  setSaveDisabled,
}) => {
  const [connectionStatus, setConnectionStatus] = React.useState<{
    [key: string]: "untested" | "testing" | "success" | "failed";
  }>({});

  const handleTestConnection = (key: string, value: string) => {
    const service = key.includes("ollama")
      ? "ollama"
      : key.includes("qdrant")
      ? "qdrant"
      : "";
    if (service) {
      setConnectionStatus((prev) => ({ ...prev, [key]: "testing" }));
      vscode.postMessage({
        command: "testConnection",
        data: { service, url: value, key },
      });
    }
  };

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === "testConnectionResult") {
        const newStatus = {
          ...connectionStatus,
          [message.data.key]: message.data.success ? "success" : "failed",
        };
        setConnectionStatus(newStatus);

        const hasFailedConnection = Object.values(newStatus).includes("failed");
        setSaveDisabled(hasFailedConnection);

        if (message.data.success) {
          Message.success(
            `${message.data.service} connection test successful.`
          );
        } else {
          Message.error(
            `${message.data.service} connection test failed: ${message.data.error}`
          );
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [connectionStatus, setSaveDisabled]);

  const displayedSettings = React.useMemo(() => {
    if (!settingsSchema) return [];
    return settingsSchema.filter((setting) =>
      setting.key.startsWith(selectedMenuItemKey + ".")
    );
  }, [settingsSchema, selectedMenuItemKey]);

  console.log(
    "displayedSettings",
    displayedSettings,
    settingsSchema,
    selectedMenuItemKey
  );

  if (settingsSchema.length === 0) {
    return (
      <div className="text-center text-muted-foreground mt-10">
        <p>No settings available or failed to load settings.</p>
        <p>Please ensure the extension is configured correctly.</p>
      </div>
    );
  }

  if (
    displayedSettings.length === 0 &&
    selectedMenuItemKey !== "providers" &&
    selectedMenuItemKey !== "features" &&
    selectedMenuItemKey !== "experimental.codeIndex"
  ) {
    return (
      <div className="text-center text-muted-foreground mt-10">
        <p>
          No settings found for "
          {menuItemsConfig
            .find(
              (i) =>
                i.key === selectedMenuItemKey ||
                i.children?.find((c) => c.key === selectedMenuItemKey)
            )
            ?.children?.find((c) => c.key === selectedMenuItemKey)?.label ||
            menuItemsConfig.find((i) => i.key === selectedMenuItemKey)?.label}
          ".
        </p>
      </div>
    );
  }

  const renderSetting = (setting: SettingItem) => {
    const { key, type, description, value, enum: enumOptions } = setting;

    const handleChange = (newValue: ConfigValueType) => {
      onSettingChange(key, newValue);
      setHasChanges(true);
    };

    return (
      <Form.Item
        key={key}
        label={description}
        extra={
          setting.markdownDescription && (
            <Typography.Text type="secondary">
              {setting.markdownDescription}
            </Typography.Text>
          )
        }
      >
        {type === "string" && (
          <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
            <Input
              value={value as string}
              onChange={(val) => handleChange(val)}
              style={{ flex: 1 }}
            />
            {(key === "providers.ollama.url" ||
              key === "experimental.codeIndex.qdrantUrl") && (
              <ArcoButton
                onClick={() => handleTestConnection(key, value as string)}
                style={{ marginLeft: 8 }}
                loading={connectionStatus[key] === "testing"}
              >
                Test
              </ArcoButton>
            )}
            {connectionStatus[key] === "success" && (
              <IconCheckCircle
                style={{ color: "green", marginLeft: 8, fontSize: 18 }}
              />
            )}
            {connectionStatus[key] === "failed" && (
              <IconCloseCircle
                style={{ color: "red", marginLeft: 8, fontSize: 18 }}
              />
            )}
          </div>
        )}
        {type === "boolean" && (
          <Switch
            checked={value as boolean}
            onChange={handleChange}
          />
        )}
        {type === "number" && (
          <Input
            type="number"
            value={String(value)}
            onChange={(val) => handleChange(Number(val))}
          />
        )}
        {type === "enum" && enumOptions && (
          <Select
            value={value as string}
            onChange={handleChange}
          >
            {enumOptions.map((option) => (
              <Select.Option
                key={option}
                value={option}
              >
                {option}
              </Select.Option>
            ))}
          </Select>
        )}
      </Form.Item>
    );
  };

  return (
    <div className="container max-w-3xl mx-auto space-y-8 p-4">
      <Form layout="vertical">{displayedSettings.map(renderSetting)}</Form>
      {selectedMenuItemKey === "experimental.codeIndex" && (
        <>
          <div className="flex justify-between mt-4">
            <ArcoButton
              onClick={handleClearIndex}
              disabled={!isIndexed || isIndexing}
            >
              清除索引数据
            </ArcoButton>
            <ArcoButton
              type="primary"
              onClick={handleStartIndexing}
              disabled={isIndexing}
            >
              {isIndexing ? "Indexing..." : isIndexed ? "重新索引" : "开始索引"}
            </ArcoButton>
          </div>
          {isIndexing && (
            <div className="text-center text-muted-foreground mt-2">
              正在处理文件: {indexingProgress} ({indexedCount} / {totalCount})
            </div>
          )}
          {/* 显示索引状态 */}
          <div className="text-center text-muted-foreground mt-2">
            {isIndexed ? "代码库已建立索引" : "代码库尚未建立索引"}
          </div>
        </>
      )}
    </div>
  );
};

export default SettingsContent;
