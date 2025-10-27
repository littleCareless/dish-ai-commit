import React from "react";
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";

interface SwitchProps {
  checked?: boolean;
  disabled?: boolean;
  onChange?: (event: CustomEvent) => void;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch: React.FC<SwitchProps> = ({
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

export { Switch };
