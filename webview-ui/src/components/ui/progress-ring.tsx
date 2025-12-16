import { VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";
import React from "react";

const ProgressRing = React.forwardRef<
  HTMLElement,
  React.ComponentProps<typeof VSCodeProgressRing>
>((props, ref) => <VSCodeProgressRing {...props} ref={ref as any} />);

export { ProgressRing };
