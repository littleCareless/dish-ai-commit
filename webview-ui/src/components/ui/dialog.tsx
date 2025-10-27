import React from "react";
import "@vscode/webview-ui-toolkit/dist/toolkit";

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
  onOpenChange,
  children,
  ...props
}) => {
  return (
    <div className={`dialog ${open ? "open" : "closed"}`} {...props}>
      {children}
    </div>
  );
};

const DialogContent: React.FC<DialogContentProps> = ({
  children,
  onClose,
  ...props
}) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
      {...props}
    >
      <div className="bg-background border rounded-lg shadow-lg p-6 max-w-lg w-full mx-4">
        <button
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
          onClick={onClose}
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
    <p className="text-sm text-muted-foreground" {...props}>
      {children}
    </p>
  );
};

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
