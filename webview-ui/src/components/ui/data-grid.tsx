import {
  VSCodeDataGrid,
  VSCodeDataGridCell,
  VSCodeDataGridRow,
} from "@vscode/webview-ui-toolkit/react";
import React from "react";

const DataGrid = React.forwardRef<
  HTMLElement,
  React.ComponentProps<typeof VSCodeDataGrid>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
>((props, ref) => <VSCodeDataGrid {...props} ref={ref as any} />);

const DataGridRow = React.forwardRef<
  HTMLElement,
  React.ComponentProps<typeof VSCodeDataGridRow>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
>((props, ref) => <VSCodeDataGridRow {...props} ref={ref as any} />);

const DataGridCell = React.forwardRef<
  HTMLElement,
  React.ComponentProps<typeof VSCodeDataGridCell>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
>((props, ref) => <VSCodeDataGridCell {...props} ref={ref as any} />);

export { DataGrid, DataGridCell, DataGridRow };
