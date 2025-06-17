import React from "react";
import {
  Select as ArcoSelect,
  Input as ArcoInput,
  Typography,
  Button as ArcoButton,
} from "@arco-design/web-react";
import { SettingItem, ConfigValueType } from "./types";

interface CodeIndexSettingsProps {
  settings: SettingItem[];
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

const CodeIndexSettings: React.FC<CodeIndexSettingsProps> = ({
  settings,
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
  const getSettingValue = (key: string, defaultValue: ConfigValueType = "") => {
    const setting = settings.find((s) => s.key === key);
    // Return setting value if found, otherwise return the default value from the schema, or an empty string.
    const value = setting?.value ?? defaultValue;
    return String(value ?? "");
  };

  const [embeddingModel, setEmbeddingModel] = React.useState("");

  React.useEffect(() => {
    setEmbeddingModel("");
  }, [settings]);

  return (
    <div className="container max-w-3xl mx-auto space-y-8">
      <div className="container max-w-3xl mx-auto space-y-8">
        <div className="p-4 border rounded-lg shadow-sm bg-card md:p-6 space-y-3">
          <Typography.Text
            style={{
              fontSize: "16px",
              display: "block",
              marginBottom: "4px",
            }}
          >
            嵌入提供商
          </Typography.Text>
          <ArcoSelect
            style={{ width: "100%" }}
            placeholder="选择嵌入提供商"
            onChange={(value) => {
              setSelectedEmbeddingProvider(value as string);
              setHasChanges(true);
            }}
            value={selectedEmbeddingProvider}
          >
            {embeddingProviders.map(
              (provider: { key: string; label: string }) => (
                <ArcoSelect.Option
                  key={provider.key}
                  value={provider.key}
                >
                  {provider.label}
                </ArcoSelect.Option>
              )
            )}
          </ArcoSelect>
        </div>
      </div>

      <div className="container max-w-3xl mx-auto space-y-8">
        <div className="p-4 border rounded-lg shadow-sm bg-card md:p-6 space-y-3">
          <Typography.Text
            style={{
              fontSize: "16px",
              display: "block",
              marginBottom: "4px",
            }}
          >
            模型选择
          </Typography.Text>
          <ArcoSelect
            style={{ width: "100%" }}
            placeholder="选择模型"
            onChange={(value) => {
              setEmbeddingModel(value as string);
              // onSettingChange("experimental.codeIndex.embeddingModel", value);
              setHasChanges(true);
            }}
            value={embeddingModel}
          >
            {/* 模型选项将根据所选的嵌入提供商动态加载 */}
            {processedModels.map((model) => (
              <ArcoSelect.Option
                key={model}
                value={model}
              >
                {model}
              </ArcoSelect.Option>
            ))}
          </ArcoSelect>
        </div>
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
          value={getSettingValue(
            "experimental.codeIndex.qdrantUrl",
            "http://localhost:6333"
          )}
          onChange={(value) =>
            onSettingChange("experimental.codeIndex.qdrantUrl", value)
          }
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
          value={getSettingValue("experimental.codeIndex.qdrantKey", "")}
          onChange={(value) =>
            onSettingChange("experimental.codeIndex.qdrantKey", value)
          }
          placeholder="Qdrant Key"
        />
      </div>

      <div className="flex justify-between">
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
    </div>
  );
};

export default CodeIndexSettings;
