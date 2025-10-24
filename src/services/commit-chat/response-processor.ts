import { ChatMessage } from '@/components/commit-chat/CommitChatView';

export interface ResponseProcessingOptions {
  enableFormatting: boolean;
  enableBeautification: boolean;
  enableQualityAssessment: boolean;
  enableCaching: boolean;
  maxCacheSize: number;
  cacheExpiration: number;
}

export interface ProcessedResponse {
  content: string;
  metadata: {
    commitMessage?: string;
    suggestions?: string[];
    confidence?: number;
    quality?: ResponseQuality;
    processingTime?: number;
  };
  cacheKey?: string;
}

export interface ResponseQuality {
  score: number; // 0-100
  factors: {
    clarity: number;
    completeness: number;
    relevance: number;
    grammar: number;
  };
  suggestions: string[];
}

const defaultOptions: ResponseProcessingOptions = {
  enableFormatting: true,
  enableBeautification: true,
  enableQualityAssessment: true,
  enableCaching: true,
  maxCacheSize: 100,
  cacheExpiration: 300000, // 5 minutes
};

export class ResponseProcessor {
  private options: ResponseProcessingOptions;
  private cache: Map<string, { response: ProcessedResponse; timestamp: number }> = new Map();

  constructor(options: Partial<ResponseProcessingOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  // 处理 AI 响应
  async processResponse(
    rawResponse: string,
    context: {
      userInput: string;
      conversationHistory: ChatMessage[];
      userPreferences: any;
    }
  ): Promise<ProcessedResponse> {
    const startTime = Date.now();
    
    // 检查缓存
    const cacheKey = this.generateCacheKey(rawResponse, context);
    if (this.options.enableCaching) {
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        return cached;
      }
    }

    let processedContent = rawResponse;
    const metadata: ProcessedResponse['metadata'] = {};

    // 格式化响应
    if (this.options.enableFormatting) {
      processedContent = this.formatResponse(processedContent);
    }

    // 美化响应
    if (this.options.enableBeautification) {
      processedContent = this.beautifyResponse(processedContent);
    }

    // 提取元数据
    const extractedMetadata = this.extractMetadata(processedContent, context);
    Object.assign(metadata, extractedMetadata);

    // 质量评估
    if (this.options.enableQualityAssessment) {
      metadata.quality = this.assessQuality(processedContent, context);
    }

    metadata.processingTime = Date.now() - startTime;

    const processedResponse: ProcessedResponse = {
      content: processedContent,
      metadata,
      cacheKey,
    };

    // 缓存响应
    if (this.options.enableCaching && cacheKey) {
      this.cacheResponse(cacheKey, processedResponse);
    }

    return processedResponse;
  }

