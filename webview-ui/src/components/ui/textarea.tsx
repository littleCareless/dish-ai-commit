import { VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
import * as React from "react";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

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
        onInput={(e: Event) => {
          // Adapt CustomEvent/Event to React.ChangeEvent structure that consumers expect
          onChange?.(e as unknown as React.ChangeEvent<HTMLTextAreaElement>);
        }}
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
