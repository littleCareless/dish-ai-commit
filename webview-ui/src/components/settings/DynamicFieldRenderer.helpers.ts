import { FieldConfig } from "@/types/provider-metadata";

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
  t: (key: string) => string;
}

/**
 * Custom equality function for React.memo to prevent unnecessary re-renders
 */
export const fieldPropsEqual = (
  prevProps: DynamicFieldRendererProps,
  nextProps: DynamicFieldRendererProps,
): boolean => {
  return (
    prevProps.field.key === nextProps.field.key &&
    prevProps.value === nextProps.value &&
    JSON.stringify(prevProps.formValues) ===
      JSON.stringify(nextProps.formValues) &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.className === nextProps.className
  );
};
