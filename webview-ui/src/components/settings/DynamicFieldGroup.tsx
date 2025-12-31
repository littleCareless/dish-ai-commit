import { FieldConfig } from "@/types/provider-metadata";
import { TFunction } from "i18next";
import React, { useEffect, useMemo, useRef } from "react";
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
    // 使用 ref 来存储 onChange，避免依赖项变化导致重新渲染
    const onChangeRef = useRef(onChange);

    // ✅ 使用 useEffect 在 onChange 变化时更新 ref，避免在渲染期间修改 ref
    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    const renderedFields = useMemo(
      () =>
        fields.map((field) => (
          <DynamicFieldRenderer
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={(value) => onChangeRef.current(field.key, value)}
            formValues={values}
            disabled={disabled}
            t={t}
          />
        )),
      [fields, values, disabled, t],
    );

    // 如果没有字段，不渲染任何东西
    if (fields.length === 0) {
      return null;
    }

    return <div className={`space-y-4 ${className}`}>{renderedFields}</div>;
  },
);
