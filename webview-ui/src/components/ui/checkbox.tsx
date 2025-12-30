import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import React from "react";

interface CheckboxProps {
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  className?: string;
  onChange?: (event: any) => void;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox: React.FC<CheckboxProps> = ({
  checked = false,
  indeterminate = false,
  disabled = false,
  onChange,
  onCheckedChange,
  className = "",
}) => {
  const handleChange = (event: any) => {
    // VSCodeCheckbox 使用 currentTarget.checked 而不是 target.checked
    const isChecked =
      (event.currentTarget as { checked?: boolean })?.checked ??
      (event.target as { checked?: boolean })?.checked ??
      false;
    console.log("Checkbox changed:", isChecked);
    onChange?.(event);
    onCheckedChange?.(isChecked);
  };

  return (
    <VSCodeCheckbox
      checked={checked}
      indeterminate={indeterminate}
      disabled={disabled}
      onChange={handleChange}
      className={className}
    />
  );
};

export { Checkbox };
