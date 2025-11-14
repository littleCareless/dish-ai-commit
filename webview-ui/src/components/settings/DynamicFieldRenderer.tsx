/**
 * 动态字段渲染器
 * 根据 provider-registry.ts 中的字段配置动态渲染表单控件
 */

import {
  VSCodeDropdown,
  VSCodeOption,
  VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react";
import { AlertCircle, Loader } from "lucide-react";
import React, { useMemo } from "react";
import { FieldConfig, FieldType } from "../../types/provider-metadata";
import {
  shouldShowField,
  validateFieldValue,
} from "../../utils/validation-helpers";
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Switch } from "../ui/switch";

type FieldValue = string | number | boolean | null | undefined;

interface DynamicFieldRendererProps {
  field: FieldConfig;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  formValues?: Record<string, FieldValue>;
  disabled?: boolean;
  className?: string;
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
  React.memo(({ field, value, onChange, formValues = {}, className = "" }) => {
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
    const validation = validateFieldValue(field, value);
    const hasError = !validation.isValid;

    // 渲染字段标签
    const renderLabel = () => (
      <FormLabel className="flex items-center gap-1">
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
      </FormLabel>
    );

    // 渲染帮助文本
    const renderHelpText = () => {
      if (field.helpText) {
        return <FormDescription>{field.helpText}</FormDescription>;
      }
      return null;
    };

    // 渲染错误信息
    const renderError = () => {
      if (hasError && validation.error) {
        return (
          <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950 rounded text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{validation.error}</span>
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
              value={value || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange(e.target.value)
              }
              placeholder={field.placeholder || `输入 ${field.label}`}
              type="password"
              disabled={isFieldDisabled}
            />
          );

        case FieldType.TEXT:
          return (
            <VSCodeTextField
              value={value || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange(e.target.value)
              }
              placeholder={field.placeholder || `输入 ${field.label}`}
              disabled={isFieldDisabled}
            />
          );

        case FieldType.URL:
          return (
            <VSCodeTextField
              value={value || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange(e.target.value)
              }
              placeholder={field.placeholder || "https://api.example.com"}
              disabled={isFieldDisabled}
            />
          );

        case FieldType.NUMBER:
          return (
            <VSCodeTextField
              value={value?.toString() || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const numValue = parseFloat(e.target.value) || 0;
                onChange(numValue);
              }}
              placeholder={field.placeholder || "0"}
              disabled={isFieldDisabled}
            />
          );

        case FieldType.SELECT:
          return (
            <VSCodeDropdown
              value={value || ""}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                onChange(e.target.value)
              }
              disabled={isFieldDisabled}
            >
              <VSCodeOption value="">
                {field.placeholder || "请选择"}
              </VSCodeOption>
              {field.options?.map((option) => (
                <VSCodeOption key={option.value} value={option.value}>
                  {option.label}
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
                <Switch
                  checked={!!checkboxValue}
                  onCheckedChange={(newValue) => {
                    console.log(
                      `🔥 [CHECKBOX onChange] ${field.key} changed from ${checkboxValue} to ${newValue}`,
                    );
                    onChange(newValue);
                    console.log(
                      `🔥 [CHECKBOX onChange] called onChange callback`,
                    );
                  }}
                  disabled={isCheckboxDisabled}
                />
              </FormControl>
              <div className="flex flex-col gap-1">
                <FormLabel className="text-sm font-medium mb-0">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                </FormLabel>
                {field.helpText && (
                  <FormDescription className="text-xs">
                    {field.helpText}
                  </FormDescription>
                )}
              </div>
            </div>
          );
        }

        case FieldType.SLIDER: {
          const min = field.validation?.find((r) => r.type === "min")?.min || 0;
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
                {value || min}
              </div>
            </div>
          );
        }

        case FieldType.TEXTAREA:
          return (
            <textarea
              value={String(value || "")}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder || `输入 ${field.label}`}
              disabled={isFieldDisabled}
              rows={field.rows || 3}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          );

        case FieldType.CUSTOM:
          if (field.customRenderer) {
            return field.customRenderer({
              value,
              onChange,
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
              value={value || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange(e.target.value)
              }
              placeholder={field.placeholder || `输入 ${field.label}`}
              disabled={isFieldDisabled}
            />
          );
      }
    };

    return (
      <FormItem className={className}>
        {field.type !== FieldType.CHECKBOX && renderLabel()}
        <FormControl>{renderFieldControl()}</FormControl>
        {field.type !== FieldType.CHECKBOX && renderHelpText()}
        {renderError()}
        <FormMessage />
      </FormItem>
    );
  }, fieldPropsEqual);

/**
 * 批量渲染字段组
 */
interface DynamicFieldGroupProps {
  fields: FieldConfig[];
  values: Record<string, FieldValue>;
  onChange: (fieldKey: string, value: FieldValue) => void;
  disabled?: boolean;
  className?: string;
}

export const DynamicFieldGroup: React.FC<DynamicFieldGroupProps> = React.memo(
  ({ fields, values, onChange, disabled = false, className = "" }) => {
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
          />
        )),
      [fields, values, onChange, disabled],
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
