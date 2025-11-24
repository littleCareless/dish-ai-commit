import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import React from "react";

interface InputProps {
  id?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  type?: "text" | "password" | "email" | "url" | "tel";
  onChange?: (event: React.FormEvent<HTMLElement>) => void;
  maxLength?: number;
  className?: string;
}

const Input: React.FC<InputProps> = ({
  id,
  value,
  placeholder,
  disabled = false,
  readOnly = false,
  type = "text",
  onChange,
  maxLength,
  ...props
}) => {
  const handleInput = (event: React.FormEvent<HTMLElement>) => {
    if (onChange) {
      onChange(event);
    }
  };

  return (
    <VSCodeTextField
      id={id}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      type={type}
      onInput={handleInput as any}
      maxlength={maxLength}
      {...props}
    />
  );
};

export { Input };
