import { Button } from "@/components/ui/button";
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
    // Avoid synchronous setState directly inside effects.
    queueMicrotask(() => {
      setLocalHeaders((prevHeaders) =>
        JSON.stringify(newHeaders) === JSON.stringify(prevHeaders)
          ? prevHeaders
          : newHeaders,
      );
    });
  }, [value]);

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
        <Button
          type="button"
          onClick={handleAddRow}
          disabled={disabled}
          variant="ghost"
          size="icon"
          style={{ color: "hsl(var(--primary))" }}
          className="hover:opacity-80"
          title={
            field.placeholder
              ? t(field.placeholder)
              : t("keyValue.addHeader", { ns: "settings-page" })
          }
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
        </Button>
      </div>

      {localHeaders.length === 0 ? (
        <div className="text-sm text-muted-foreground py-2">
          {t("keyValue.noHeaders", { ns: "settings-page" })}
        </div>
      ) : (
        <div className="space-y-2">
          {localHeaders.map(([key, val], index) => (
            <div key={index} className="flex items-center gap-2">
              <VSCodeTextField
                value={key}
                onChange={(e: any) => handleUpdate(index, e.target.value, val)}
                onInput={(e: any) => handleUpdate(index, e.target.value, val)}
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
                onChange={(e: any) => handleUpdate(index, key, e.target.value)}
                onInput={(e: any) => handleUpdate(index, key, e.target.value)}
                placeholder={
                  field.helpText
                    ? t(field.helpText).split("|")[1]
                    : "Header Value"
                }
                className="flex-1"
                disabled={disabled}
              />
              <Button
                type="button"
                onClick={() => handleRemove(index)}
                disabled={disabled}
                variant="ghost"
                size="icon"
                style={{ color: "hsl(var(--destructive))" }}
                className="hover:opacity-80"
                title={t("common.delete", { ns: "common" })}
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
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
