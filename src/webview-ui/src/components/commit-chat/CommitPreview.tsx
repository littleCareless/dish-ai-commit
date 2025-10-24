import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Copy, Check, RefreshCw, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CommitPreviewProps {
  commitMessage: string;
  style: 'conventional' | 'descriptive' | 'emoji' | 'minimal';
  language: 'zh' | 'en';
  maxLength: number;
  onStyleChange?: (style: string) => void;
  onLanguageChange?: (language: string) => void;
  onMaxLengthChange?: (maxLength: number) => void;
  onRegenerate?: () => void;
  onCopy?: (message: string) => void;
  className?: string;
}

const CommitPreview: React.FC<CommitPreviewProps> = ({
  commitMessage,
  style,
  language,
  maxLength,
  onStyleChange,
  onLanguageChange,
  onMaxLengthChange,
  onRegenerate,
  onCopy,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState('');

  // 验证 commit message
  useEffect(() => {
    const validation = validateCommitMessage(commitMessage, style, maxLength);
    setIsValid(validation.isValid);
    setValidationMessage(validation.message);
  }, [commitMessage, style, maxLength]);

  // 处理复制
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(commitMessage);
      setCopied(true);
      if (onCopy) {
        onCopy(commitMessage);
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  // 获取样式标签
  const getStyleBadge = () => {
    const styleMap = {
      conventional: { label: 'Conventional', color: 'bg-blue-500' },
      descriptive: { label: 'Descriptive', color: 'bg-green-500' },
      emoji: { label: 'Emoji', color: 'bg-purple-500' },
      minimal: { label: 'Minimal', color: 'bg-gray-500' },
    };
    return styleMap[style] || styleMap.conventional;
  };

  // 获取语言标签
  const getLanguageBadge = () => {
    return language === 'zh' ? { label: '中文', color: 'bg-red-500' } : { label: 'English', color: 'bg-blue-500' };
  };

  // 获取长度状态
  const getLengthStatus = () => {
    const length = commitMessage.length;
    const percentage = (length / maxLength) * 100;
    
    if (percentage <= 50) return { status: 'good', color: 'text-green-600' };
    if (percentage <= 80) return { status: 'warning', color: 'text-yellow-600' };
    return { status: 'danger', color: 'text-red-600' };
  };

  const lengthStatus = getLengthStatus();
  const styleBadge = getStyleBadge();
  const languageBadge = getLanguageBadge();

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Eye size={20} />
            <span>Commit Message 预览</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSettings(!showSettings)}
              className="h-8 w-8 p-0"
            >
              <Settings size={16} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onRegenerate}
              className="h-8 w-8 p-0"
            >
              <RefreshCw size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 设置面板 */}
        {showSettings && (
          <div className="p-3 bg-muted rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">风格</label>
                <select
                  value={style}
                  onChange={(e) => onStyleChange?.(e.target.value)}
                  className="w-full p-2 text-sm border rounded"
                >
                  <option value="conventional">Conventional</option>
                  <option value="descriptive">Descriptive</option>
                  <option value="emoji">Emoji</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">语言</label>
                <select
                  value={language}
                  onChange={(e) => onLanguageChange?.(e.target.value)}
                  className="w-full p-2 text-sm border rounded"
                >
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                最大长度: {maxLength}
              </label>
              <input
                type="range"
                min="20"
                max="100"
                value={maxLength}
                onChange={(e) => onMaxLengthChange?.(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* 预览内容 */}
        <div className="space-y-3">
          {/* 标签 */}
          <div className="flex items-center space-x-2">
            <Badge className={cn('text-white', styleBadge.color)}>
              {styleBadge.label}
            </Badge>
            <Badge className={cn('text-white', languageBadge.color)}>
              {languageBadge.label}
            </Badge>
            <Badge variant="outline">
              {commitMessage.length}/{maxLength}
            </Badge>
          </div>

          {/* Commit Message 显示 */}
          <div className="relative">
            <div
              className={cn(
                'p-4 rounded-lg border-2 font-mono text-sm break-words',
                isValid
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                  : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
              )}
            >
              {commitMessage || '输入内容以查看预览...'}
            </div>
            
            {/* 长度指示器 */}
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className={cn('font-medium', lengthStatus.color)}>
                {commitMessage.length} 字符
              </span>
              <span className="text-muted-foreground">
                {lengthStatus.status === 'good' && '✅ 长度合适'}
                {lengthStatus.status === 'warning' && '⚠️ 接近限制'}
                {lengthStatus.status === 'danger' && '❌ 超出限制'}
              </span>
            </div>
          </div>

          {/* 验证信息 */}
          {!isValid && validationMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="text-sm text-red-800 dark:text-red-200">
                {validationMessage}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                onClick={handleCopy}
                disabled={!commitMessage}
                className="h-8"
              >
                {copied ? (
                  <>
                    <Check size={14} className="mr-1" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy size={14} className="mr-1" />
                    复制
                  </>
                )}
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground">
              {isValid ? '✅ 格式正确' : '❌ 需要调整'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 验证 commit message
function validateCommitMessage(
  message: string,
  style: string,
  maxLength: number
): { isValid: boolean; message: string } {
  if (!message.trim()) {
    return { isValid: true, message: '' };
  }

  const errors: string[] = [];

  // 长度检查
  if (message.length > maxLength) {
    errors.push(`消息长度 (${message.length}) 超过限制 (${maxLength})`);
  }

  // 风格特定检查
  switch (style) {
    case 'conventional':
      if (!message.includes(':')) {
        errors.push('Conventional 风格需要包含冒号 (:)');
      }
      break;
    case 'emoji':
      if (!/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(message)) {
        errors.push('Emoji 风格需要包含表情符号');
      }
      break;
  }

  // 基本格式检查
  if (message.trim() !== message) {
    errors.push('消息前后不应包含空格');
  }

  if (message.endsWith('.')) {
    errors.push('Commit message 通常不以句号结尾');
  }

  return {
    isValid: errors.length === 0,
    message: errors.join('; '),
  };
}

export default CommitPreview;
