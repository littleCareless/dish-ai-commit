import React from 'react';
import { User, Copy, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatMessage } from './CommitChatView';

interface UserMessageProps {
  message: ChatMessage;
  onCopy?: (content: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  showActions?: boolean;
}

const UserMessage: React.FC<UserMessageProps> = ({
  message,
  onCopy,
  onEdit,
  onDelete,
  showActions = true,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(message.content);

  const handleCopy = () => {
    if (onCopy) {
      onCopy(message.content);
    } else {
      navigator.clipboard.writeText(message.content);
    }
  };

  const handleEdit = () => {
    if (isEditing) {
      if (onEdit && editContent.trim() !== message.content) {
        onEdit(message.id, editContent.trim());
      }
      setIsEditing(false);
    } else {
      setIsEditing(true);
      setEditContent(message.content);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(message.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  return (
    <div className="flex justify-end mb-4">
      <div className="flex items-start space-x-2 max-w-[80%] flex-row-reverse space-x-reverse">
        {/* 用户头像 */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <User size={16} />
        </div>

        {/* 消息内容 */}
        <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 relative group">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-primary-foreground resize-none outline-none"
                rows={Math.min(editContent.split('\n').length, 6)}
                autoFocus
              />
              <div className="flex space-x-2 text-xs">
                <span className="text-muted-foreground">Enter 保存，Esc 取消</span>
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              
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
                    onClick={handleEdit}
                    title="编辑消息"
                  >
                    <Edit size={12} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={handleDelete}
                    title="删除消息"
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserMessage;
