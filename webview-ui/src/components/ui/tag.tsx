import { VSCodeTag } from "@vscode/webview-ui-toolkit/react";
import React from "react";

const Tag = React.forwardRef<any, React.ComponentProps<typeof VSCodeTag>>(
  (props, ref) => <VSCodeTag {...props} ref={ref} />,
);

export { Tag };
