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
  const handleChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    const targetValue = target?.value || "";

    // 转换为 React.FormEvent 以兼容 onChange
    const reactEvent = event as unknown as React.FormEvent<HTMLElement>;

    if (onChange) {
      onChange(reactEvent);
    }
    if (onValueChange) {
      onValueChange(targetValue);
    }
  };

  return (
    <VSCodeDropdown
      value={value}
      onChange={handleChange as any}
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

export { Select, SelectOption };
