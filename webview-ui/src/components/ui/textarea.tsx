import { VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
import * as React from "react";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<any, TextareaProps>(
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
        onInput={onChange as any}
        onKeyDown={onKeyDown}
        className={className}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
