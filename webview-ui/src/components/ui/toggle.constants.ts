import { cva } from "class-variance-authority";

export const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-[var(--vscode-toolbar-hoverBackground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--vscode-focusBorder)] disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-[var(--vscode-button-background)] data-[state=on]:text-[var(--vscode-button-foreground)]",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-[var(--vscode-input-border)] bg-transparent hover:bg-[var(--vscode-button-secondaryBackground)] hover:text-[var(--vscode-button-secondaryForeground)]",
      },
      size: {
        default: "h-9 px-3",
        sm: "h-8 px-2",
        lg: "h-10 px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
