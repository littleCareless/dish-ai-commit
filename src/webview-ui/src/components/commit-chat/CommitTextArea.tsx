import React, { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Sparkles, FileText } from "lucide-react";
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
  onSuggestionClick?: (suggestion: string) => void;
  onCommandExecute?: (command: string, args: string) => void;
  onFilesDropped?: (filePaths: readonly string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  suggestions?: CommitSuggestion[];
  commands?: CommitCommand[];
  className?: string;
}

interface DroppedFileEntry {
  originalPath: string;
  tag: string;
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

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normaliseOriginalPath = (path: string): string => {
  const trimmed = path.replace(/\r|\n/g, "").trim();
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

  return trimmed;
};

const createFileTag = (path: string): string => {
  const normalised = normaliseOriginalPath(path).replace(/\\/g, "/");
  const segments = normalised.split("/").filter(Boolean);
  if (segments.length === 0) {
    return "@/file";
  }

  const tagSegments = segments.slice(-Math.min(segments.length, 2));
  const tagPath = tagSegments.join("/") || segments[segments.length - 1];
  return `@/${tagPath}`;
};

const getFileIcon = (path: string): string => {
  const normalised = normaliseOriginalPath(path).replace(/\\/g, "/");
  const fileName = normalised.split("/").pop() ?? normalised;
  const extension = fileName.includes(".") ? fileName.split(".").pop() ?? "" : "";
  return FILE_ICON_MAP[extension.toLowerCase()] ?? "📄";
};

const appendTagsToValue = (current: string, tags: readonly string[]): string => {
  if (tags.length === 0) {
    return current;
  }

  const trimmed = current.replace(/\s+$/u, "");
  const prefix = trimmed.length === 0 ? "" : `${trimmed} `;
  return `${prefix}${tags.join(" ")}`;
};

const containsTag = (value: string, tag: string): boolean => {
  const regex = new RegExp(`(^|\\s)${escapeRegExp(tag)}(?=\\s|$)`);
  return regex.test(value);
};

const removeTagsFromValue = (value: string, tags: readonly string[]): string => {
  if (tags.length === 0) {
    return value;
  }

  let updated = value;
  tags.forEach(tag => {
    const regex = new RegExp(`(^|\\s)${escapeRegExp(tag)}(?=\\s|$)`, "g");
    updated = updated.replace(regex, " ");
  });

  return updated.replace(/\s{2,}/g, " ").trim();
};

const filterSupportedFiles = (files: readonly File[]): string[] => {
  const validFiles = files.filter(file => {
    const fileName = file.name.toLowerCase();
    return SUPPORTED_FILE_EXTENSIONS.some(ext => fileName.endsWith(ext)) || !fileName.includes(".");
  });

  if (validFiles.length === 0) {
    return [];
  }

  return validFiles.map(file => {
    const fileWithPath = file as File & { path?: string; webkitRelativePath?: string };
    return fileWithPath.path || fileWithPath.webkitRelativePath || file.name;
  });
};

const CommitTextArea: React.FC<CommitTextAreaProps> = ({
  value,
  onChange,
  onSend,
  onSuggestionClick,
  onCommandExecute,
  onFilesDropped,
  placeholder = "描述你的代码变更，或者告诉我你想要的 commit message 风格...",
  disabled = false,
  isLoading = false,
  suggestions = [],
  commands = [],
  className = "",
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [commandInput, setCommandInput] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<DroppedFileEntry[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pendingTagsRef = useRef<string[]>([]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
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
  }, [onChange]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!disabled && !isLoading && value.trim()) {
        onSend();
      }
    } else if (event.key === "Escape") {
      setShowSuggestions(false);
      setShowCommands(false);
    }
  }, [disabled, isLoading, onSend, value]);

  const handleSuggestionClick = useCallback((suggestion: CommitSuggestion) => {
    if (onSuggestionClick) {
      onSuggestionClick(suggestion.text);
    }
    setShowSuggestions(false);
  }, [onSuggestionClick]);

  const handleCommandExecute = useCallback((command: CommitCommand) => {
    if (onCommandExecute) {
      const args = commandInput.substring(1).trim();
      onCommandExecute(command.command, args);
    }
    setShowCommands(false);
    setCommandInput("");
  }, [commandInput, onCommandExecute]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) {
      return;
    }
    setIsDragOver(true);
    DragDropDebugger.log("info", "拖拽进入");
  }, [disabled]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    DragDropDebugger.log("info", "拖拽离开");
  }, []);

  const extractFilePathsFromDataTransfer = useCallback((event: React.DragEvent): string[] => {
    const collectedPaths: string[] = [];

    DATA_TRANSFER_TYPES.forEach(type => {
      if (collectedPaths.length > 0) {
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
                  return normaliseOriginalPath(line);
                }

                if (line.includes("://")) {
                  const url = new URL(line);
                  return decodeURIComponent(url.pathname);
                }

                return decodeURIComponent(line);
              } catch {
                return line;
              }
            })
            .filter(path => path.length > 0);

          if (paths.length > 0) {
            collectedPaths.push(...paths);
          }
        } else {
          const paths = data
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.length > 0 && (line.includes("/") || line.includes("\\\\")));

          if (paths.length > 0) {
            collectedPaths.push(...paths);
          }
        }
      } catch (error) {
        DragDropDebugger.log("warn", `读取 ${type} 失败`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    return collectedPaths;
  }, []);

  const normalisePaths = useCallback((paths: readonly string[]): string[] => {
    const cleaned = paths
      .map(item => normaliseOriginalPath(item).replace(/\\/g, "/"))
      .map(item => item.replace(/\s+/g, " ").trim())
      .filter(item => item.length > 0);

    return Array.from(new Set(cleaned));
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
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

    const supportedLocalPaths = filterSupportedFiles(localFiles);
    let candidatePaths = supportedLocalPaths;

    if (candidatePaths.length === 0) {
      candidatePaths = extractFilePathsFromDataTransfer(event);
    }

    const normalisedPaths = normalisePaths(candidatePaths);

    if (normalisedPaths.length === 0) {
      DragDropDebugger.log("error", "未能识别的拖拽数据，请从 SCM 资源管理器拖拽文件");
      return;
    }

    const existingEntries = new Map(droppedFiles.map(entry => [entry.originalPath, entry]));
    const newEntries: DroppedFileEntry[] = [];

    normalisedPaths.forEach(path => {
      if (!existingEntries.has(path)) {
        const entry: DroppedFileEntry = {
          originalPath: path,
          tag: createFileTag(path),
        };
        existingEntries.set(path, entry);
        newEntries.push(entry);
      }
    });

    if (newEntries.length === 0) {
      DragDropDebugger.log("info", "拖拽的文件均已存在", { count: existingEntries.size });
      onFilesDropped?.(Array.from(existingEntries.values()).map(item => item.originalPath));
      return;
    }

    const updatedEntries = Array.from(existingEntries.values());
    setDroppedFiles(updatedEntries);

    const newTags = newEntries
      .map(entry => entry.tag)
      .filter(tag => !containsTag(value, tag));

    if (newTags.length > 0) {
      const updatedValue = appendTagsToValue(value, newTags);
      pendingTagsRef.current = newTags;
      onChange(updatedValue);
      DragDropDebugger.log("success", "已将文件标签添加到输入框", {
        count: newTags.length,
        tags: newTags,
      });
    }

    onFilesDropped?.(updatedEntries.map(entry => entry.originalPath));
  }, [disabled, droppedFiles, extractFilePathsFromDataTransfer, normalisePaths, onChange, onFilesDropped, value]);

  const clearDroppedFiles = useCallback(() => {
    if (droppedFiles.length === 0) {
      return;
    }

    const tags = droppedFiles.map(entry => entry.tag);
    const updatedValue = removeTagsFromValue(value, tags);

    if (updatedValue !== value) {
      onChange(updatedValue);
    }

    pendingTagsRef.current = [];
    setDroppedFiles([]);
    onFilesDropped?.([]);
  }, [droppedFiles, onChange, onFilesDropped, value]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  useEffect(() => {
    if (pendingTagsRef.current.length > 0) {
      const unresolved = pendingTagsRef.current.filter(tag => !containsTag(value, tag));
      if (unresolved.length === 0) {
        pendingTagsRef.current = [];
      }
      return;
    }

    if (droppedFiles.length === 0) {
      return;
    }

    const remainingEntries = droppedFiles.filter(entry => containsTag(value, entry.tag));

    if (remainingEntries.length === droppedFiles.length) {
      return;
    }

    setDroppedFiles(remainingEntries);
    onFilesDropped?.(remainingEntries.map(entry => entry.originalPath));
  }, [droppedFiles, onFilesDropped, value]);

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
      <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border border-border rounded-lg shadow-lg p-2 z-10">
        <div className="text-xs text-muted-foreground mb-2">建议:</div>
        <div className="space-y-1">
          {suggestions.slice(0, 5).map((suggestion, index) => (
            <div
              key={suggestion.text + index}
              className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex-1">
                <div className="text-sm">{suggestion.text}</div>
                {suggestion.description && (
                  <div className="text-xs text-muted-foreground">
                    {suggestion.description}
                  </div>
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

    const filteredCommands = commands.filter(cmd =>
      cmd.command.toLowerCase().includes(commandInput.toLowerCase().substring(1))
    );

    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border border-border rounded-lg shadow-lg p-2 z-10">
        <div className="text-xs text-muted-foreground mb-2">命令:</div>
        <div className="space-y-1">
          {filteredCommands.slice(0, 5).map((command, index) => (
            <div
              key={command.command + index}
              className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
              onClick={() => handleCommandExecute(command)}
            >
              <div className="flex-1">
                <div className="text-sm font-mono">/{command.command}</div>
                <div className="text-xs text-muted-foreground">
                  {command.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`}>
      {renderSuggestions()}
      {renderCommands()}

      {droppedFiles.length > 0 && (
        <div className="mb-2 p-3 bg-muted rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 text-sm font-medium">
              <FileText size={16} className="text-primary" />
              <span>已拖拽的文件 ({droppedFiles.length})</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearDroppedFiles}
              className="h-6 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
            >
              清除
            </Button>
          </div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {droppedFiles.map(entry => (
              <div
                key={entry.originalPath}
                className="flex items-center space-x-2 text-xs text-muted-foreground"
              >
                <span className="text-sm">{getFileIcon(entry.originalPath)}</span>
                <span className="font-mono flex-1 truncate" title={entry.originalPath}>
                  {entry.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex space-x-2">
        <div
          className="flex-1 relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={`min-h-[60px] max-h-[120px] resize-none pr-10 transition-colors ${
              isDragOver ? "border-primary bg-primary/5" : ""
            }`}
          />

          {suggestions.length > 0 && (
            <div className="absolute right-2 top-2 pointer-events-none">
              <Sparkles size={16} className="text-muted-foreground" />
            </div>
          )}

          {isDragOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg z-10 pointer-events-none">
              <div className="text-center">
                <FileText size={24} className="mx-auto mb-2 text-primary animate-pulse" />
                <div className="text-sm font-medium text-primary">拖拽代码文件到这里</div>
                <div className="text-xs text-primary/70 mt-1">支持 .ts, .js, .py, .java 等代码文件</div>
              </div>
            </div>
          )}

          <div
            className="absolute inset-0 pointer-events-none"
            onDragOver={() => {
              DragDropDebugger.log("info", "拖拽覆盖层: dragover");
            }}
            onDragLeave={() => {
              DragDropDebugger.log("info", "拖拽覆盖层: dragleave");
            }}
            onDrop={() => {
              DragDropDebugger.log("info", "拖拽覆盖层: drop");
            }}
          />
        </div>

        <Button
          onClick={onSend}
          disabled={!value.trim() || disabled || isLoading}
          size="icon"
          className="self-end"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground mt-1">
        Enter 发送，Shift+Enter 换行，/ 查看命令
        {droppedFiles.length === 0 && (
          <span className="ml-2 text-primary">💡 提示：可以从 SCM 资源管理器拖拽文件到输入框</span>
        )}
      </div>
    </div>
  );
};

export default CommitTextArea;
