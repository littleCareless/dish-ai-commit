import {
  VSCodeDataGrid,
  VSCodeDataGridCell,
  VSCodeDataGridRow,
} from "@vscode/webview-ui-toolkit/react";
import React from "react";

const DataGrid = React.forwardRef<
  HTMLElement,
  React.ComponentProps<typeof VSCodeDataGrid>
>((props, ref) => <VSCodeDataGrid {...props} ref={ref as any} />);

const DataGridRow = React.forwardRef<
  HTMLElement,
  React.ComponentProps<typeof VSCodeDataGridRow>
>((props, ref) => <VSCodeDataGridRow {...props} ref={ref as any} />);

const DataGridCell = React.forwardRef<
  HTMLElement,
  React.ComponentProps<typeof VSCodeDataGridCell>
>((props, ref) => <VSCodeDataGridCell {...props} ref={ref as any} />);

export { DataGrid, DataGridCell, DataGridRow };
