import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, CommitChatState } from '@/components/commit-chat/CommitChatView';

export interface CommitChatConfig {
  maxMessages: number;
  autoSaveDraft: boolean;
  draftSaveInterval: number;
  enableHistory: boolean;
  maxHistorySize: number;
}

const defaultConfig: CommitChatConfig = {
  maxMessages: 100,
  autoSaveDraft: true,
  draftSaveInterval: 2000,
  enableHistory: true,
  maxHistorySize: 50,
};

export const useCommitChatState = (config: Partial<CommitChatConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config };
  const draftSaveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const [state, setState] = useState<CommitChatState>({
    messages: [],
    inputValue: '',
    isTyping: false,
    selectedImages: [],
    draftMessage: '',
  });

  // 保存草稿
  const saveDraft = useCallback(() => {
    if (finalConfig.autoSaveDraft && state.inputValue.trim()) {
      localStorage.setItem('commit-chat-draft', state.inputValue);
    }
  }, [state.inputValue, finalConfig.autoSaveDraft]);

  // 加载草稿
  const loadDraft = useCallback(() => {
    if (finalConfig.autoSaveDraft) {
      const savedDraft = localStorage.getItem('commit-chat-draft');
      if (savedDraft) {
        setState(prev => ({
          ...prev,
          inputValue: savedDraft,
        }));
      }
    }
  }, [finalConfig.autoSaveDraft]);

  // 清除草稿
  const clearDraft = useCallback(() => {
    localStorage.removeItem('commit-chat-draft');
    setState(prev => ({
      ...prev,
      inputValue: '',
    }));
  }, []);

  // 添加消息
  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `${message.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    setState(prev => {
      const newMessages = [...prev.messages, newMessage];
      
      // 限制消息数量
      if (newMessages.length > finalConfig.maxMessages) {
        return {
          ...prev,
          messages: newMessages.slice(-finalConfig.maxMessages),
        };
      }
      
      return {
        ...prev,
        messages: newMessages,
      };
    });

    return newMessage;
  }, [finalConfig.maxMessages]);

  // 更新消息
  const updateMessage = useCallback((messageId: string, updates: Partial<ChatMessage>) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      ),
    }));
  }, []);

  // 删除消息
  const deleteMessage = useCallback((messageId: string) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.filter(msg => msg.id !== messageId),
    }));
  }, []);

  // 清空消息历史
  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
    }));
  }, []);

  // 设置输入值
  const setInputValue = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      inputValue: value,
    }));
  }, []);

  // 设置打字状态
  const setIsTyping = useCallback((isTyping: boolean) => {
    setState(prev => ({
      ...prev,
      isTyping,
    }));
  }, []);

  // 添加图片
  const addImage = useCallback((imagePath: string) => {
    setState(prev => ({
      ...prev,
      selectedImages: [...prev.selectedImages, imagePath],
    }));
  }, []);

  // 移除图片
  const removeImage = useCallback((imagePath: string) => {
    setState(prev => ({
      ...prev,
      selectedImages: prev.selectedImages.filter(img => img !== imagePath),
    }));
  }, []);

  // 清空图片
  const clearImages = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedImages: [],
    }));
  }, []);

  // 获取对话上下文
  const getConversationContext = useCallback(() => {
    return {
      messages: state.messages,
      selectedImages: state.selectedImages,
      recentMessages: state.messages.slice(-10), // 最近10条消息作为上下文
    };
  }, [state.messages, state.selectedImages]);

  // 导出对话历史
  const exportHistory = useCallback(() => {
    const history = {
      messages: state.messages,
      exportTime: new Date().toISOString(),
      version: '1.0',
    };
    
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commit-chat-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state.messages]);

  // 导入对话历史
  const importHistory = useCallback((historyData: { messages: ChatMessage[] }) => {
    if (historyData.messages && Array.isArray(historyData.messages)) {
      setState(prev => ({
        ...prev,
        messages: historyData.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }));
    }
  }, []);

  // 自动保存草稿
  useEffect(() => {
    if (finalConfig.autoSaveDraft && state.inputValue.trim()) {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
      
      draftSaveTimeoutRef.current = setTimeout(() => {
        saveDraft();
      }, finalConfig.draftSaveInterval);
    }

    return () => {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, [state.inputValue, finalConfig.autoSaveDraft, finalConfig.draftSaveInterval, saveDraft]);

  // 组件卸载时保存草稿
  useEffect(() => {
    return () => {
      saveDraft();
    };
  }, [saveDraft]);

  return {
    state,
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
    setInputValue,
    setIsTyping,
    addImage,
    removeImage,
    clearImages,
    getConversationContext,
    exportHistory,
    importHistory,
    loadDraft,
    clearDraft,
  };
};
