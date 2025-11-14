export enum MessageType {
  // From Webview
  GetAllPrompts = "getAllPrompts",
  UpdatePrompt = "updatePrompt",
  ResetPrompt = "resetPrompt",
  ResetAllPrompts = "resetAllPrompts",
  CreatePrompt = "createPrompt",
  DeletePrompt = "deletePrompt",
  RenamePrompt = "renamePrompt",

  // From Extension
  AllPrompts = "allPrompts",
}
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