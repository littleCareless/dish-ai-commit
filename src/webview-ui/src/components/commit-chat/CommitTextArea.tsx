import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Sparkles, FileText, X } from "lucide-react";
import { DragDropDebugger } from "./DragDropDebug";

export interface CommitSuggestion {
  text: string;
  type: "template" | "style" | "convention" | "custom";
  confidence: number;
  description?: string;
}

export interface CommitCommand {
  command: string;
  description: string;
  handler: (input: string) => void;
}

interface CommitTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  files?: readonly string[];
  onFilesChange?: (filePaths: string[]) => void;
  onSuggestionClick?: (suggestion: string) => void;
  onCommandExecute?: (command: string, args: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  suggestions?: CommitSuggestion[];
  commands?: CommitCommand[];
  className?: string;
}

const SUPPORTED_FILE_EXTENSIONS: readonly string[] = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".java",
  ".cpp",
  ".c",
  ".cs",
  ".php",
  ".rb",
  ".go",
  ".rs",
  ".swift",
  ".kt",
  ".scala",
  ".html",
  ".css",
  ".scss",
  ".less",
  ".vue",
  ".svelte",
  ".json",
  ".xml",
  ".yaml",
  ".yml",
  ".md",
  ".txt",
];

const DATA_TRANSFER_TYPES: readonly string[] = [
  "text/plain",
  "text/uri-list",
  "text/html",
  "text",
  "application/x-moz-file",
  "Files",
];

const FILE_ICON_MAP: Record<string, string> = {
  ts: "🔷",
  tsx: "⚛️",
  js: "🟨",
  jsx: "⚛️",
  py: "🐍",
  java: "☕",
  cpp: "⚙️",
  c: "⚙️",
  cs: "🔷",
  php: "🐘",
  rb: "💎",
  go: "🐹",
  rs: "🦀",
  swift: "🍎",
  kt: "🟣",
  html: "🌐",
  css: "🎨",
  json: "📄",
  md: "📝",
};

