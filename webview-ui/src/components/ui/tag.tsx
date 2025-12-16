import { VSCodeTag } from "@vscode/webview-ui-toolkit/react";
import React from "react";

const Tag = React.forwardRef<
  HTMLElement,
  React.ComponentProps<typeof VSCodeTag>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
>((props, ref) => <VSCodeTag {...props} ref={ref as any} />);

export { Tag };
