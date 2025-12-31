import { FieldConfig } from "@/types/provider-metadata";
import { TFunction } from "i18next";

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

/**
 * Custom equality function for React.memo to prevent unnecessary re-renders
 */
export const fieldPropsEqual = (
  prevProps: DynamicFieldRendererProps,
  nextProps: DynamicFieldRendererProps,
): boolean => {
  // 比较基本字段
  const basicEqual =
    prevProps.field.key === nextProps.field.key &&
    prevProps.value === nextProps.value &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.className === nextProps.className;

  if (!basicEqual) {
    return false;
  }

  // 比较 formValues - 使用更高效的比较方式
  const prevValues = prevProps.formValues;
  const nextValues = nextProps.formValues;

  if (!prevValues && !nextValues) return true;
  if (!prevValues || !nextValues) return false;

  const prevKeys = Object.keys(prevValues);
  const nextKeys = Object.keys(nextValues);

  if (prevKeys.length !== nextKeys.length) return false;

  // 只比较当前字段相关的值，避免全量比较
  for (const key of prevKeys) {
    if (prevValues[key] !== nextValues[key]) {
      return false;
    }
  }

  return true;
};
