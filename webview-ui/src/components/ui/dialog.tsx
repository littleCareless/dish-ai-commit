import "@vscode/webview-ui-toolkit/dist/toolkit";
import React from "react";
import { Button } from "./button";

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
        // 深色遮罩层，适配 VS Code 主题
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
          // 使用 card 变量作为基础，确保足够的对比度
          backgroundColor: "var(--vscode-editor-background, hsl(var(--card)))",
          // 使用 VS Code 面板边框，确保主题一致性
          border: "1px solid var(--vscode-panel-border, hsl(var(--border)))",
          // 使用 VS Code widget shadow
          boxShadow:
            "var(--vscode-widget-shadow, 0 4px 12px rgba(0, 0, 0, 0.15))",
          // 前景色使用 VS Code 前景色
          color: "var(--vscode-foreground, hsl(var(--foreground)))",
          // 确保背景完全不透明
          opacity: 1,
          backdropFilter: "none",
        }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4"
          onClick={onClose}
          aria-label="Close dialog"
        >
          ×
        </Button>
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
    <h2
      className="text-lg font-semibold"
      style={{
        // 使用 VS Code 标题颜色，确保主题一致性
        color: "var(--vscode-title-foreground, hsl(var(--foreground)))",
      }}
      {...props}
    >
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
      style={{
        // 使用 VS Code 描述前景色
        color:
          "var(--vscode-descriptionForeground, hsl(var(--muted-foreground)))",
      }}
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
