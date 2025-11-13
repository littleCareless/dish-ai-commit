import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import React from "react";

interface SwitchProps {
  checked?: boolean;
  disabled?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch: React.FC<SwitchProps> = ({
  checked = false,
  disabled = false,
  onChange,
  onCheckedChange,
  ...props
}) => {
  const handleChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    console.log(
      `[Switch.handleChange] Event triggered for checkbox, checked: ${target.checked}`,
    );

    if (onChange) {
      onChange(event as unknown as React.ChangeEvent<HTMLInputElement>);
    }

    const newChecked = target.checked;
    onCheckedChange?.(newChecked);
    console.log(
      `[Switch.handleChange] onChange and onCheckedChange callbacks invoked with value: ${newChecked}`,
    );
  };

  return (
    <VSCodeCheckbox
      checked={checked}
      disabled={disabled}
      onChange={handleChange as any}
      {...props}
    />
  );
};

export { Switch };
