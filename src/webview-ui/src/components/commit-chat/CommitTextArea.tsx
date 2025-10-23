import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Sparkles } from "lucide-react";
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

const TAG_PATTERN = /@\/[^\s]+/g;

const getFileIcon = (path: string): string => {
  const lower = path.toLowerCase();
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return "🔷";
  if (lower.endsWith(".js") || lower.endsWith(".jsx")) return "🟨";
  if (lower.endsWith(".py")) return "🐍";
  if (lower.endsWith(".java")) return "☕";
  if (lower.endsWith(".cpp") || lower.endsWith(".c") || lower.endsWith(".cc")) return "⚙️";
  if (lower.endsWith(".cs")) return "🔷";
  if (lower.endsWith(".php")) return "🐘";
  if (lower.endsWith(".rb")) return "💎";
  if (lower.endsWith(".go")) return "🐹";
  if (lower.endsWith(".rs")) return "🦀";
  if (lower.endsWith(".swift")) return "🍎";
  if (lower.endsWith(".kt") || lower.endsWith(".kts")) return "🟣";
  if (lower.endsWith(".html")) return "🌐";
  if (lower.endsWith(".css") || lower.endsWith(".scss") || lower.endsWith(".less")) return "🎨";
  if (lower.endsWith(".json")) return "📄";
  if (lower.endsWith(".md")) return "📝";
  if (lower.endsWith(".yml") || lower.endsWith(".yaml")) return "📘";
  return "📄";
};