  // 格式化响应
  private formatResponse(content: string): string {
    // 移除多余的空行
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // 确保段落之间有适当的间距
    content = content.replace(/\n([^\n])/g, '\n\n$1');
    
    // 格式化代码块
    content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `\`\`\`${lang || ''}\n${code.trim()}\n\`\`\``;
    });
    
    // 格式化内联代码
    content = content.replace(/`([^`]+)`/g, '`$1`');
    
    // 格式化列表
    content = content.replace(/^(\s*)(\d+\.|\*|\-)\s+/gm, '$1$2 ');
    
    return content.trim();
  }

  // 美化响应
  private beautifyResponse(content: string): string {
    // 添加表情符号
    content = this.addEmojis(content);
    
    // 改善标点符号
    content = this.improvePunctuation(content);
    
    // 优化句子结构
    content = this.optimizeSentenceStructure(content);
    
    return content;
  }

  // 添加表情符号
  private addEmojis(content: string): string {
    const emojiMap: Record<string, string> = {
      '成功': '✅',
      '错误': '❌',
      '警告': '⚠️',
      '信息': 'ℹ️',
      '建议': '💡',
      '注意': '📝',
      '重要': '⭐',
      '完成': '🎉',
      '修复': '🔧',
      '新增': '✨',
      '删除': '🗑️',
      '更新': '🔄',
      '优化': '⚡',
      '重构': '♻️',
    };

    for (const [keyword, emoji] of Object.entries(emojiMap)) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      content = content.replace(regex, `${emoji} ${keyword}`);
    }

    return content;
  }

  // 改善标点符号
  private improvePunctuation(content: string): string {
    // 确保句子以适当的标点符号结尾
    content = content.replace(/([^.!?。！？])\n/g, '$1。\n');
    
    // 修复中文标点符号
    content = content.replace(/,/g, '，');
    content = content.replace(/;/g, '；');
    content = content.replace(/:/g, '：');
    content = content.replace(/!/g, '！');
    content = content.replace(/\?/g, '？');
    
    return content;
  }

  // 优化句子结构
  private optimizeSentenceStructure(content: string): string {
    // 确保句子开头大写
    content = content.replace(/(^|[.!?。！？]\s+)([a-z])/g, (match, prefix, letter) => {
      return prefix + letter.toUpperCase();
    });
    
    // 移除重复的词汇
    content = content.replace(/\b(\w+)\s+\1\b/g, '$1');
    
    return content;
  }

  // 提取元数据
  private extractMetadata(
    content: string,
    context: { userInput: string; conversationHistory: ChatMessage[]; userPreferences: any }
  ): Partial<ProcessedResponse['metadata']> {
    const metadata: Partial<ProcessedResponse['metadata']> = {};

    // 提取 commit message
    const commitMessageMatch = content.match(/commit message[：:]\s*(.+)/i);
    if (commitMessageMatch) {
      metadata.commitMessage = commitMessageMatch[1].trim();
    }

    // 提取建议
    const suggestions: string[] = [];
    const suggestionMatches = content.match(/建议[：:]\s*(.+)/gi);
    if (suggestionMatches) {
      suggestionMatches.forEach(match => {
        const suggestion = match.replace(/建议[：:]\s*/i, '').trim();
        if (suggestion) {
          suggestions.push(suggestion);
        }
      });
    }

    if (suggestions.length > 0) {
      metadata.suggestions = suggestions;
    }

    // 计算置信度
    metadata.confidence = this.calculateConfidence(content, context);

    return metadata;
  }

  // 计算置信度
  private calculateConfidence(
    content: string,
    context: { userInput: string; conversationHistory: ChatMessage[]; userPreferences: any }
  ): number {
    let confidence = 0.5;

    // 基于内容长度
    if (content.length > 50) confidence += 0.1;
    if (content.length > 100) confidence += 0.1;

    // 基于关键词匹配
    const positiveKeywords = ['建议', '推荐', '可以', '应该', '需要'];
    const hasPositiveKeywords = positiveKeywords.some(keyword => content.includes(keyword));
    if (hasPositiveKeywords) confidence += 0.1;

    // 基于用户输入的相关性
    const userInputWords = context.userInput.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    const commonWords = userInputWords.filter(word => contentWords.includes(word));
    const relevance = commonWords.length / Math.max(userInputWords.length, 1);
    confidence += relevance * 0.2;

    // 基于对话历史
    if (context.conversationHistory.length > 0) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  // 评估响应质量
  private assessQuality(
    content: string,
    context: { userInput: string; conversationHistory: ChatMessage[]; userPreferences: any }
  ): ResponseQuality {
    const factors = {
      clarity: this.assessClarity(content),
      completeness: this.assessCompleteness(content, context),
      relevance: this.assessRelevance(content, context),
      grammar: this.assessGrammar(content),
    };

    const score = (factors.clarity + factors.completeness + factors.relevance + factors.grammar) / 4;
    const suggestions = this.generateQualitySuggestions(factors);

    return {
      score: Math.round(score * 100),
      factors,
      suggestions,
    };
  }

  // 评估清晰度
  private assessClarity(content: string): number {
    let score = 0.5;

    // 检查句子长度
    const sentences = content.split(/[.!?。！？]/);
    const avgSentenceLength = sentences.reduce((sum, sentence) => sum + sentence.length, 0) / sentences.length;
    
    if (avgSentenceLength > 10 && avgSentenceLength < 50) score += 0.2;
    if (avgSentenceLength > 50) score -= 0.1;

    // 检查词汇复杂度
    const words = content.split(/\s+/);
    const complexWords = words.filter(word => word.length > 6);
    const complexityRatio = complexWords.length / words.length;
    
    if (complexityRatio > 0.1 && complexityRatio < 0.3) score += 0.2;
    if (complexityRatio > 0.5) score -= 0.1;

    return Math.max(0, Math.min(1, score));
  }

  // 评估完整性
  private assessCompleteness(content: string, context: any): number {
    let score = 0.5;

    // 检查是否回答了用户的问题
    if (content.includes('建议') || content.includes('推荐')) score += 0.2;
    if (content.includes('commit message') || content.includes('提交信息')) score += 0.2;
    if (content.length > 100) score += 0.1;

    return Math.max(0, Math.min(1, score));
  }

  // 评估相关性
  private assessRelevance(content: string, context: any): number {
    let score = 0.5;

    // 检查与用户输入的相关性
    const userInputWords = context.userInput.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    const commonWords = userInputWords.filter((word: string) => contentWords.includes(word));
    const relevance = commonWords.length / Math.max(userInputWords.length, 1);
    
    score += relevance * 0.5;

    return Math.max(0, Math.min(1, score));
  }

  // 评估语法
  private assessGrammar(content: string): number {
    let score = 0.8; // 假设大部分内容语法正确

    // 检查基本语法错误
    if (content.includes('  ')) score -= 0.1; // 多余空格
    if (content.match(/[a-z][A-Z]/)) score -= 0.1; // 大小写错误
    if (content.includes('。。')) score -= 0.1; // 重复标点

    return Math.max(0, Math.min(1, score));
  }

  // 生成质量建议
  private generateQualitySuggestions(factors: ResponseQuality['factors']): string[] {
    const suggestions: string[] = [];

    if (factors.clarity < 0.6) {
      suggestions.push('建议使用更简洁的句子结构');
    }
    if (factors.completeness < 0.6) {
      suggestions.push('建议提供更完整的回答');
    }
    if (factors.relevance < 0.6) {
      suggestions.push('建议更紧密地围绕用户问题回答');
    }
    if (factors.grammar < 0.8) {
      suggestions.push('建议检查语法和标点符号');
    }

    return suggestions;
  }

  // 生成缓存键
  private generateCacheKey(rawResponse: string, context: any): string {
    const keyData = {
      response: rawResponse,
      userInput: context.userInput,
      preferences: context.userPreferences,
    };
    return btoa(JSON.stringify(keyData));
  }

  // 获取缓存的响应
  private getCachedResponse(cacheKey: string): ProcessedResponse | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    // 检查是否过期
    if (Date.now() - cached.timestamp > this.options.cacheExpiration) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.response;
  }

  // 缓存响应
  private cacheResponse(cacheKey: string, response: ProcessedResponse): void {
    // 清理过期缓存
    this.cleanExpiredCache();

    // 检查缓存大小限制
    if (this.cache.size >= this.options.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(cacheKey, {
      response,
      timestamp: Date.now(),
    });
  }

  // 清理过期缓存
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.options.cacheExpiration) {
        this.cache.delete(key);
      }
    }
  }

  // 清空缓存
  clearCache(): void {
    this.cache.clear();
  }

  // 获取缓存统计
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.options.maxCacheSize,
      hitRate: 0, // 需要实现命中率统计
    };
  }
}
