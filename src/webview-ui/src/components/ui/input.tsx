import React from "react";
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react";

interface InputProps {
  id?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  type?: 'text' | 'password' | 'email' | 'number' | 'url';
  onChange?: (event: CustomEvent) => void;
  maxLength?: number;
}

const Input: React.FC<InputProps> = ({ 
  id,
  value,
  placeholder,
  disabled = false,
  readonly = false,
  type = 'text',
  onChange,
  maxLength,
  ...props 
}) => {
  const handleInput = (event: CustomEvent) => {
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
      readonly={readonly}
      type={type}
      onInput={handleInput}
      maxLength={maxLength}
      {...props}
    />
  );
};

export { Input };