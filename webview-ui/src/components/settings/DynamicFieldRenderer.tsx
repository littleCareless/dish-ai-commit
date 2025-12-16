/**
 * 动态字段渲染器
 * 根据 provider-registry.ts 中的字段配置动态渲染表单控件
 */

import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FieldConfig, FieldType } from "@/types/provider-metadata";
import {
  shouldShowField,
  validateFieldValue,
} from "@/utils/validation-helpers";
import {
  VSCodeDropdown,
  VSCodeOption,
  VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react";
import { TFunction } from "i18next";
import { AlertCircle, Loader } from "lucide-react";
import React, { ChangeEvent, useMemo } from "react";
import { KeyValueField } from "./KeyValueField";

type FieldValue =
  | string
  | number
  | boolean
  | Record<string, string>
  | null
  | undefined;

interface DynamicFieldRendererProps {
  field: FieldConfig;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  formValues?: Record<string, FieldValue>;
  disabled?: boolean;
  className?: string;
  t: TFunction;
}

const fieldPropsEqual = (
  prevProps: DynamicFieldRendererProps,
  nextProps: DynamicFieldRendererProps,
) => {
  // ✅ 只在这些属性改变时重新渲染
  return (
    prevProps.field.key === nextProps.field.key &&
    prevProps.value === nextProps.value &&
    JSON.stringify(prevProps.formValues) ===
      JSON.stringify(nextProps.formValues) &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.className === nextProps.className
    // onChange 引用可能变化，但不需要比较
  );
};

export const DynamicFieldRenderer: React.FC<DynamicFieldRendererProps> =
  React.memo(
    ({ field, value, onChange, formValues = {}, className = "", t }) => {
      // ✅ 仅在开发环境且配置了条件时输出日志
      if (process.env.NODE_ENV === "development" && field.conditional) {
        const shouldShow = shouldShowField(field, formValues);
        if (!shouldShow) {
          console.debug(
            `[DynamicFieldRenderer] Skipping hidden field: ${field.key} (conditional check failed)`,
          );
          return null;
        }
      }

      // 检查条件显示
      const shouldShow = shouldShowField(field, formValues);

      if (!shouldShow) {
        return null;
      }

      // 验证字段值
      // 对于可选字段，空值不应该显示验证错误
      const isEmpty =
        value === undefined ||
        value === null ||
        value === "" ||
        (typeof value === "object" && Object.keys(value).length === 0);

      const shouldValidate = field.required || !isEmpty;
      const validation = shouldValidate
        ? validateFieldValue(field, value)
        : { isValid: true };
      const hasError = !validation.isValid;

      // 渲染字段标签
      const renderLabel = () => (
        <FormLabel className="flex items-center gap-1">
          {t(field.label)}
          {field.required && <span className="text-red-500">*</span>}
        </FormLabel>
      );

      // 渲染帮助文本
      const renderHelpText = () => {
        if (field.helpText) {
          return <FormDescription>{t(field.helpText)}</FormDescription>;
        }
        return null;
      };

      // 渲染错误信息
      const renderError = () => {
        if (hasError && validation.error) {
          return (
            <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950 rounded text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{t(validation.error)}</span>
            </div>
          );
        }
        return null;
      };

      // 渲染字段控件
      const renderFieldControl = () => {
        // 只使用字段本身的 disabled 属性，忽略父组件的 disabled 状态
        // 因为提供商是通过配置文件切换来控制的，不需要运行时启用/禁用
        const isFieldDisabled = field.disabled || false;

        switch (field.type) {
          case FieldType.PASSWORD:
            return (
              <VSCodeTextField
                value={String(value || "")}
                onChange={(e: React.FormEvent<HTMLInputElement>) =>
                  onChange((e.target as HTMLInputElement).value)
                }
                onInput={(e: React.FormEvent<HTMLInputElement>) =>
                  onChange((e.target as HTMLInputElement).value)
                }
                placeholder={
                  field.placeholder ? t(field.placeholder) : `${t(field.label)}`
                }
                type="password"
                disabled={isFieldDisabled}
              />
            );

          case FieldType.TEXT:
            return (
              <VSCodeTextField
                value={String(value || "")}
                onChange={(e: React.FormEvent<HTMLInputElement>) =>
                  onChange((e.target as HTMLInputElement).value)
                }
                onInput={(e: React.FormEvent<HTMLInputElement>) =>
                  onChange((e.target as HTMLInputElement).value)
                }
                placeholder={
                  field.placeholder ? t(field.placeholder) : `${t(field.label)}`
                }
                disabled={isFieldDisabled}
              />
            );

          case FieldType.URL:
            return (
              <VSCodeTextField
                value={String(value || "")}
                onChange={(e: React.FormEvent<HTMLInputElement>) =>
                  onChange((e.target as HTMLInputElement).value)
                }
                onInput={(e: React.FormEvent<HTMLInputElement>) =>
                  onChange((e.target as HTMLInputElement).value)
                }
                placeholder={
                  field.placeholder
                    ? t(field.placeholder)
                    : "https://api.example.com"
                }
                disabled={isFieldDisabled}
              />
            );

          case FieldType.NUMBER:
            return (
              <VSCodeTextField
                value={String(value?.toString() || "")}
                onChange={(e: React.FormEvent<HTMLInputElement>) => {
                  const numValue = parseFloat(
                    (e.target as HTMLInputElement).value,
                  );
                  onChange(isNaN(numValue) ? 0 : numValue);
                }}
                onInput={(e: React.FormEvent<HTMLInputElement>) => {
                  const numValue = parseFloat(
                    (e.target as HTMLInputElement).value,
                  );
                  onChange(isNaN(numValue) ? 0 : numValue);
                }}
                placeholder={field.placeholder ? t(field.placeholder) : "0"}
                disabled={isFieldDisabled}
              />
            );

          case FieldType.SELECT:
            return (
              <VSCodeDropdown
                value={String(value || "")}
                onChange={(e: React.FormEvent<HTMLInputElement>) =>
                  onChange((e.target as HTMLInputElement).value)
                }
                disabled={isFieldDisabled}
              >
                <VSCodeOption value="">
                  {field.placeholder ? t(field.placeholder) : "请选择"}
                </VSCodeOption>
                {field.options?.map((option) => (
                  <VSCodeOption key={option.value} value={option.value}>
                    {t(option.label)}
                  </VSCodeOption>
                ))}
              </VSCodeDropdown>
            );

          case FieldType.CHECKBOX: {
            const checkboxValue = value || false;
            const isCheckboxDisabled = field.disabled || false;

            return (
              <div className="flex items-center gap-3">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={!!checkboxValue}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      onChange(e.target.checked)
                    }
                    disabled={isCheckboxDisabled}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </FormControl>
                <div className="flex flex-col gap-1">
                  <FormLabel className="text-sm font-medium mb-0">
                    {t(field.label)}
                    {field.required && <span className="text-red-500">*</span>}
                  </FormLabel>
                  {field.helpText && (
                    <FormDescription className="text-xs">
                      {t(field.helpText)}
                    </FormDescription>
                  )}
                </div>
              </div>
            );
          }

          case FieldType.SLIDER: {
            const min =
              field.validation?.find((r) => r.type === "min")?.min || 0;
            const max =
              field.validation?.find((r) => r.type === "max")?.max || 100;
            const step = field.step || 1;

            return (
              <div className="space-y-2">
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={String(value || min)}
                  onChange={(e) => onChange(parseFloat(e.target.value))}
                  disabled={isFieldDisabled}
                  className="w-full"
                />
                <div className="text-sm text-muted-foreground text-center">
                  {typeof value === "number" ? value : min}
                </div>
              </div>
            );
          }

          case FieldType.TEXTAREA:
            return (
              <textarea
                value={String(value || "")}
                onChange={(e) => onChange(e.target.value)}
                placeholder={
                  field.placeholder ? t(field.placeholder) : `${t(field.label)}`
                }
                disabled={isFieldDisabled}
                rows={field.rows || 3}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            );

          case FieldType.KEY_VALUE_LIST:
            return (
              <KeyValueField
                value={value}
                onChange={(newValue) => onChange(newValue)}
                disabled={isFieldDisabled}
                field={field}
                t={t}
              />
            );

          case FieldType.INFO_BLOCK:
            return (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                <div className="flex items-start">
                  <div className="flex-1">
                    {field.defaultValue &&
                    typeof field.defaultValue === "string" ? (
                      <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                        {field.defaultValue.split("\n").map((line, index) => (
                          <li key={index}>{t(line)}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </div>
            );

          case FieldType.CUSTOM:
            if (field.customRenderer) {
              return field.customRenderer({
                value: value,
                onChange: (v: unknown) => onChange(v as FieldValue),
                disabled: isFieldDisabled,
                field,
              });
            }
            return (
              <div className="text-sm text-muted-foreground">
                自定义字段渲染器未定义
              </div>
            );

          default:
            return (
              <VSCodeTextField
                value={String(value || "")}
                onChange={(e: React.FormEvent<HTMLInputElement>) =>
                  onChange((e.target as HTMLInputElement).value)
                }
                onInput={(e: React.FormEvent<HTMLInputElement>) =>
                  onChange((e.target as HTMLInputElement).value)
                }
                placeholder={
                  field.placeholder ? t(field.placeholder) : `${t(field.label)}`
                }
                disabled={isFieldDisabled}
              />
            );
        }
      };

      return (
        <FormItem className={className}>
          {field.type !== FieldType.CHECKBOX &&
            field.type !== FieldType.KEY_VALUE_LIST &&
            renderLabel()}
          <FormControl>{renderFieldControl()}</FormControl>
          {field.type !== FieldType.CHECKBOX &&
            field.type !== FieldType.KEY_VALUE_LIST &&
            renderHelpText()}
          {renderError()}
          <FormMessage />
        </FormItem>
      );
    },
    fieldPropsEqual,
  );

/**
 * 批量渲染字段组
 */
interface DynamicFieldGroupProps {
  fields: FieldConfig[];
  values: Record<string, FieldValue>;
  onChange: (fieldKey: string, value: FieldValue) => void;
  disabled?: boolean;
  className?: string;
  t: TFunction;
}

export const DynamicFieldGroup: React.FC<DynamicFieldGroupProps> = React.memo(
  ({ fields, values, onChange, disabled = false, className = "", t }) => {
    // ✅ 仅在开发模式下输出调试信息
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DynamicFieldGroup] Rendering ${fields.length} fields`);
    }

    // ✅ 使用 useMemo 缓存渲染的字段，避免不必要的重新渲染
    const renderedFields = useMemo(
      () =>
        fields.map((field) => (
          <DynamicFieldRenderer
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={(value) => onChange(field.key, value)}
            formValues={values}
            disabled={disabled}
            t={t}
          />
        )),
      [fields, values, onChange, disabled, t],
    );

    // 如果没有字段，不渲染任何东西
    if (fields.length === 0) {
      return null;
    }

    return <div className={`space-y-4 ${className}`}>{renderedFields}</div>;
  },
);

/**
 * 带加载状态的字段渲染器
 */
interface LoadingFieldRendererProps extends DynamicFieldRendererProps {
  isLoading?: boolean;
  loadingText?: string;
}

export const LoadingFieldRenderer: React.FC<LoadingFieldRendererProps> = ({
  isLoading = false,
  loadingText = "加载中...",
  ...props
}) => {
  if (isLoading) {
    return (
      <FormItem>
        <FormLabel className="flex items-center gap-2">
          {props.field.label}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader className="w-3 h-3 animate-spin" />
            {loadingText}
          </div>
        </FormLabel>
        <FormControl>
          <VSCodeTextField value="" disabled={true} placeholder="正在加载..." />
        </FormControl>
      </FormItem>
    );
  }

  return <DynamicFieldRenderer {...props} />;
};
