import React from "react";
import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";

interface SelectProps {
  value?: string;
  onChange?: (event: CustomEvent) => void;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  placeholder?: string;
}

interface SelectOptionProps {
  value: string;
  children: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({ 
  value,
  onChange,
  onValueChange,
  disabled = false,
  children,
  className,
  placeholder,
  ...props 
}) => {
  const handleInput = (event: CustomEvent) => {
    if (onChange) {
      onChange(event);
    }
    if (onValueChange) {
      onValueChange((event.target as HTMLSelectElement)?.value || '');
    }
  };

  return (
    <VSCodeDropdown
      value={value}
      onInput={handleInput}
      disabled={disabled}
      className={className}
      placeholder={placeholder}
      {...props}
    >
      {children}
    </VSCodeDropdown>
  );
};

const SelectOption: React.FC<SelectOptionProps> = ({ value, children }) => {
  return (
    <VSCodeOption value={value}>
      {children}
    </VSCodeOption>
  );
};

export { Select, SelectOption };
export { Select as SelectTrigger, Select as SelectContent, SelectOption as SelectItem, Select as SelectValue };