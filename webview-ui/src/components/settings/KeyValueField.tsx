import { FieldConfig } from "@/types/provider-metadata";
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import { TFunction } from "i18next";
import React from "react";

type FieldValue =
  | string
  | number
  | boolean
  | Record<string, string>
  | null
  | undefined;

interface KeyValueFieldProps {
  value: FieldValue;
  onChange: (value: Record<string, string>) => void;
  disabled?: boolean;
  field: FieldConfig;
  t: TFunction;
}

export const KeyValueField: React.FC<KeyValueFieldProps> = ({
  value,
  onChange,
  disabled = false,
  field,
  t,
}) => {
  const [localHeaders, setLocalHeaders] = React.useState<[string, string][]>(
    () => {
      return value && typeof value === "object" && !Array.isArray(value)
        ? Object.entries(value as Record<string, string>)
        : [];
    },
  );

  React.useEffect(() => {
    const newHeaders =
      value && typeof value === "object" && !Array.isArray(value)
        ? Object.entries(value as Record<string, string>)
        : [];
    // Avoid unnecessary re-renders if the value hasn't changed
    if (JSON.stringify(newHeaders) !== JSON.stringify(localHeaders)) {
      setLocalHeaders(newHeaders);
    }
  }, [value, localHeaders]);

  const handleAddRow = () => {
    const newHeaders = [...localHeaders, ["", ""] as [string, string]];
    setLocalHeaders(newHeaders);
  };

  const handleUpdate = (index: number, key: string, val: string) => {
    const newHeaders = [...localHeaders];
    newHeaders[index] = [key, val];
    setLocalHeaders(newHeaders);
    const newValue = Object.fromEntries(
      newHeaders.filter(([k]) => k.trim() !== ""),
    );
    onChange(newValue);
  };

  const handleRemove = (index: number) => {
    const newHeaders = localHeaders.filter((_, i) => i !== index);
    setLocalHeaders(newHeaders);
    const newValue = Object.fromEntries(
      newHeaders.filter(([k]) => k.trim() !== ""),
    );
    onChange(newValue);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t(field.label)}</span>
        <button
          type="button"
          onClick={handleAddRow}
          disabled={disabled}
          className="flex items-center justify-center w-6 h-6 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={field.placeholder ? t(field.placeholder) : "添加请求头"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 3.5V12.5M3.5 8H12.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {localHeaders.length === 0 ? (
        <div className="text-sm text-muted-foreground py-2">
          暂无自定义标头。点击 + 按钮添加。
        </div>
      ) : (
        <div className="space-y-2">
          {localHeaders.map(([key, val], index) => (
            <div key={index} className="flex items-center gap-2">
              <VSCodeTextField
                value={key}
                onChange={(e: Event) =>
                  handleUpdate(index, (e.target as HTMLInputElement).value, val)
                }
                placeholder={
                  field.helpText
                    ? t(field.helpText).split("|")[0]
                    : "Header Name"
                }
                className="flex-1"
                disabled={disabled}
              />
              <VSCodeTextField
                value={val}
                onChange={(e: Event) =>
                  handleUpdate(index, key, (e.target as HTMLInputElement).value)
                }
                placeholder={
                  field.helpText
                    ? t(field.helpText).split("|")[1]
                    : "Header Value"
                }
                className="flex-1"
                disabled={disabled}
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                disabled={disabled}
                className="flex items-center justify-center w-6 h-6 text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="删除"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13 3L3 13M3 3L13 13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
