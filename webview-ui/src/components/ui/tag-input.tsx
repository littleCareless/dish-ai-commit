import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import React, { ChangeEvent, KeyboardEvent, useState } from "react";

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  /** 是否为路径模式（不自动添加点号前缀） */
  isPathPattern?: boolean;
}

/**
 * 标签输入组件
 * 用于输入和管理文件扩展名列表或路径模式列表
 */
export const TagInput: React.FC<TagInputProps> = ({
  value = [],
  onChange,
  placeholder = "添加标签...",
  className = "",
  isPathPattern = false,
}) => {
  const [inputValue, setInputValue] = useState("");

  /**
   * 标准化扩展名/路径模式
   * 扩展名：自动添加点号前缀、转换为小写
   * 路径模式：保持原样
   */
  const normalizeTag = (tag: string): string => {
    tag = tag.trim();

    if (!tag) {
      return "";
    }

    if (isPathPattern) {
      // 路径模式保持原样
      return tag;
    } else {
      // 文件扩展名：转换为小写并添加点号前缀
      tag = tag.toLowerCase();
      if (!tag.startsWith(".")) {
        tag = "." + tag;
      }
      return tag;
    }
  };

  /**
   * 添加标签
   */
  const addTag = (tag: string) => {
    const normalized = normalizeTag(tag);
    if (normalized && !value.includes(normalized)) {
      onChange([...value, normalized]);
    }
    setInputValue("");
  };

  /**
   * 删除标签
   */
  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  /**
   * 处理输入变化
   */
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      // Backspace 删除最后一个标签
      removeTag(value.length - 1);
    }
  };

  /**
   * 处理粘贴事件（支持批量粘贴）
   */
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");

    // 支持逗号、空格、换行分隔
    const tags = pastedText.split(/[,\s\n]+/).filter(Boolean);
    const newTags = tags
      .map(normalizeTag)
      .filter((tag) => tag && !value.includes(tag));

    if (newTags.length > 0) {
      onChange([...value, ...newTags]);
    }
  };

  /**
   * 处理失去焦点
   */
  const handleBlur = () => {
    if (inputValue) {
      addTag(inputValue);
    }
  };

  return (
    <div
      className={`flex flex-wrap gap-2 p-2 border border-[var(--vscode-input-border)] rounded bg-[var(--vscode-input-background)] min-h-[42px] focus-within:border-[var(--vscode-focusBorder)] ${className}`}
    >
      {value.map((tag, index) => (
        <Badge
          key={index}
          variant="secondary"
          className="gap-1 px-2 py-1 text-sm"
        >
          {tag}
          <X
            className="w-3 h-3 cursor-pointer hover:text-[var(--vscode-errorForeground)] transition-colors"
            onClick={() => removeTag(index)}
          />
        </Badge>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlur}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] bg-transparent border-0 outline-none text-[var(--vscode-input-foreground)] placeholder:text-[var(--vscode-input-placeholderForeground)] px-1"
        style={{ caretColor: "var(--vscode-editorCursor-foreground)" }}
      />
    </div>
  );
};
