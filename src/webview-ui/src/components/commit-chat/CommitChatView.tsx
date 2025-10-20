import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { vscode } from '@/lib/vscode';

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  metadata?: {
    commitMessage?: string;
    suggestions?: string[];
    confidence?: number;
  };
}

export interface CommitChatState {
  messages: ChatMessage[];
  inputValue: string;
  isTyping: boolean;
  selectedImages: string[];
  draftMessage: string;
}

interface CommitChatViewProps {
  className?: string;
  onCommitMessageGenerated?: (message: string) => void;
  onConfigurationChanged?: (config: Record<string, any>) => void;
}

const CommitChatView: React.FC<CommitChatViewProps> = ({
  className = '',
  onCommitMessageGenerated,
  onConfigurationChanged,
}) => {
  const [state, setState] = useState<CommitChatState>({
    messages: [],
    inputValue: '',
    isTyping: false,
    selectedImages: [],
    draftMessage: '',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  // 处理消息发送
  const handleSendMessage = async () => {
    if (!state.inputValue.trim() || state.isTyping) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: state.inputValue.trim(),
      timestamp: new Date(),
    };

    // 添加用户消息
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      inputValue: '',
      isTyping: true,
    }));

    try {
      // 发送消息到后端处理
      if (vscode) {
        vscode.postMessage({
          command: 'commitChatMessage',
          data: {
            message: userMessage.content,
            context: {
              messages: state.messages,
              selectedImages: state.selectedImages,
            },
          },
        });
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      setState(prev => ({
        ...prev,
        isTyping: false,
      }));
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState(prev => ({
      ...prev,
      inputValue: e.target.value,
    }));
  };

  // 监听来自后端的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      if (message.command === 'commitChatResponse') {
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: message.data.response,
          timestamp: new Date(),
          metadata: message.data.metadata,
        };

        setState(prev => ({
          ...prev,
          messages: [...prev.messages, aiMessage],
          isTyping: false,
        }));

        // 如果有生成的 commit message，通知父组件
        if (message.data.metadata?.commitMessage && onCommitMessageGenerated) {
          onCommitMessageGenerated(message.data.metadata.commitMessage);
        }

        // 如果有配置变更，通知父组件
        if (message.data.metadata?.configuration && onConfigurationChanged) {
          onConfigurationChanged(message.data.metadata.configuration);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onCommitMessageGenerated, onConfigurationChanged]);

  // 渲染消息
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    
    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`flex items-start space-x-2 max-w-[80%] ${
            isUser ? 'flex-row-reverse space-x-reverse' : ''
          }`}
        >
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              isUser
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {isUser ? <User size={16} /> : <Bot size={16} />}
          </div>
          <div
            className={`rounded-lg px-3 py-2 ${
              isUser
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
            {message.metadata?.commitMessage && (
              <div className="mt-2 p-2 bg-background rounded border">
                <div className="text-xs text-muted-foreground mb-1">生成的 Commit Message:</div>
                <div className="font-mono text-sm">{message.metadata.commitMessage}</div>
              </div>
            )}
            {message.metadata?.suggestions && message.metadata.suggestions.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-muted-foreground mb-1">建议:</div>
                <div className="space-y-1">
                  {message.metadata.suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="text-xs p-1 bg-background rounded border cursor-pointer hover:bg-muted"
                      onClick={() => setState(prev => ({ ...prev, inputValue: suggestion }))}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={`h-full flex flex-col ${className}`}>
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center space-x-2">
          <Bot size={20} />
          <span>Commit Message 聊天助手</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        {/* 消息列表 */}
        <ScrollArea className="flex-1 p-4">
          {state.messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Bot size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">欢迎使用 Commit Message 聊天助手</p>
              <p className="text-sm">
                告诉我你想要什么样的 commit message，我会帮你生成和优化
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {state.messages.map(renderMessage)}
              {state.isTyping && (
                <div className="flex justify-start mb-4">
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                      <Bot size={16} />
                    </div>
                    <div className="bg-muted text-muted-foreground rounded-lg px-3 py-2">
                      <div className="flex items-center space-x-1">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-sm">AI 正在思考...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* 输入区域 */}
        <div className="flex-shrink-0 p-4 border-t">
          <div className="flex space-x-2">
            <Textarea
              ref={textareaRef}
              value={state.inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="描述你的代码变更，或者告诉我你想要的 commit message 风格..."
              className="flex-1 min-h-[60px] max-h-[120px] resize-none"
              disabled={state.isTyping}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!state.inputValue.trim() || state.isTyping}
              size="icon"
              className="self-end"
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommitChatView;
