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
    <div className="flex items-center border-b px-3" {...props}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        className="flex-1 bg-transparent border-none outline-none px-2 py-1"
      />
    </div>
  );
};

const CommandList: React.FC<CommandListProps> = ({ children, ...props }) => {
  return (
    <div className="max-h-[300px] overflow-y-auto overflow-x-hidden" {...props}>
      {children}
    </div>
  );
};

const CommandEmpty: React.FC<CommandEmptyProps> = ({ children, ...props }) => {
  return (
    <div className="py-6 text-center text-sm" {...props}>
      {children}
    </div>
  );
};

const CommandGroup: React.FC<CommandGroupProps> = ({ children, ...props }) => {
  return (
    <div className="overflow-hidden p-1 text-foreground" {...props}>
      {children}
    </div>
  );
};

const CommandItem: React.FC<CommandItemProps> = ({
  value,
  children,
  onSelect,
  ...props
}) => {
  return (
    <div
      className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
      onClick={onSelect}
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