const normalisePath = (value: string): string => {
  const trimmed = value.replace(/\r|\n/g, "").trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("file://")) {
    try {
      return decodeURIComponent(trimmed.replace(/^file:\/\//, ""));
    } catch {
      return trimmed.replace(/^file:\/\//, "");
    }
  }

  return trimmed.replace(/\\/g, "/");
};

const createFileTag = (path: string): string => {
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) {
    return "@/file";
  }

  const tail = segments.slice(-2);
  return `@/${tail.join("/")}`;
};

const getFileIcon = (path: string): string => {
  const fileName = path.split("/").pop() ?? path;
  const extension = fileName.includes(".") ? fileName.split(".").pop() ?? "" : "";
  return FILE_ICON_MAP[extension.toLowerCase()] ?? "📄";
};

const filterSupportedFiles = (files: readonly File[]): string[] => {
  const valid = files.filter(file => {
    const lower = file.name.toLowerCase();
    return SUPPORTED_FILE_EXTENSIONS.some(ext => lower.endsWith(ext)) || !lower.includes(".");
  });

  return valid.map(file => {
    const fileWithPath = file as File & { path?: string; webkitRelativePath?: string };
    return fileWithPath.path || fileWithPath.webkitRelativePath || file.name;
  });
};

const CommitTextArea: React.FC<CommitTextAreaProps> = ({
  value,
  onChange,
  onSend,
  files = [],
  onFilesChange,
  onSuggestionClick,
  onCommandExecute,
  placeholder = "描述你的代码变更，或者告诉我你想要的 commit message 风格...",
  disabled = false,
  isLoading = false,
  suggestions = [],
  commands = [],
  className = "",
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const dragDepthRef = useRef(0);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [commandInput, setCommandInput] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const normalisedFiles = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];

    files.forEach(file => {
      const normalised = normalisePath(file);
      if (!normalised) {
        return;
      }
      if (!seen.has(normalised)) {
        seen.add(normalised);
        result.push(normalised);
      }
    });

    return result;
  }, [files]);

  const fileEntries = useMemo(
    () =>
      normalisedFiles.map(path => ({
        path,
        tag: createFileTag(path),
        icon: getFileIcon(path),
      })),
    [normalisedFiles]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: CommitSuggestion) => {
      if (onSuggestionClick) {
        onSuggestionClick(suggestion.text);
      }
      setShowSuggestions(false);
    },
    [onSuggestionClick]
  );

  const handleCommandExecute = useCallback(
    (command: CommitCommand) => {
      if (onCommandExecute) {
        const args = commandInput.substring(1).trim();
        onCommandExecute(command.command, args);
      }
      setShowCommands(false);
      setCommandInput("");
    },
    [commandInput, onCommandExecute]
  );

  const emitFilesChange = useCallback(
    (nextPaths: string[]) => {
      onFilesChange?.(nextPaths);
    },
    [onFilesChange]
  );

  const handleRemoveTag = useCallback(
    (path: string) => {
      const updated = normalisedFiles.filter(item => item !== path);
      emitFilesChange(updated);

      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    },
    [emitFilesChange, normalisedFiles]
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = event.target.value;
      onChange(newValue);

      if (newValue.startsWith("/")) {
        setShowCommands(true);
        setCommandInput(newValue);
      } else {
        setShowCommands(false);
        setCommandInput("");
      }

      if (newValue.trim().length > 0) {
        setShowSuggestions(true);
        if (suggestionTimeoutRef.current) {
          clearTimeout(suggestionTimeoutRef.current);
        }
        suggestionTimeoutRef.current = setTimeout(() => {
          setShowSuggestions(false);
        }, 3000);
      } else {
        setShowSuggestions(false);
      }
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (!disabled && !isLoading && value.trim()) {
          onSend();
        }
        return;
      }

      if (event.key === "Escape") {
        setShowSuggestions(false);
        setShowCommands(false);
        return;
      }

      if (event.key === "Backspace" && !value) {
        if (fileEntries.length > 0) {
          event.preventDefault();
          const updated = fileEntries.slice(0, -1).map(entry => entry.path);
          emitFilesChange(updated);
        }
      }
    },
    [disabled, emitFilesChange, fileEntries, isLoading, onSend, value]
  );

  const extractPathsFromDataTransfer = useCallback((event: React.DragEvent): string[] => {
    const collected: string[] = [];

    DATA_TRANSFER_TYPES.forEach(type => {
      if (collected.length > 0) {
        return;
      }

      try {
        const data = event.dataTransfer.getData(type);
        if (!data || data.trim().length === 0) {
          return;
        }

        DragDropDebugger.log("info", `获取到 ${type} 数据`, {
          dataLength: data.length,
          preview: data.substring(0, 200),
        });

        if (type === "text/uri-list" || type === "text/html") {
          const paths = data
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith("#"))
            .map(line => {
              try {
                if (line.startsWith("file://")) {
                  return normalisePath(line);
                }

                if (line.includes("://")) {
                  const url = new URL(line);
                  return decodeURIComponent(url.pathname);
                }

                return decodeURIComponent(line);
              } catch {
                return normalisePath(line);
              }
            })
            .filter(path => path.length > 0);

          collected.push(...paths);
        } else {
          const paths = data
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.length > 0 && (line.includes("/") || line.includes("\\\\")));

          collected.push(...paths.map(normalisePath));
        }
      } catch (error) {
        DragDropDebugger.log("warn", `读取 ${type} 失败`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    return collected;
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragDepthRef.current = 0;
      setIsDragOver(false);

      if (disabled) {
        DragDropDebugger.log("warn", "当前输入已禁用，忽略拖拽");
        return;
      }

      DragDropDebugger.log("info", "开始处理拖拽", {
        types: Array.from(event.dataTransfer.types),
        filesCount: event.dataTransfer.files.length,
        effectAllowed: event.dataTransfer.effectAllowed,
        dropEffect: event.dataTransfer.dropEffect,
      });

      const localFiles = Array.from(event.dataTransfer.files);
      DragDropDebugger.log("info", `获取到 ${localFiles.length} 个本地文件`);

      const supportedLocal = filterSupportedFiles(localFiles).map(normalisePath);
      const transferPaths = extractPathsFromDataTransfer(event);

      const candidate = supportedLocal.length > 0 ? supportedLocal : transferPaths;
      const normalised = candidate.map(normalisePath).filter(Boolean);

      if (normalised.length === 0) {
        DragDropDebugger.log("error", "未能识别的拖拽数据，请从 SCM 资源管理器拖拽文件");
        return;
      }

      const selectionStart = textareaRef.current?.selectionStart ?? value.length;
      const selectionEnd = textareaRef.current?.selectionEnd ?? value.length;

      const before = value.slice(0, selectionStart);
      const after = value.slice(selectionEnd);
      const needsSpaceBefore = before.length > 0 && !/\s$/.test(before);
      const needsSpaceAfter = after.length > 0 && !/^\s/.test(after);
      const updatedValue = `${before}${needsSpaceBefore ? " " : ""}${needsSpaceAfter ? " " : ""}${after}`
        .replace(/\s{2,}/g, " ")
        .replace(/^\s+/, '')
        .replace(/\s+$/, '');

      const updatedTags = Array.from(new Set([...normalisedFiles, ...normalised]));

      if (updatedTags.length === normalisedFiles.length) {
        DragDropDebugger.log("info", "拖拽的文件均已存在", { count: updatedTags.length });
        return;
      }

      emitFilesChange(updatedTags);
      onChange(updatedValue);

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          const insertionIndex = before.length + (needsSpaceBefore ? 1 : 0);
          textareaRef.current.focus();
          textareaRef.current.selectionStart = insertionIndex;
          textareaRef.current.selectionEnd = insertionIndex;
        }
      });
    },
    [disabled, emitFilesChange, extractPathsFromDataTransfer, normalisedFiles, onChange, value]
  );

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragOver(true);
  }, [disabled]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, [disabled]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  useEffect(() => () => {
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }
  }, []);

  const renderSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) {
      return null;
    }

    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-border bg-background p-2 shadow-lg z-20">
        <div className="mb-2 text-xs text-muted-foreground">建议:</div>
        <div className="space-y-1">
          {suggestions.slice(0, 5).map((suggestion, index) => (
            <div
              key={`${suggestion.text}-${index}`}
              className="flex cursor-pointer items-center justify-between rounded px-2 py-1 hover:bg-muted"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex-1">
                <div className="text-sm">{suggestion.text}</div>
                {suggestion.description && (
                  <div className="text-xs text-muted-foreground">{suggestion.description}</div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  {suggestion.type}
                </Badge>
                <div className="text-xs text-muted-foreground">
                  {Math.round(suggestion.confidence * 100)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCommands = () => {
    if (!showCommands || commands.length === 0) {
      return null;
    }

    const filtered = commands.filter(cmd =>
      cmd.command.toLowerCase().includes(commandInput.toLowerCase().substring(1))
    );

    if (filtered.length === 0) {
      return null;
    }

    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-border bg-background p-2 shadow-lg z-20">
        <div className="mb-2 text-xs text-muted-foreground">命令:</div>
        <div className="space-y-1">
          {filtered.slice(0, 5).map((command, index) => (
            <div
              key={`${command.command}-${index}`}
              className="flex cursor-pointer items-center justify-between rounded px-2 py-1 hover:bg-muted"
              onClick={() => handleCommandExecute(command)}
            >
              <div className="flex-1">
                <div className="text-sm font-mono">/{command.command}</div>
                <div className="text-xs text-muted-foreground">{command.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          {renderSuggestions()}
          {renderCommands()}
          <div
            className={`relative rounded-lg border border-input bg-background transition ${
              (isFocused || isDragOver) && !disabled ? "ring-2 ring-primary/50" : ""
            } ${disabled ? "opacity-70" : ""}`}
            onClick={() => textareaRef.current?.focus()}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-wrap items-center gap-2 p-2">
              {fileEntries.map(entry => (
                <span
                  key={entry.path}
                  className="group inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-xs text-muted-foreground"
                >
                  <span>{entry.icon}</span>
                  <span className="font-mono">{entry.tag}</span>
                  <button
                    type="button"
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                    aria-label={`移除 ${entry.tag}`}
                    onMouseDown={event => event.preventDefault()}
                    onClick={event => {
                      event.stopPropagation();
                      handleRemoveTag(entry.path);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                rows={1}
                className="min-h-[24px] flex-1 resize-none border-0 bg-transparent p-0 text-sm leading-5 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            {isDragOver && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10">
                <div className="text-center text-primary">
                  <FileText className="mx-auto mb-2 h-6 w-6 animate-pulse" />
                  <div className="text-sm font-medium">拖拽代码文件到这里</div>
                  <div className="mt-1 text-xs text-primary/70">支持 .ts, .js, .py, .java 等代码文件</div>
                </div>
              </div>
            )}
            {suggestions.length > 0 && !isDragOver && (
              <div className="pointer-events-none absolute right-2 top-2 text-muted-foreground">
                <Sparkles size={16} />
              </div>
            )}
          </div>
        </div>
        <Button
          onClick={onSend}
          disabled={!value.trim() || disabled || isLoading}
          size="icon"
          className="h-10 w-10"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">
        Enter 发送，Shift+Enter 换行，/ 查看命令
      </div>
    </div>
  );
};

export default CommitTextArea;
