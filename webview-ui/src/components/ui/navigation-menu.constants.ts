import { cva } from "class-variance-authority";

export const navigationMenuTriggerStyle = cva(
  "group inline-flex h-9 w-max items-center justify-center rounded-md bg-[var(--vscode-editor-background)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--vscode-list-hoverBackground)] hover:text-[var(--vscode-list-hoverForeground)] focus:bg-[var(--vscode-list-focusBackground)] focus:text-[var(--vscode-list-focusForeground)] focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-active:bg-[var(--vscode-list-activeSelectionBackground)] data-[state=open]:bg-[var(--vscode-list-activeSelectionBackground)]",
);
