import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Sparkles } from 'lucide-react';

export interface CommitSuggestion {
  text: string;
  type: 'template' | 'style' | 'convention' | 'custom';
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
  placeholder = "描述你的代码变更，或者告诉我你想要的 commit message 风格...",
  disabled = false,
  isLoading = false,
  suggestions = [],
  commands = [],
  className = '',
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // 检查是否是命令输入
    if (newValue.startsWith('/')) {
      setShowCommands(true);
      setCommandInput(newValue);
    } else {
      setShowCommands(false);
      setCommandInput('');
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isLoading && value.trim()) {
        onSend();
      }
    } else if (e.key === 'Escape') {
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
    setCommandInput('');
  };

  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
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

  // 渲染命令
  const renderCommands = () => {
    if (!showCommands || commands.length === 0) return null;

    const filteredCommands = commands.filter(cmd =>
      cmd.command.toLowerCase().includes(commandInput.toLowerCase().substring(1))
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

      {/* 输入区域 */}
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[60px] max-h-[120px] resize-none pr-10"
          />
          
          {/* 智能提示图标 */}
          {suggestions.length > 0 && (
            <div className="absolute right-2 top-2">
              <Sparkles size={16} className="text-muted-foreground" />
            </div>
          )}
        </div>

        <Button
          onClick={onSend}
          disabled={!value.trim() || disabled || isLoading}
          size="icon"
          className="self-end"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </Button>
      </div>

      {/* 输入提示 */}
      <div className="text-xs text-muted-foreground mt-1">
        Enter 发送，Shift+Enter 换行，/ 查看命令
      </div>
    </div>
  );
};

export default CommitTextArea;
