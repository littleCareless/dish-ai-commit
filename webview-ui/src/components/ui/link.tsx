import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import React from "react";

const Link = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<typeof VSCodeLink>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
>((props, ref) => <VSCodeLink {...props} ref={ref as any} />);

export { Link };
