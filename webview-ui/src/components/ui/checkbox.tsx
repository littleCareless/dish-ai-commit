import React from "react";
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";

interface CheckboxProps {
  checked?: boolean;
  disabled?: boolean;
  onChange?: (event: CustomEvent) => void;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox: React.FC<CheckboxProps> = ({
  checked = false,
  disabled = false,
  onChange,
  onCheckedChange,
  ...props
}) => {
  const handleChange = (event: CustomEvent) => {
    onChange?.(event);
    onCheckedChange?.((event.target as any).checked);
  };

  return (
    <VSCodeCheckbox
      checked={checked}
      disabled={disabled}
      onInput={handleChange}
      {...props}
    />
  );
};

export { Checkbox };
