import { FormControl, FormItem, FormLabel } from "@/components/ui/form";
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import { Loader } from "lucide-react";
import { TFunction } from "i18next";
import React from "react";
import { DynamicFieldRenderer } from "./DynamicFieldRenderer";
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
  t: TFunction;
}

interface LoadingFieldRendererProps extends DynamicFieldRendererProps {
  isLoading?: boolean;
  loadingText?: string;
}

/**
 * 带加载状态的字段渲染器
 */
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
