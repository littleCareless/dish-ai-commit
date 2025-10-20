import React from 'react';
import { Bot, Copy, ThumbsUp, ThumbsDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChatMessage } from './CommitChatView';

interface AIMessageProps {
  message: ChatMessage;
  onCopy?: (content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onFeedback?: (messageId: string, feedback: 'positive' | 'negative') => void;
  onSuggestionClick?: (suggestion: string) => void;
  showActions?: boolean;
}

const AIMessage: React.FC<AIMessageProps> = ({
  message,
  onCopy,
  onRegenerate,
  onFeedback,
  onSuggestionClick,
  showActions = true,
}) => {
  const [feedback, setFeedback] = React.useState<'positive' | 'negative' | null>(null);

  const handleCopy = () => {
    if (onCopy) {
      onCopy(message.content);
    } else {
      navigator.clipboard.writeText(message.content);
    }
  };

  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate(message.id);
    }
  };

  const handleFeedback = (type: 'positive' | 'negative') => {
    setFeedback(type);
    if (onFeedback) {
      onFeedback(message.id, type);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    }
  };

  const renderCommitMessage = (commitMessage: string) => (
    <div className="mt-3 p-3 bg-background rounded-lg border border-border">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-muted-foreground">
          生成的 Commit Message
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigator.clipboard.writeText(commitMessage)}
          className="h-6 px-2 text-xs"
        >
          <Copy size={12} className="mr-1" />
          复制
        </Button>
      </div>
      <div className="font-mono text-sm bg-muted p-2 rounded border">
        {commitMessage}
      </div>
    </div>
  );

  const renderSuggestions = (suggestions: string[]) => (
    <div className="mt-3">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        建议的输入:
      </div>
      <div className="space-y-1">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="text-xs p-2 bg-muted rounded border cursor-pointer hover:bg-muted/80 transition-colors"
            onClick={() => handleSuggestionClick(suggestion)}
          >
            {suggestion}
          </div>
        ))}
      </div>
    </div>
  );

  const renderConfidence = (confidence: number) => {
    const getConfidenceColor = (conf: number) => {
      if (conf >= 0.8) return 'bg-green-500';
      if (conf >= 0.6) return 'bg-yellow-500';
      return 'bg-red-500';
    };

    return (
      <div className="mt-2 flex items-center space-x-2">
        <div className="text-xs text-muted-foreground">置信度:</div>
        <div className="flex items-center space-x-1">
          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${getConfidenceColor(confidence)} transition-all duration-300`}
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {Math.round(confidence * 100)}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-start space-x-2 max-w-[80%]">
        {/* AI 头像 */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
          <Bot size={16} />
        </div>

        {/* 消息内容 */}
        <div className="bg-muted text-muted-foreground rounded-lg px-3 py-2 relative group">
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>

          {/* 元数据渲染 */}
          {message.metadata?.commitMessage && renderCommitMessage(message.metadata.commitMessage)}
          {message.metadata?.suggestions && message.metadata.suggestions.length > 0 && 
            renderSuggestions(message.metadata.suggestions)}
          {message.metadata?.confidence && renderConfidence(message.metadata.confidence)}

          {/* 时间戳 */}
          <div className="text-xs opacity-70 mt-1">
            {message.timestamp.toLocaleTimeString()}
          </div>

          {/* 操作按钮 */}
          {showActions && (
            <div className="absolute -left-12 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={handleCopy}
                title="复制消息"
              >
                <Copy size={12} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={handleRegenerate}
                title="重新生成"
              >
                <RefreshCw size={12} />
              </Button>
            </div>
          )}

          {/* 反馈按钮 */}
          {showActions && (
            <div className="mt-2 flex space-x-1">
              <Button
                size="sm"
                variant="ghost"
                className={`h-6 px-2 text-xs ${
                  feedback === 'positive' ? 'text-green-600' : 'text-muted-foreground'
                }`}
                onClick={() => handleFeedback('positive')}
                title="有用"
              >
                <ThumbsUp size={12} className="mr-1" />
                有用
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={`h-6 px-2 text-xs ${
                  feedback === 'negative' ? 'text-red-600' : 'text-muted-foreground'
                }`}
                onClick={() => handleFeedback('negative')}
                title="无用"
              >
                <ThumbsDown size={12} className="mr-1" />
                无用
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIMessage;
