import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
import React from "react";

interface SelectProps {
  value?: string;
  onChange?: (event: React.FormEvent<HTMLElement>) => void;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
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
  ...props
}) => {
  const handleInput = (event: React.FormEvent<HTMLElement>) => {
    if (onChange) {
      onChange(event);
    }
    if (onValueChange) {
      onValueChange((event.target as HTMLSelectElement)?.value || "");
    }
  };

  return (
    <VSCodeDropdown
      value={value}
      onInput={handleInput}
      disabled={disabled}
      className={className}
      {...props}
    >
      {children}
    </VSCodeDropdown>
  );
};

const SelectOption: React.FC<SelectOptionProps> = ({ value, children }) => {
  return <VSCodeOption value={value}>{children}</VSCodeOption>;
};

export {
  Select,
  Select as SelectContent,
  SelectOption as SelectItem,
  SelectOption,
  Select as SelectTrigger,
  Select as SelectValue,
};
