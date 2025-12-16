import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import React from "react";

const Link = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<typeof VSCodeLink>
>((props, ref) => <VSCodeLink {...props} ref={ref} />);

export { Link };
