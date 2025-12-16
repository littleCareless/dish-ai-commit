import { VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
import * as React from "react";

export type TextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "draggable" | "translate"
> & {
  draggable?: boolean;
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      id,
      value,
      placeholder,
      disabled = false,
      readOnly = false,
      rows = 4,
      onChange,
      onKeyDown,
      onInput,
      ...props
    },
    ref,
  ) => {
    return (
      <VSCodeTextArea
        id={id}
        value={value as string}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        rows={rows}
        onInput={(e: any) => {
          onInput?.(e);
        }}
        onChange={(e: any) => {
          onChange?.(e);
        }}
        onKeyDown={onKeyDown}
        className={className}
        ref={ref as any}
        {...(props as any)}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
