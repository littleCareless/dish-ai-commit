import { FieldConfig } from "@/types/provider-metadata";
import { TFunction } from "i18next";
import React, { useMemo } from "react";
import { DynamicFieldRenderer } from "./DynamicFieldRenderer";

type FieldValue =
  | string
  | number
  | boolean
  | Record<string, string>
  | null
  | undefined;

interface DynamicFieldGroupProps {
  fields: FieldConfig[];
  values: Record<string, FieldValue>;
  onChange: (fieldKey: string, value: FieldValue) => void;
  disabled?: boolean;
  className?: string;
  t: TFunction;
}

/**
 * 批量渲染字段组
 */
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
