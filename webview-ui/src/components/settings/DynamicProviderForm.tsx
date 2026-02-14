/**
 * 动态提供商表单渲染器
 * 根据元数据自动生成表单字段
 */

import {
  DynamicProviderFormProps,
  FieldMetadata,
  FieldType,
  ValidationResult,
} from "@/types/provider-metadata";
import { validationEngine } from "@/utils/validation-engine";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

// UI 组件导入
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  VSCodeCheckbox,
  VSCodeDropdown,
  VSCodeOption,
} from "@vscode/webview-ui-toolkit/react";
import { AlertCircle, CheckCircle, ExternalLink } from "lucide-react";

// 滑块组件（需要安装 @radix-ui/react-slider）
import { Slider } from "@/components/ui/slider";

export const DynamicProviderForm: React.FC<DynamicProviderFormProps> = ({
  metadata,
  config,
  onChange,
  onValidate,
  disabled = false,
}) => {
  const { t } = useTranslation("settings-page");
  const [validationResults, setValidationResults] = useState<
    ValidationResult[]
  >([]);
  const [isValidating, setIsValidating] = useState(false);

  // 验证所有字段
  const validateAllFields = useCallback(async () => {
    setIsValidating(true);
    try {
      const results = await validationEngine.validateAll(metadata, config);
      setValidationResults(results);
      return results;
    } finally {
      setIsValidating(false);
    }
  }, [metadata, config]);

  // 验证单个字段
  const validateField = useCallback(
    async (field: FieldMetadata, value: string | number | boolean) => {
      const result = await validationEngine.validateField(field, value);
      setValidationResults((prev) => {
        const filtered = prev.filter((r) => r.field !== field.key);
        return [...filtered, result];
      });
      return result;
    },
    [],
  );

  // 字段值变化处理
  const handleFieldChange = useCallback(
    async (field: FieldMetadata, value: string | number | boolean) => {
      try {
        // 更新配置
        onChange(field.key, value);

        // 验证字段
        if (onValidate) {
          await onValidate(field.key, value);
        } else {
          await validateField(field, value);
        }
      } catch (error) {
        console.error(`Failed to handle field change for ${field.key}:`, error);
        // 显示字段验证错误
        setValidationResults((prev) => {
          const filtered = prev.filter((r) => r.field !== field.key);
          return [
            ...filtered,
            {
              field: field.key,
              valid: false,
              errors: [
                t("providerForm.updateFailed", {
                  error:
                    error instanceof Error
                      ? error.message
                      : t("errors.unknownError", { ns: "settings-page" }),
                }),
              ],
            },
          ];
        });
      }
    },
    [onChange, onValidate, t, validateField],
  );

  // 初始验证
  useEffect(() => {
    validateAllFields();
  }, [validateAllFields]);

  // 获取字段值
  const getFieldValue = (field: FieldMetadata): string | number | boolean => {
    return (config.customFields?.[field.key] ??
      (config as unknown as Record<string, string | number | boolean>)[
        field.key
      ] ??
      field.defaultValue ??
      "") as string | number | boolean;
  };

  // 获取字段错误
  const getFieldErrors = (fieldKey: string): string[] => {
    const result = validationResults.find((r) => r.field === fieldKey);
    return result?.errors || [];
  };

  // 检查字段是否应该显示
  const shouldShowField = (field: FieldMetadata): boolean => {
    if (!field.conditional) return true;
    const conditionField = metadata.fields.find(
      (f) => f.key === field.conditional!.field,
    );
    if (!conditionField) return true;
    const conditionValue = getFieldValue(conditionField);
    return conditionValue === field.conditional!.value;
  };

  // 渲染字段
  const renderField = (field: FieldMetadata) => {
    if (!shouldShowField(field)) return null;

    const value = getFieldValue(field);
    const errors = getFieldErrors(field.key);
    const hasError = errors.length > 0;

    const commonProps = {
      disabled: disabled || field.disabled,
      placeholder: field.placeholder,
    };

    const fieldElement = (() => {
      switch (field.type) {
        case FieldType.TEXT:
        case FieldType.URL:
          return (
            <Input
              {...commonProps}
              type={field.type === FieldType.URL ? "url" : "text"}
              value={String(value)}
              onChange={(e: any) =>
                handleFieldChange(field, (e.target as HTMLInputElement).value)
              }
            />
          );

        case FieldType.PASSWORD:
          return (
            <Input
              {...commonProps}
              type="password"
              value={String(value)}
              onChange={(e: any) =>
                handleFieldChange(field, (e.target as HTMLInputElement).value)
              }
            />
          );

        case FieldType.NUMBER:
          return (
            <Input
              {...commonProps}
              type="text"
              value={String(value)}
              onChange={(e: any) =>
                handleFieldChange(
                  field,
                  Number((e.target as HTMLInputElement).value),
                )
              }
            />
          );

        case FieldType.SELECT:
          return (
            <VSCodeDropdown
              value={String(value)}
              onChange={(e: any) =>
                handleFieldChange(field, (e.target as HTMLInputElement).value)
              }
              disabled={disabled || field.disabled}
            >
              {field.options?.map((option) => (
                <VSCodeOption
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </VSCodeOption>
              ))}
            </VSCodeDropdown>
          );

        case FieldType.SLIDER:
          return (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{field.min ?? 0}</span>
                <span className="font-medium">{value}</span>
                <span>{field.max ?? 100}</span>
              </div>
              <Slider
                value={[Number(value)]}
                onChange={(e: any) =>
                  handleFieldChange(
                    field,
                    Number((e.target as HTMLInputElement).value),
                  )
                }
                min={field.min ?? 0}
                max={field.max ?? 100}
                step={field.step ?? 1}
                disabled={disabled || field.disabled}
                className="w-full"
              />
            </div>
          );

        case FieldType.CHECKBOX:
          return (
            <VSCodeCheckbox
              checked={Boolean(value)}
              onChange={(e: any) =>
                handleFieldChange(field, (e.target as HTMLInputElement).checked)
              }
              disabled={disabled || field.disabled}
            >
              {field.label}
            </VSCodeCheckbox>
          );

        case FieldType.PATH:
          return (
            <div className="flex space-x-2">
              <Input
                {...commonProps}
                type="text"
                value={String(value)}
                onChange={(e: any) =>
                  handleFieldChange(field, (e.target as HTMLInputElement).value)
                }
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // 这里应该打开文件选择对话框
                  console.log("Open file picker for:", field.key);
                }}
                disabled={disabled || field.disabled}
              >
                {t("providerForm.browse")}
              </Button>
            </div>
          );

        case FieldType.TEXTAREA:
          return (
            <textarea
              {...commonProps}
              value={String(value)}
              onChange={(e) =>
                handleFieldChange(
                  field,
                  (e.target as HTMLTextAreaElement).value,
                )
              }
              rows={field.rows ?? 3}
              className={`w-full px-3 py-2 border rounded-md resize-none ${
                hasError ? "border-red-500" : "border-input"
              }`}
            />
          );

        default:
          return (
            <Input
              {...commonProps}
              type="text"
              value={value as string}
              onChange={(e: any) =>
                handleFieldChange(field, (e.target as HTMLInputElement).value)
              }
            />
          );
      }
    })();

    return (
      <div key={field.key} className="flex flex-col space-y-2">
        {field.type !== FieldType.CHECKBOX && (
          <Label
            htmlFor={field.key}
            className={
              field.required
                ? 'after:content-["*"] after:text-red-500 after:ml-1'
                : ""
            }
          >
            {field.label}
          </Label>
        )}

        {fieldElement}

        {field.helpText && (
          <p className="text-sm text-muted-foreground">{field.helpText}</p>
        )}

        {hasError && (
          <div className="flex items-center space-x-1 text-red-500 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{errors[0]}</span>
          </div>
        )}
      </div>
    );
  };

  // 分组字段（基础设置和高级设置）
  const basicFields = metadata.fields.filter(
    (field) =>
      !field.key.includes("advanced") &&
      !field.key.includes("custom") &&
      !field.key.includes("timeout") &&
      !field.key.includes("retries"),
  );

  const advancedFields = metadata.fields.filter(
    (field) =>
      field.key.includes("advanced") ||
      field.key.includes("custom") ||
      field.key.includes("timeout") ||
      field.key.includes("retries"),
  );

  return (
    <div className="space-y-6">
      {/* 基础设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>{t("providerForm.basicSettings")}</span>
            {isValidating && (
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {basicFields.map(renderField)}
        </CardContent>
      </Card>

      {/* 高级设置 */}
      {advancedFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("providerForm.advancedSettings")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {advancedFields.map(renderField)}
          </CardContent>
        </Card>
      )}

      {/* 验证状态 */}
      {validationResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>{t("providerForm.validationStatus")}</span>
              {validationResults.every((r) => r.valid) ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {validationResults.every((r) => r.valid) ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("providerForm.validationPassed")}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {validationResults
                  .filter((r) => !r.valid)
                  .map((result) => (
                    <Alert key={result.field} variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{result.field}:</strong>{" "}
                        {result.errors.join(", ")}
                      </AlertDescription>
                    </Alert>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 文档链接 */}
      {metadata.documentation && (
        <Card>
          <CardHeader>
            <CardTitle>{t("providerForm.relatedDocs")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metadata.documentation.setup && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(metadata.documentation!.setup, "_blank")
                  }
                  className="w-full justify-start"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t("providerForm.setupGuide")}
                </Button>
              )}
              {metadata.documentation.apiReference && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(metadata.documentation!.apiReference, "_blank")
                  }
                  className="w-full justify-start"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t("providerForm.apiReference")}
                </Button>
              )}
              {metadata.documentation.examples && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(metadata.documentation!.examples, "_blank")
                  }
                  className="w-full justify-start"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t("providerForm.examples")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
