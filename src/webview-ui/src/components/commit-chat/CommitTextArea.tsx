import React, { useState, useRef, useEffect } from "react";
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
  onFilesDropped?: (filePaths: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  suggestions?: CommitSuggestion[];
  commands?: CommitCommand[];
  className?: string;
}

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
  const [droppedFiles, setDroppedFiles] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // 检查是否是命令输入
    if (newValue.startsWith("/")) {
      setShowCommands(true);
      setCommandInput(newValue);
    } else {
      setShowCommands(false);
      setCommandInput("");
    }

    // 显示建议
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
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isLoading && value.trim()) {
        onSend();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setShowCommands(false);
    }
  };

  // 处理建议点击
  const handleSuggestionClick = (suggestion: CommitSuggestion) => {
    if (onSuggestionClick) {
      onSuggestionClick(suggestion.text);
    }
    setShowSuggestions(false);
  };

  // 处理命令执行
  const handleCommandExecute = (command: CommitCommand) => {
    if (onCommandExecute) {
      const args = commandInput.substring(1).trim(); // 移除开头的 '/'
      onCommandExecute(command.command, args);
    }
    setShowCommands(false);
    setCommandInput("");
  };

  // 处理拖拽事件
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    DragDropDebugger.log("info", "拖拽进入");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    DragDropDebugger.log("info", "拖拽离开");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    let filePaths: string[] = [];

    // 调试：打印所有可用的数据类型和数据
    DragDropDebugger.log("info", "开始处理拖拽", {
      types: Array.from(e.dataTransfer.types),
      filesCount: e.dataTransfer.files.length,
      effectAllowed: e.dataTransfer.effectAllowed,
      dropEffect: e.dataTransfer.dropEffect,
    });

    // 尝试从 dataTransfer 获取文件
    const files = Array.from(e.dataTransfer.files);
    DragDropDebugger.log("info", `获取到 ${files.length} 个本地文件`);

    if (files.length > 0) {
      // 本地文件拖拽
      const supportedExtensions = [
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

      const validFiles = files.filter((file) => {
        const fileName = file.name.toLowerCase();
        return (
          supportedExtensions.some((ext) => fileName.endsWith(ext)) ||
          fileName.includes(".") === false
        );
      });

      if (validFiles.length > 0) {
        // File 对象没有 path 属性，使用 name 或通过特殊处理
        // 在大多数浏览器中，我们只能通过 dataTransfer 获取文件路径信息
        filePaths = validFiles.map((file) => {
          // 尝试获取完整路径（如果可用）或使用文件名
          const fileWithPath = file as unknown as Record<string, unknown>;
          return (
            (fileWithPath.path as string | undefined) ||
            (fileWithPath.webkitRelativePath as string | undefined) ||
            file.name
          );
        });
        DragDropDebugger.log("success", "本地文件路径", { paths: filePaths });
      }
    }

    // 如果没有获取到本地文件，尝试获取拖拽的文本数据（VS Code SCM 文件路径）
    if (filePaths.length === 0) {
      // 尝试多种数据格式
      const dataTypes = [
        "text/plain",
        "text/uri-list",
        "text/html",
        "text",
        "application/x-moz-file",
        "Files",
      ];

      for (const dataType of dataTypes) {
        try {
          const data = e.dataTransfer.getData(dataType);
          if (data && data.trim().length > 0) {
            DragDropDebugger.log("info", `获取到 ${dataType} 数据`, {
              dataLength: data.length,
              preview: data.substring(0, 200),
            });

            if (dataType === "text/uri-list" || dataType === "text/html") {
              // 处理 URI 列表或 HTML 数据
              filePaths = data
                .split("\n")
                .map((line) => {
                  const trimmed = line.trim();
                  if (!trimmed || trimmed.startsWith("#")) {
                    return "";
                  }

                  try {
                    // 尝试解析 file:// URI
                    if (trimmed.startsWith("file://")) {
                      // 移除 file:// 前缀并解码
                      return decodeURIComponent(
                        trimmed.replace(/^file:\/\//, "")
                      );
                    }
                    // 尝试作为 URL 解析
                    if (trimmed.includes("://")) {
                      const url = new URL(trimmed);
                      return decodeURIComponent(url.pathname);
                    }
                    // 直接返回去除前后空格的内容
                    return trimmed;
                  } catch {
                    return trimmed;
                  }
                })
                .filter((path: string) => path.length > 0);
            } else {
              // 处理普通文本数据（可能是文件路径）
              filePaths = data
                .split("\n")
                .map((line: string) => line.trim())
                .filter(
                  (line: string) =>
                    line.length > 0 &&
                    (line.includes("/") || line.includes("\\\\"))
                );
            }

            if (filePaths.length > 0) {
              DragDropDebugger.log("success", "解析得到的文件路径", {
                count: filePaths.length,
                paths: filePaths.slice(0, 5), // 只显示前 5 个
              });
              break;
            }
          }
        } catch (error) {
          DragDropDebugger.log("warn", `读取 ${dataType} 失败`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    if (filePaths.length > 0) {
      setDroppedFiles(filePaths);

      // 将文件路径添加到输入内容中
      const fileList = filePaths.map((path) => `- ${path}`).join("\n");
      const newValue = value
        ? `${value}\n\n拖拽的文件:\n${fileList}`
        : `拖拽的文件:\n${fileList}`;
      onChange(newValue);

      DragDropDebugger.log("success", "已添加文件到输入框", {
        count: filePaths.length,
      });

      // 通知父组件文件被拖拽
      if (onFilesDropped) {
        onFilesDropped(filePaths);
      }
    } else {
      // 拖拽无效数据
      DragDropDebugger.log(
        "error",
        "未能识别的拖拽数据，请从 SCM 资源管理器拖拽文件"
      );
    }
  };

  // 清除拖拽的文件
  const clearDroppedFiles = () => {
    setDroppedFiles([]);
    // 从输入内容中移除文件列表
    const lines = value.split("\n");
    const fileListStartIndex = lines.findIndex((line) =>
      line.includes("拖拽的文件:")
    );
    if (fileListStartIndex !== -1) {
      const newLines = lines.slice(0, fileListStartIndex);
      onChange(newLines.join("\n").trim());
    }
  };

  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [value]);

  // 渲染建议
  const renderSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) return null;

    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border border-border rounded-lg shadow-lg p-2 z-10">
        <div className="text-xs text-muted-foreground mb-2">建议:</div>
        <div className="space-y-1">
          {suggestions.slice(0, 5).map((suggestion, index) => (
            <div
              key={index}
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
                <Badge
                  variant="secondary"
                  className="text-xs"
                >
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

  // 渲染命令
  const renderCommands = () => {
    if (!showCommands || commands.length === 0) return null;

    const filteredCommands = commands.filter((cmd) =>
      cmd.command
        .toLowerCase()
        .includes(commandInput.toLowerCase().substring(1))
    );

    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border border-border rounded-lg shadow-lg p-2 z-10">
        <div className="text-xs text-muted-foreground mb-2">命令:</div>
        <div className="space-y-1">
          {filteredCommands.slice(0, 5).map((command, index) => (
            <div
              key={index}
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
      {/* 建议和命令面板 */}
      {renderSuggestions()}
      {renderCommands()}

      {/* 拖拽的文件显示 */}
      {droppedFiles.length > 0 && (
        <div className="mb-2 p-3 bg-muted rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 text-sm font-medium">
              <FileText
                size={16}
                className="text-primary"
              />
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
            {droppedFiles.map((file, index) => {
              const fileName = file.split("/").pop() || file;
              const fileExtension =
                fileName.split(".").pop()?.toLowerCase() || "";
              const getFileIcon = (ext: string) => {
                const iconMap: Record<string, string> = {
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
                return iconMap[ext] || "📄";
              };

              return (
                <div
                  key={index}
                  className="flex items-center space-x-2 text-xs text-muted-foreground"
                >
                  <span className="text-sm">{getFileIcon(fileExtension)}</span>
                  <span
                    className="font-mono flex-1 truncate"
                    title={file}
                  >
                    {fileName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 输入区域 */}
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

          {/* 智能提示图标 */}
          {suggestions.length > 0 && (
            <div className="absolute right-2 top-2 pointer-events-none">
              <Sparkles
                size={16}
                className="text-muted-foreground"
              />
            </div>
          )}

          {/* 拖拽提示 */}
          {isDragOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg z-10 pointer-events-none">
              <div className="text-center">
                <FileText
                  size={24}
                  className="mx-auto mb-2 text-primary animate-pulse"
                />
                <div className="text-sm font-medium text-primary">
                  拖拽代码文件到这里
                </div>
                <div className="text-xs text-primary/70 mt-1">
                  支持 .ts, .js, .py, .java 等代码文件
                </div>
              </div>
            </div>
          )}

          {/* 拖拽事件捕获层 - 透明覆盖层确保捕获所有拖拽事件 */}
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
          {isLoading ? (
            <Loader2
              size={16}
              className="animate-spin"
            />
          ) : (
            <Send size={16} />
          )}
        </Button>
      </div>

      {/* 输入提示 */}
      <div className="text-xs text-muted-foreground mt-1">
        Enter 发送，Shift+Enter 换行，/ 查看命令
        {droppedFiles.length === 0 && (
          <span className="ml-2 text-primary">
            💡 提示：可以从 SCM 资源管理器拖拽文件到输入框
          </span>
        )}
      </div>
    </div>
  );
};

export default CommitTextArea;
