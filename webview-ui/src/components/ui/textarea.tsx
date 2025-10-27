import React from "react";
import { VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";

interface TextareaProps {
  id?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  rows?: number;
  onChange?: (event: CustomEvent) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  className?: string;
  ref?: React.Ref<HTMLTextAreaElement>;
}

const Textarea: React.FC<TextareaProps> = ({
  id,
  value,
  placeholder,
  disabled = false,
  readonly = false,
  rows = 4,
  onChange,
  onKeyDown,
  className,
  ref,
  ...props
}) => {
  return (
    <VSCodeTextArea
      id={id}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      readonly={readonly}
      rows={rows}
      onInput={onChange}
      onKeyDown={onKeyDown}
      className={className}
      ref={ref}
      {...props}
    />
  );
};

export { Textarea };
