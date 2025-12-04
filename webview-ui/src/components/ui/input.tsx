import { cn } from "@/utils/cn";
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import * as React from "react";

// Update props to not extend HTMLInputElement attributes directly,
// as VSCodeTextField has its own specific props.
// We can be more explicit or use a broader type if needed.
export type InputProps = React.ComponentProps<typeof VSCodeTextField>;

const Input: React.FC<InputProps> = ({ className, type, ...props }) => {
  // We create a handler to forward the change events in a way that react-hook-form expects.
  const handleInput = (event: React.FormEvent<HTMLElement>) => {
    if (props.onInput) {
      // VSCode components use onInput, let's align with that.
      // Forward the event.
      props.onInput(event);
    }
  };

  return (
    <VSCodeTextField
      type={type}
      // We remove conflicting style classes like border, background, and ring properties.
      // VSCodeTextField will handle these styles internally to match the editor's theme.
      // We only keep layout-related classes.
      className={cn("w-full", className)}
      onInput={handleInput}
      {...props}
    />
  );
};
Input.displayName = "Input";

export { Input };
