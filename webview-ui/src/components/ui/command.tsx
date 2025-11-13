import React from "react";
import "@vscode/webview-ui-toolkit/dist/toolkit";

interface CommandProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

interface CommandInputProps extends React.HTMLAttributes<HTMLElement> {
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

interface CommandListProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

interface CommandEmptyProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

interface CommandGroupProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

interface CommandItemProps extends React.HTMLAttributes<HTMLElement> {
  value: string;
  children: React.ReactNode;
  onSelect?: () => void;
}

const Command: React.FC<CommandProps> = ({ children, ...props }) => {
  return (
    <div className="command" {...props}>
      {children}
    </div>
  );
};

const CommandInput: React.FC<CommandInputProps> = ({
  placeholder = "Search...",
  value,
  onValueChange,
  ...props
}) => {
  return (
    <div
      className="flex items-center border-b px-3"
      style={{ borderColor: "var(--vscode-input-border)" }}
      {...props}
    >
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        className="flex-1 border-none outline-none px-2 py-1"
        style={{
          backgroundColor: "var(--vscode-input-background)",
          color: "var(--vscode-input-foreground)",
        }}
      />
    </div>
  );
};

const CommandList: React.FC<CommandListProps> = ({ children, ...props }) => {
  return (
    <div
      className="max-h-[300px] overflow-y-auto overflow-x-hidden"
      style={{ backgroundColor: "var(--vscode-editor-background)" }}
      {...props}
    >
      {children}
    </div>
  );
};

const CommandEmpty: React.FC<CommandEmptyProps> = ({ children, ...props }) => {
  return (
    <div
      className="py-6 text-center text-sm"
      style={{ color: "var(--vscode-descriptionForeground)" }}
      {...props}
    >
      {children}
    </div>
  );
};

const CommandGroup: React.FC<CommandGroupProps> = ({ children, ...props }) => {
  return (
    <div
      className="overflow-hidden p-1"
      style={{ color: "var(--vscode-foreground)" }}
      {...props}
    >
      {children}
    </div>
  );
};

const CommandItem: React.FC<CommandItemProps> = ({
  children,
  onSelect,
  ...props
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  return (
    <div
      className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none"
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: isHovered
          ? "var(--vscode-list-hoverBackground)"
          : "transparent",
        color: isHovered
          ? "var(--vscode-list-hoverForeground)"
          : "var(--vscode-foreground)",
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
};
