import "@vscode/webview-ui-toolkit/dist/toolkit";
import React from "react";

interface DialogProps extends React.HTMLAttributes<HTMLElement> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  onClose?: () => void;
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

interface DialogFooterProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

interface DialogDescriptionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({
  open = false,
  children,
  ...props
}) => {
  if (!open) return null;

  return (
    <div className="dialog" {...props}>
      {children}
    </div>
  );
};

const DialogContent: React.FC<DialogContentProps> = ({
  children,
  onClose,
  className = "",
  ...props
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: "var(--vscode-scrim-background, rgba(0, 0, 0, 0.5))",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
      {...props}
    >
      <div
        className={`rounded-lg p-6 max-w-lg w-full mx-4 relative ${className}`}
        style={{
          backgroundColor: "var(--vscode-editor-background)",
          border: "1px solid var(--vscode-panel-border)",
          boxShadow: "var(--vscode-widget-shadow)",
        }}
      >
        <button
          className="absolute right-4 top-4 text-xl leading-none w-6 h-6 flex items-center justify-center"
          style={{
            color: "var(--vscode-foreground)",
            border: "none",
            background: "none",
            cursor: "pointer",
          }}
          onClick={onClose}
          aria-label="Close dialog"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

const DialogHeader: React.FC<DialogHeaderProps> = ({ children, ...props }) => {
  return (
    <div className="mb-4" {...props}>
      {children}
    </div>
  );
};

const DialogFooter: React.FC<DialogFooterProps> = ({ children, ...props }) => {
  return (
    <div className="flex justify-end gap-2 mt-4" {...props}>
      {children}
    </div>
  );
};

const DialogTitle: React.FC<DialogTitleProps> = ({ children, ...props }) => {
  return (
    <h2 className="text-lg font-semibold" {...props}>
      {children}
    </h2>
  );
};

const DialogDescription: React.FC<DialogDescriptionProps> = ({
  children,
  ...props
}) => {
  return (
    <p
      className="text-sm"
      style={{ color: "var(--vscode-descriptionForeground)" }}
      {...props}
    >
      {children}
    </p>
  );
};

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
};
