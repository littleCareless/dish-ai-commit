import {
  VSCodeDataGrid,
  VSCodeDataGridCell,
  VSCodeDataGridRow,
} from "@vscode/webview-ui-toolkit/react";
import React from "react";

const DataGrid = React.forwardRef<
  HTMLElement,
  React.ComponentProps<typeof VSCodeDataGrid>
>((props, ref) => <VSCodeDataGrid {...props} ref={ref} />);

const DataGridRow = React.forwardRef<
  HTMLElement,
  React.ComponentProps<typeof VSCodeDataGridRow>
>((props, ref) => <VSCodeDataGridRow {...props} ref={ref} />);

const DataGridCell = React.forwardRef<
  HTMLElement,
  React.ComponentProps<typeof VSCodeDataGridCell>
>((props, ref) => <VSCodeDataGridCell {...props} ref={ref} />);

export { DataGrid, DataGridCell, DataGridRow };
