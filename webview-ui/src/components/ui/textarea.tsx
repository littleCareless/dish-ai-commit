import { VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
import React from "react";

interface TextareaProps {
  id?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  rows?: number;
  onChange?: (event: any) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  className?: string;
  ref?: React.Ref<any>;
}

const Textarea: React.FC<TextareaProps> = ({
  id,
  value,
  placeholder,
  disabled = false,
  readOnly = false,
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
      readOnly={readOnly}
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
