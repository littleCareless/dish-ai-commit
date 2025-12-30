import { postMessage, useMessageHandler } from "@/utils/vscode";
import type { ChatMessage, CommitChatState } from "@shared/types/messages";
import { VSCodeButton, VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
import { Bot, Loader2, Send, User } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { themeStyles } from "@/utils/theme";

interface CommitChatViewProps {
  className?: string;
  onCommitMessageGenerated?: (message: string) => void;
  onConfigurationChanged?: (config: Record<string, unknown>) => void;
}

const CommitChatView: React.FC<CommitChatViewProps> = ({
  className = "",
  onCommitMessageGenerated,
  onConfigurationChanged,
}) => {
  const [state, setState] = useState<CommitChatState>({
    messages: [],
    inputValue: "",
    isTyping: false,
    selectedImages: [],
    draftMessage: "",
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  // 处理消息发送
  const handleSendMessage = async () => {
    if (!state.inputValue.trim() || state.isTyping) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      content: state.inputValue.trim(),
      timestamp: new Date(),
    };

    // 添加用户消息
    setState((prev: CommitChatState) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      inputValue: "",
      isTyping: true,
    }));

    try {
      // 发送消息到后端处理
      postMessage("commitChatMessage", {
        message: userMessage.content,
        context: {
          messages: state.messages,
          selectedImages: state.selectedImages,
        },
      });
    } catch (error) {
      console.error("发送消息失败:", error);
      setState((prev: CommitChatState) => ({
        ...prev,
        isTyping: false,
      }));
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState((prev: CommitChatState) => ({
      ...prev,
      inputValue: e.target.value,
    }));
  };

  // 监听来自后端的消息
  useMessageHandler(
    useCallback(
      (event: MessageEvent) => {
        const message = event.data;

        if (message.command === "commitChatResponse") {
          const aiMessage: ChatMessage = {
            id: `ai-${Date.now()}`,
            type: "ai",
            content: message.data.response,
            timestamp: new Date(),
            metadata: message.data.metadata,
          };

          setState((prev: CommitChatState) => ({
            ...prev,
            messages: [...prev.messages, aiMessage],
            isTyping: false,
          }));

          // 如果有生成的 commit message，通知父组件
          if (
            message.data.metadata?.commitMessage &&
            onCommitMessageGenerated
          ) {
            onCommitMessageGenerated(message.data.metadata.commitMessage);
          }

          // 如果有配置变更，通知父组件
          if (message.data.metadata?.configuration && onConfigurationChanged) {
            onConfigurationChanged(message.data.metadata.configuration);
          }
        }
      },
      [onCommitMessageGenerated, onConfigurationChanged],
    ),
  );

  // 渲染消息
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === "user";

    // 用户消息样式
    const userStyles: React.CSSProperties = {
      backgroundColor: "var(--chat-user-bg)",
      color: "var(--chat-user-fg)",
      border: `1px solid ${themeStyles.border("subtle")}`,
    };

    // AI 消息样式
    const aiStyles: React.CSSProperties = {
      backgroundColor: "var(--chat-ai-bg)",
      color: "var(--chat-ai-fg)",
      border: `1px solid ${themeStyles.border("subtle")}`,
    };

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`flex items-start gap-3 max-w-[80%] ${
            isUser ? "flex-row-reverse" : ""
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              isUser
                ? "bg-[hsl(var(--chat-user-bg))] text-[hsl(var(--chat-user-fg))]"
                : "bg-[hsl(var(--chat-ai-bg))] text-[hsl(var(--chat-ai-fg))]"
            }`}
            style={{
              backgroundColor: isUser
                ? "var(--chat-user-bg)"
                : "var(--chat-ai-bg)",
              color: isUser ? "var(--chat-user-fg)" : "var(--chat-ai-fg)",
            }}
          >
            {isUser ? (
              <User className="w-4 h-4" />
            ) : (
              <Bot className="w-4 h-4" />
            )}
          </div>
          <div
            className="rounded-lg px-4 py-3"
            style={isUser ? userStyles : aiStyles}
          >
            <div className="text-sm whitespace-pre-wrap leading-relaxed">
              {message.content}
            </div>

            {/* Commit Message Display */}
            {message.metadata?.commitMessage && (
              <div
                className="mt-3 p-3 rounded-lg border"
                style={{
                  backgroundColor: themeStyles.background(0.8),
                  borderColor: themeStyles.border("normal"),
                }}
              >
                <div
                  className="text-xs mb-2 font-medium"
                  style={{ color: "var(--vscode-descriptionForeground)" }}
                >
                  生成的 Commit Message:
                </div>
                <div
                  className="font-mono text-sm p-2 rounded border"
                  style={{
                    backgroundColor: themeStyles.background(0.5),
                    borderColor: themeStyles.border("normal"),
                  }}
                >
                  {message.metadata.commitMessage}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {message.metadata?.suggestions &&
              message.metadata.suggestions.length > 0 && (
                <div className="mt-3">
                  <div
                    className="text-xs mb-2 font-medium"
                    style={{ color: "var(--vscode-descriptionForeground)" }}
                  >
                    建议:
                  </div>
                  <div className="space-y-2">
                    {message.metadata.suggestions.map(
                      (suggestion: string, index: number) => (
                        <div
                          key={index}
                          className="text-sm p-2 rounded border cursor-pointer transition-colors"
                          style={{
                            backgroundColor: themeStyles.background(0.8),
                            borderColor: themeStyles.border("normal"),
                            color: themeStyles.foreground(),
                          }}
                          onClick={() =>
                            setState((prev: CommitChatState) => ({
                              ...prev,
                              inputValue: suggestion,
                            }))
                          }
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              themeStyles.hover();
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              themeStyles.background(0.8);
                          }}
                        >
                          {suggestion}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

            {/* Timestamp */}
            <div
              className="text-xs mt-2"
              style={{
                color: "var(--vscode-descriptionForeground)",
                opacity: 0.7,
              }}
            >
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`h-full flex flex-col ${className}`}
      style={{
        backgroundColor: themeStyles.background(),
        color: themeStyles.foreground(),
      }}
    >
      {/* Header */}
      <div
        className="border-b"
        style={{
          backgroundColor: themeStyles.background(0.95),
          backdropFilter: "blur(8px)",
          borderColor: themeStyles.border("normal"),
        }}
      >
        <div className="flex items-center gap-3 p-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: "var(--primary)",
              opacity: 0.1,
              color: "var(--primary)",
            }}
          >
            <Bot className="w-5 h-5" style={{ color: "var(--primary)" }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Commit Message 聊天助手</h1>
            <p
              className="text-sm"
              style={{ color: "var(--vscode-descriptionForeground)" }}
            >
              智能生成和优化你的提交信息
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {state.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                style={{
                  backgroundColor: themeStyles.background(0.5),
                  color: themeStyles.foreground(0.5),
                }}
              >
                <Bot className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                欢迎使用 Commit Message 聊天助手
              </h3>
              <p
                className="mb-6 max-w-md"
                style={{ color: "var(--vscode-descriptionForeground)" }}
              >
                告诉我你想要什么样的 commit
                message，我会帮你生成和优化。你可以描述你的代码变更，或者指定你喜欢的提交信息风格。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg">
                <div
                  className="p-3 rounded-lg text-sm"
                  style={{
                    backgroundColor: themeStyles.background(0.5),
                    borderColor: themeStyles.border("normal"),
                  }}
                >
                  <strong>示例：</strong> 添加用户登录功能
                </div>
                <div
                  className="p-3 rounded-lg text-sm"
                  style={{
                    backgroundColor: themeStyles.background(0.5),
                    borderColor: themeStyles.border("normal"),
                  }}
                >
                  <strong>示例：</strong> 修复登录页面的样式问题
                </div>
                <div
                  className="p-3 rounded-lg text-sm"
                  style={{
                    backgroundColor: themeStyles.background(0.5),
                    borderColor: themeStyles.border("normal"),
                  }}
                >
                  <strong>示例：</strong> 使用 conventional commits 格式
                </div>
                <div
                  className="p-3 rounded-lg text-sm"
                  style={{
                    backgroundColor: themeStyles.background(0.5),
                    borderColor: themeStyles.border("normal"),
                  }}
                >
                  <strong>示例：</strong> 生成简洁的提交信息
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {state.messages.map(renderMessage)}
              {state.isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-3 max-w-[80%]">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: "var(--chat-ai-bg)",
                        color: "var(--chat-ai-fg)",
                      }}
                    >
                      <Bot className="w-4 h-4" />
                    </div>
                    <div
                      className="rounded-lg px-4 py-3"
                      style={{
                        backgroundColor: "var(--chat-ai-bg)",
                        color: "var(--chat-ai-fg)",
                        border: `1px solid ${themeStyles.border("subtle")}`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">AI 正在思考...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div
        className="border-t"
        style={{
          backgroundColor: themeStyles.background(0.95),
          backdropFilter: "blur(8px)",
          borderColor: themeStyles.border("normal"),
        }}
      >
        <div className="p-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <VSCodeTextArea
                ref={textareaRef as any}
                value={state.inputValue}
                onInput={(e: any) =>
                  handleInputChange({
                    target: { value: e.target.value },
                  } as React.ChangeEvent<HTMLTextAreaElement>)
                }
                onKeyDown={handleKeyDown}
                placeholder="描述你的代码变更，或者告诉我你想要的 commit message 风格..."
                className="min-h-[60px] max-h-[120px] resize-none pr-12"
                disabled={state.isTyping}
              />
              <div
                className="absolute bottom-2 right-2 text-xs"
                style={{ color: "var(--vscode-descriptionForeground)" }}
              >
                {state.inputValue.length}/500
              </div>
            </div>
            <VSCodeButton
              onClick={handleSendMessage}
              disabled={!state.inputValue.trim() || state.isTyping}
              className="self-end h-[60px] w-[60px]"
            >
              <Send className="w-5 h-5" />
            </VSCodeButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommitChatView;
