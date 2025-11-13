import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import React from "react";

interface CheckboxProps extends React.HTMLAttributes<HTMLElement> {
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange?: (event: React.FormEvent<HTMLElement>) => void;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox: React.FC<CheckboxProps> = ({
  checked = false,
  indeterminate = false,
  disabled = false,
  onChange,
  onCheckedChange,
  ...props
}) => {
  const handleChange = (event: React.FormEvent<HTMLElement>) => {
    onChange?.(event);
    onCheckedChange?.((event.target as HTMLInputElement).checked);
  };

  return (
    <VSCodeCheckbox
      checked={checked}
      indeterminate={indeterminate}
      disabled={disabled}
      onInput={handleChange}
      {...props}
    />
  );
};

export { Checkbox };
