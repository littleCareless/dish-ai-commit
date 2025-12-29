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
  const handleChange = (event: React.FormEvent<HTMLElement>) => {
    console.log("[Select] handleChange called, event:", event);
    const targetValue = (event.target as HTMLSelectElement)?.value || "";
    console.log("[Select] New value:", targetValue, "Current value:", value);

    if (onChange) {
      console.log("[Select] Calling onChange");
      onChange(event);
    }
    if (onValueChange) {
      console.log("[Select] Calling onValueChange with:", targetValue);
      onValueChange(targetValue);
    }
  };

  console.log("[Select] Rendering with value:", value);

  return (
    <VSCodeDropdown
      value={value}
      onChange={handleChange}
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
