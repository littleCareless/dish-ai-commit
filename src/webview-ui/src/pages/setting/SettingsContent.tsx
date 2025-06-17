import React from "react";
import CodeIndexSettings from "./CodeIndexSettings";
import { SettingItem, ConfigValueType } from "./types";
import { menuItemsConfig } from "./menuConfig";
import {
  Form,
  Input,
  Switch,
  Select,
  Typography,
} from "@arco-design/web-react";

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
}

const SettingsContent: React.FC<SettingsContentProps> = ({
  selectedMenuItemKey,
  settingsSchema,
  isIndexed,
  isIndexing,
  indexingProgress,
  indexedCount,
  totalCount,
  selectedEmbeddingProvider,
  setSelectedEmbeddingProvider,
  embeddingProviders,
  processedModels,
  handleClearIndex,
  handleStartIndexing,
  onSettingChange,
  setHasChanges,
}) => {
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

  if (selectedMenuItemKey === "experimental.codeIndex") {
    return (
      <CodeIndexSettings
        settings={settingsSchema}
        isIndexed={isIndexed}
        isIndexing={isIndexing}
        indexingProgress={indexingProgress}
        indexedCount={indexedCount}
        totalCount={totalCount}
        selectedEmbeddingProvider={selectedEmbeddingProvider}
        setSelectedEmbeddingProvider={setSelectedEmbeddingProvider}
        embeddingProviders={embeddingProviders}
        processedModels={processedModels}
        handleClearIndex={handleClearIndex}
        handleStartIndexing={handleStartIndexing}
        onSettingChange={onSettingChange}
        setHasChanges={setHasChanges}
      />
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
          <Input
            value={value as string}
            onChange={(val) => handleChange(val)}
          />
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
    </div>
  );
};

export default SettingsContent;