const extractTagPaths = (input: string): string[] => {
  const matches = input.match(TAG_PATTERN);
  if (!matches) {
    return [];
  }
  const seen = new Set<string>();
  const paths: string[] = [];
  matches.forEach(match => {
    const path = match.replace(/^@\//, "");
    if (!seen.has(path)) {
      seen.add(path);
      paths.push(path);
    }
  });
  return paths;
};

const arraysEqual = (a: readonly string[], b: readonly string[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
};

const normalizeDroppedPath = (rawPath: string): string => {
  let normalized = rawPath.replace(/\r|\n/g, "").trim();
  if (!normalized) {
    return "";
  }
  if (normalized.startsWith("file://")) {
    try {
      normalized = decodeURIComponent(normalized.replace(/^file:\/\//, ""));
    } catch {
      normalized = normalized.replace(/^file:\/\//, "");
    }
  }
  normalized = normalized.replace(/\\/g, "/");
  return normalized;
};

const parseContentSegments = (input: string): Array<{ type: "tag"; path: string } | { type: "text"; text: string }> => {
  const segments: Array<{ type: "tag"; path: string } | { type: "text"; text: string }> = [];
  if (!input) {
    return segments;
  }
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(TAG_PATTERN);
  while ((match = regex.exec(input)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      segments.push({ type: "text", text: input.slice(lastIndex, matchIndex) });
    }
    const tag = match[0].replace(/^@\//, "");
    segments.push({ type: "tag", path: tag });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < input.length) {
    segments.push({ type: "text", text: input.slice(lastIndex) });
  }
  return segments;
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
  const editorRef = useRef<HTMLDivElement>(null);
  const isRenderingRef = useRef(false);
  const lastFilesRef = useRef<string[]>([]);

  const [isFocused, setIsFocused] = useState(false);
  const [isEmpty, setIsEmpty] = useState(() => value.trim().length === 0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [commandInput, setCommandInput] = useState("");

  const suggestionList = suggestions.slice(0, 5);
  const dragDepthRef = useRef(0);

  const commandList = useMemo(() => {
    if (!showCommands || !commandInput.startsWith("/")) {
      return [] as CommitCommand[];
    }
    const query = commandInput.slice(1).toLowerCase();
    if (!query) {
      return commands.slice(0, 5);
    }
    return commands.filter(cmd => cmd.command.toLowerCase().includes(query)).slice(0, 5);
  }, [commands, commandInput, showCommands]);

  const updateFiles = useCallback((nextFiles: string[]) => {
    if (!onFilesChange) {
      return;
    }
    if (!arraysEqual(lastFilesRef.current, nextFiles)) {
      lastFilesRef.current = nextFiles;
      onFilesChange(nextFiles);
    }
  }, [onFilesChange]);

  const serializeEditorContent = useCallback((): string => {
    const root = editorRef.current;
    if (!root) {
      return "";
    }
    let result = "";
    root.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        result += (node as Text).textContent ?? "";
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagPath = element.dataset.tagPath;
        if (tagPath) {
          result += `@/${tagPath}`;
        } else {
          result += element.textContent ?? "";
        }
      }
    });
    result = result.replace(/\u00a0/g, " ");
    lastSerializedRef.current = result;
    return result;
  }, []);

  const createTagElement = useCallback((path: string, onRemove: () => void): HTMLElement => {
    const span = document.createElement("span");
    span.className = "inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-xs text-muted-foreground";
    span.dataset.tagPath = path;
    span.contentEditable = "false";

    const icon = document.createElement("span");
    icon.textContent = getFileIcon(path);
    icon.className = "text-sm";

    const text = document.createElement("span");
    text.className = "font-mono";
    text.textContent = `@/${path}`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-transparent text-[10px] text-muted-foreground transition hover:bg-destructive hover:text-destructive-foreground";
    button.textContent = "×";
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      span.remove();
      onRemove();
    });

    span.appendChild(icon);
    span.appendChild(text);
    span.appendChild(button);
    return span;
  }, []);

  const handleDomChange = useCallback(() => {
    if (isRenderingRef.current) {
      return;
    }
    const serialized = serializeEditorContent();
    const trimmed = serialized.trim();
    const nextTags = extractTagPaths(serialized);
    updateFiles(nextTags);
    if (serialized !== value) {
      onChange(serialized);
    }
    setIsEmpty(trimmed.length === 0);

    if (trimmed.startsWith("/")) {
      setShowCommands(true);
      setCommandInput(trimmed);
    } else {
      setShowCommands(false);
      setCommandInput("");
    }

    if (trimmed.length > 0 && suggestions.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [serializeEditorContent, onChange, suggestions.length, updateFiles, value]);

  const renderValue = useCallback((content: string) => {
    const root = editorRef.current;
    if (!root) {
      return;
    }
    isRenderingRef.current = true;
    root.innerHTML = "";
    const segments = parseContentSegments(content);
    const fragment = document.createDocumentFragment();
    segments.forEach(segment => {
      if (segment.type === "tag") {
        const tagElement = createTagElement(segment.path, () => {
          handleDomChange();
        });
        fragment.appendChild(tagElement);
      } else if (segment.text) {
        fragment.appendChild(document.createTextNode(segment.text));
      }
    });
    if (!fragment.childNodes.length) {
      fragment.appendChild(document.createTextNode(""));
    }
    root.appendChild(fragment);
    isRenderingRef.current = false;
    const empty = content.trim().length === 0;
    setIsEmpty(empty);
  }, [createTagElement, handleDomChange]);

  const insertTagAtCursor = useCallback((path: string) => {
    const root = editorRef.current;
    if (!root) {
      return;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      const tagElement = createTagElement(path, () => handleDomChange());
      root.appendChild(tagElement);
      root.appendChild(document.createTextNode(" "));
      handleDomChange();
      return;
    }

    let range = selection.getRangeAt(0);
    const adjustRange = () => {
      let container = range.startContainer as Node | null;
      while (container && container !== root) {
        if (container instanceof HTMLElement && container.dataset.tagPath) {
          range.setStartAfter(container);
          range.collapse(true);
          return;
        }
        container = container.parentNode;
      }
    };

    adjustRange();
    range = selection.getRangeAt(0);
    range.deleteContents();

    const tagElement = createTagElement(path, () => handleDomChange());
    range.insertNode(tagElement);
    const spaceNode = document.createTextNode(" ");
    tagElement.after(spaceNode);

    const newRange = document.createRange();
    newRange.setStartAfter(spaceNode);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
    handleDomChange();
  }, [createTagElement, handleDomChange]);

  const handleSuggestionSelect = useCallback((suggestion: string) => {
    if (!onSuggestionClick) {
      onChange(suggestion);
      renderValue(suggestion);
    } else {
      onSuggestionClick(suggestion);
    }
    setShowSuggestions(false);
  }, [onChange, onSuggestionClick, renderValue]);

  const handleCommandSelect = useCallback((command: CommitCommand) => {
    if (!onCommandExecute) {
      return;
    }
    const args = commandInput.substring(1).trim();
    onCommandExecute(command.command, args);
    setShowCommands(false);
  }, [commandInput, onCommandExecute]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) {
      return;
    }

    dragDepthRef.current = 0;
    setIsDragOver(false);

    const extractPathsFromDataTransfer = (): string[] => {
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
              .map(line => normalizeDroppedPath(line))
              .filter(Boolean);
            collected.push(...paths);
          } else {
            const paths = data
              .split("\n")
              .map(line => normalizeDroppedPath(line))
              .filter(Boolean);
            collected.push(...paths);
          }
        } catch (error) {
          DragDropDebugger.log("warn", `读取 ${type} 失败`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });
      return collected;
    };

    const localFiles = Array.from(event.dataTransfer.files);
    DragDropDebugger.log("info", `获取到 ${localFiles.length} 个本地文件`);

    const supportedLocal = localFiles
      .filter(file => {
        const lower = file.name.toLowerCase();
        return SUPPORTED_FILE_EXTENSIONS.some(ext => lower.endsWith(ext)) || !lower.includes(".");
      })
      .map(file => {
        const fileWithPath = file as File & { path?: string; webkitRelativePath?: string };
        return normalizeDroppedPath(fileWithPath.path || fileWithPath.webkitRelativePath || file.name);
      })
      .filter(Boolean);

    const transferPaths = extractPathsFromDataTransfer();
    const candidatePaths = supportedLocal.length > 0 ? supportedLocal : transferPaths;
    const uniquePaths: string[] = [];
    const existingTags = new Set(extractTagPaths(serializeEditorContent()));

    candidatePaths.forEach(path => {
      if (!path) {
        return;
      }
      if (!existingTags.has(path)) {
        uniquePaths.push(path);
        existingTags.add(path);
      }
    });

    if (uniquePaths.length === 0) {
      DragDropDebugger.log("info", "拖拽的文件均已存在", { count: existingTags.size });
      return;
    }

    uniquePaths.forEach(path => {
      insertTagAtCursor(path);
    });
    handleDomChange();
  }, [disabled, handleDomChange, insertTagAtCursor, serializeEditorContent]);

  const [isDragOver, setIsDragOver] = useState(false);

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
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    if (text) {
      insertTextAtCursor(text);
      handleDomChange();
    }
  }, [handleDomChange, insertTextAtCursor]);

  const handleInput = useCallback(() => {
    handleDomChange();
  }, [handleDomChange]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!disabled && !isLoading && value.trim()) {
        onSend();
      }
      return;
    }
    if (event.key === "Escape") {
      setShowCommands(false);
      setShowSuggestions(false);
    }
  }, [disabled, isLoading, onSend, value]);

  useEffect(() => {
    renderValue(value);
    const tagsFromValue = extractTagPaths(value);
    if (!arraysEqual(tagsFromValue, lastFilesRef.current)) {
      lastFilesRef.current = tagsFromValue;
      if (onFilesChange) {
        onFilesChange(tagsFromValue);
      }
    }
  }, [value, onFilesChange, renderValue]);

  useEffect(() => {
    const tagsFromValue = extractTagPaths(value);
    const missing = (files || []).filter(path => !tagsFromValue.includes(path));
    if (missing.length > 0) {
      const appended = `${value}${value.endsWith(" ") || value.length === 0 ? "" : " "}${missing.map(path => `@/${path}`).join(" ")}`;
      onChange(appended);
    }
  }, [files, onChange, value]);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative border border-border rounded-lg bg-background p-2 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/40">
        <div
          ref={editorRef}
          className="min-h-[32px] w-full whitespace-pre-wrap break-words text-sm focus:outline-none"
          contentEditable={!disabled}
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        />
        {isEmpty && !isFocused && (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
            {placeholder}
          </span>
        )}
        {isDragOver && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10">
            <div className="text-center text-primary">
              <Sparkles className="mx-auto mb-1 h-5 w-5 animate-pulse" />
              <div className="text-xs font-medium">拖拽代码文件到这里</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Enter 发送，Shift+Enter 换行，/ 查看命令</span>
        </div>
        <Button
          onClick={onSend}
          disabled={!value.trim() || disabled || isLoading}
          size="sm"
          className="inline-flex items-center"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      {showSuggestions && suggestionList.length > 0 && (
        <div className="rounded-lg border border-border bg-background p-2 text-sm shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            <span>建议</span>
          </div>
          <div className="space-y-2">
            {suggestionList.map((suggestion, index) => (
              <button
                key={`${suggestion.text}-${index}`}
                type="button"
                className="w-full rounded-md border border-dashed border-border px-2 py-1 text-left transition hover:border-primary hover:bg-primary/5"
                onClick={() => handleSuggestionSelect(suggestion.text)}
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    {suggestion.type}
                  </Badge>
                  <span>{Math.round(suggestion.confidence * 100)}%</span>
                </div>
                <div className="text-sm text-foreground">{suggestion.text}</div>
                {suggestion.description && (
                  <div className="text-xs text-muted-foreground">{suggestion.description}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {showCommands && commandList.length > 0 && (
        <div className="rounded-lg border border-border bg-background p-2 text-sm shadow-sm">
          <div className="mb-2 text-xs text-muted-foreground">命令</div>
          <div className="space-y-1">
            {commandList.map((command, index) => (
              <button
                key={`${command.command}-${index}`}
                type="button"
                className="w-full rounded-md px-2 py-1 text-left transition hover:bg-primary/5"
                onClick={() => handleCommandSelect(command)}
              >
                <div className="text-xs font-mono text-muted-foreground">/{command.command}</div>
                <div className="text-sm text-foreground">{command.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommitTextArea;
