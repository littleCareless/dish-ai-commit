import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[var(--vscode-editor-background)] group-[.toaster]:text-[var(--vscode-foreground)] group-[.toaster]:border-[var(--vscode-panel-border)] group-[.toaster]:shadow-[var(--vscode-widget-shadow)]",
          description:
            "group-[.toast]:text-[var(--vscode-descriptionForeground)]",
          actionButton:
            "group-[.toast]:bg-[var(--vscode-button-background)] group-[.toast]:text-[var(--vscode-button-foreground)]",
          cancelButton:
            "group-[.toast]:bg-[var(--vscode-button-secondaryBackground)] group-[.toast]:text-[var(--vscode-button-secondaryForeground)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
