import { ChatMessage } from '@/components/commit-chat/CommitChatView';
import { CommitSuggestion } from '@/components/commit-chat/CommitTextArea';

export interface UserPreference {
  id: string;
  style: 'conventional' | 'descriptive' | 'emoji' | 'minimal';
  language: 'zh' | 'en';
  maxLength: number;
  includeScope: boolean;
  includeBody: boolean;
  enableSuggestions: boolean;
  enableCommands: boolean;
  enablePreview: boolean;
  autoSave: boolean;
  customTemplates: Array<{
    name: string;
    pattern: string;
    description: string;
    category: string;
  }>;
  learnedPatterns: Array<{
    pattern: string;
    confidence: number;
    usageCount: number;
    lastUsed: Date;
  }>;
  feedbackHistory: Array<{
    messageId: string;
    feedback: 'positive' | 'negative';
    timestamp: Date;
    context: string;
  }>;
  usageStats: {
    totalMessages: number;
    totalSuggestions: number;
    acceptedSuggestions: number;
    rejectedSuggestions: number;
    averageSessionLength: number;
    mostUsedCommands: Record<string, number>;
    mostUsedTemplates: Record<string, number>;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningData {
  userInput: string;
  selectedSuggestion?: string;
  feedback?: 'positive' | 'negative';
  context: {
    projectType?: string;
    timeOfDay?: string;
    dayOfWeek?: string;
  };
}

const defaultPreference: UserPreference = {
  id: 'default',
  style: 'conventional',
  language: 'zh',
  maxLength: 50,
  includeScope: false,
  includeBody: false,
  enableSuggestions: true,
  enableCommands: true,
  enablePreview: true,
  autoSave: true,
  customTemplates: [],
  learnedPatterns: [],
  feedbackHistory: [],
  usageStats: {
    totalMessages: 0,
    totalSuggestions: 0,
    acceptedSuggestions: 0,
    rejectedSuggestions: 0,
    averageSessionLength: 0,
    mostUsedCommands: {},
    mostUsedTemplates: {},
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

export class PreferenceManager {
  private static instance: PreferenceManager;
  private preference: UserPreference;
  private learningData: LearningData[] = [];
  private listeners: Array<(preference: UserPreference) => void> = [];

  private constructor() {
    this.preference = this.loadPreference();
  }

  public static getInstance(): PreferenceManager {
    if (!PreferenceManager.instance) {
      PreferenceManager.instance = new PreferenceManager();
    }
    return PreferenceManager.instance;
  }

  // 加载用户偏好
  private loadPreference(): UserPreference {
    try {
      const saved = localStorage.getItem('commit-chat-preference');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultPreference,
          ...parsed,
          createdAt: new Date(parsed.createdAt || defaultPreference.createdAt),
          updatedAt: new Date(parsed.updatedAt || defaultPreference.updatedAt),
          learnedPatterns: (parsed.learnedPatterns || []).map((p: any) => ({
            ...p,
            lastUsed: new Date(p.lastUsed),
          })),
          feedbackHistory: (parsed.feedbackHistory || []).map((f: any) => ({
            ...f,
            timestamp: new Date(f.timestamp),
          })),
        };
      }
    } catch (error) {
      console.error('加载用户偏好失败:', error);
    }
    
    return { ...defaultPreference };
  }

  // 保存用户偏好
  private savePreference(): void {
    try {
      this.preference.updatedAt = new Date();
      localStorage.setItem('commit-chat-preference', JSON.stringify(this.preference));
      this.notifyListeners();
    } catch (error) {
      console.error('保存用户偏好失败:', error);
    }
  }

  // 获取用户偏好
  public getPreference(): UserPreference {
    return { ...this.preference };
  }

  // 更新用户偏好
  public updatePreference(updates: Partial<UserPreference>): void {
    this.preference = { ...this.preference, ...updates };
    this.savePreference();
  }

  // 学习用户行为
  public learnFromInteraction(data: LearningData): void {
    this.learningData.push(data);
    
    // 更新使用统计
    this.updateUsageStats(data);
    
    // 学习模式
    this.learnPatterns(data);
    
    // 限制学习数据大小
    if (this.learningData.length > 1000) {
      this.learningData = this.learningData.slice(-500);
    }
    
    this.savePreference();
  }

  // 更新使用统计
  private updateUsageStats(data: LearningData): void {
    const stats = this.preference.usageStats;
    stats.totalMessages++;
    
    if (data.selectedSuggestion) {
      stats.totalSuggestions++;
      stats.acceptedSuggestions++;
    }
    
    if (data.feedback === 'negative') {
      stats.rejectedSuggestions++;
    }
    
    // 更新平均会话长度
    const recentSessions = this.learningData.slice(-10);
    stats.averageSessionLength = recentSessions.length;
    
    this.preference.usageStats = stats;
  }

  // 学习模式
  private learnPatterns(data: LearningData): void {
    const input = data.userInput.toLowerCase();
    
    // 提取关键词模式
    const keywords = this.extractKeywords(input);
    
    for (const keyword of keywords) {
      const existingPattern = this.preference.learnedPatterns.find(p => p.pattern === keyword);
      
      if (existingPattern) {
        existingPattern.usageCount++;
        existingPattern.lastUsed = new Date();
        
        // 根据反馈调整置信度
        if (data.feedback === 'positive') {
          existingPattern.confidence = Math.min(existingPattern.confidence + 0.1, 1.0);
        } else if (data.feedback === 'negative') {
          existingPattern.confidence = Math.max(existingPattern.confidence - 0.1, 0.0);
        }
      } else {
        this.preference.learnedPatterns.push({
          pattern: keyword,
          confidence: data.feedback === 'positive' ? 0.8 : 0.5,
          usageCount: 1,
          lastUsed: new Date(),
        });
      }
    }
    
    // 限制学习模式数量
    if (this.preference.learnedPatterns.length > 100) {
      this.preference.learnedPatterns = this.preference.learnedPatterns
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 50);
    }
  }

  // 提取关键词
  private extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    
    // 常见动词
    const verbs = ['添加', '修复', '更新', '删除', '重构', '优化', 'add', 'fix', 'update', 'remove', 'refactor', 'optimize'];
    for (const verb of verbs) {
      if (text.includes(verb)) {
        keywords.push(verb);
      }
    }
    
    // 常见名词
    const nouns = ['功能', 'bug', '文档', '测试', '配置', 'feature', 'documentation', 'test', 'config'];
    for (const noun of nouns) {
      if (text.includes(noun)) {
        keywords.push(noun);
      }
    }
    
    return keywords;
  }

  // 记录反馈
  public recordFeedback(messageId: string, feedback: 'positive' | 'negative', context: string): void {
    this.preference.feedbackHistory.push({
      messageId,
      feedback,
      timestamp: new Date(),
      context,
    });
    
    // 限制反馈历史大小
    if (this.preference.feedbackHistory.length > 200) {
      this.preference.feedbackHistory = this.preference.feedbackHistory.slice(-100);
    }
    
    this.savePreference();
  }

  // 获取个性化建议
  public getPersonalizedSuggestions(input: string): CommitSuggestion[] {
    const suggestions: CommitSuggestion[] = [];
    const inputLower = input.toLowerCase();
    
    // 基于学习模式生成建议
    for (const pattern of this.preference.learnedPatterns) {
      if (inputLower.includes(pattern.pattern) && pattern.confidence > 0.6) {
        suggestions.push({
          text: this.generateSuggestionFromPattern(pattern.pattern, input),
          type: 'custom',
          confidence: pattern.confidence,
          description: `基于您的使用习惯`,
        });
      }
    }
    
    // 基于使用统计生成建议
    const mostUsedTemplates = Object.entries(this.preference.usageStats.mostUsedTemplates)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
    
    for (const [template, count] of mostUsedTemplates) {
      if (count > 2) {
        suggestions.push({
          text: `${template}: ${input}`,
          type: 'template',
          confidence: Math.min(count / 10, 0.9),
          description: `您经常使用的模板`,
        });
      }
    }
    
    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  // 从模式生成建议
  private generateSuggestionFromPattern(pattern: string, input: string): string {
    const patternMap: Record<string, string> = {
      '添加': 'feat',
      '修复': 'fix',
      '更新': 'update',
      '删除': 'remove',
      '重构': 'refactor',
      '优化': 'optimize',
      'add': 'feat',
      'fix': 'fix',
      'update': 'update',
      'remove': 'remove',
      'refactor': 'refactor',
      'optimize': 'optimize',
    };
    
    const type = patternMap[pattern] || 'feat';
    return `${type}: ${input}`;
  }

  // 获取使用统计
  public getUsageStats() {
    return { ...this.preference.usageStats };
  }

  // 获取学习模式
  public getLearnedPatterns() {
    return [...this.preference.learnedPatterns];
  }

  // 获取反馈历史
  public getFeedbackHistory() {
    return [...this.preference.feedbackHistory];
  }

  // 重置学习数据
  public resetLearningData(): void {
    this.preference.learnedPatterns = [];
    this.preference.feedbackHistory = [];
    this.preference.usageStats = {
      totalMessages: 0,
      totalSuggestions: 0,
      acceptedSuggestions: 0,
      rejectedSuggestions: 0,
      averageSessionLength: 0,
      mostUsedCommands: {},
      mostUsedTemplates: {},
    };
    this.learningData = [];
    this.savePreference();
  }

  // 导出偏好数据
  public exportPreference(): string {
    return JSON.stringify({
      preference: this.preference,
      learningData: this.learningData,
    }, null, 2);
  }

  // 导入偏好数据
  public importPreference(dataJson: string): void {
    try {
      const data = JSON.parse(dataJson);
      
      if (data.preference) {
        this.preference = {
          ...defaultPreference,
          ...data.preference,
          createdAt: new Date(data.preference.createdAt || defaultPreference.createdAt),
          updatedAt: new Date(),
          learnedPatterns: (data.preference.learnedPatterns || []).map((p: any) => ({
            ...p,
            lastUsed: new Date(p.lastUsed),
          })),
          feedbackHistory: (data.preference.feedbackHistory || []).map((f: any) => ({
            ...f,
            timestamp: new Date(f.timestamp),
          })),
        };
      }
      
      if (data.learningData) {
        this.learningData = data.learningData;
      }
      
      this.savePreference();
    } catch (error) {
      console.error('导入偏好数据失败:', error);
      throw new Error('无效的偏好数据格式');
    }
  }

  // 添加偏好变更监听器
  public addPreferenceListener(listener: (preference: UserPreference) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // 通知监听器
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.preference);
      } catch (error) {
        console.error('偏好监听器执行失败:', error);
      }
    });
  }

  // 获取推荐配置
  public getRecommendedConfig(): Partial<UserPreference> {
    const stats = this.preference.usageStats;
    const recommendations: Partial<UserPreference> = {};
    
    // 基于使用统计推荐配置
    if (stats.acceptedSuggestions / Math.max(stats.totalSuggestions, 1) > 0.7) {
      recommendations.enableSuggestions = true;
    }
    
    if (Object.keys(stats.mostUsedCommands).length > 0) {
      recommendations.enableCommands = true;
    }
    
    // 基于反馈历史推荐配置
    const recentFeedback = this.preference.feedbackHistory.slice(-10);
    const positiveFeedback = recentFeedback.filter(f => f.feedback === 'positive').length;
    
    if (positiveFeedback / Math.max(recentFeedback.length, 1) > 0.8) {
      recommendations.enablePreview = true;
    }
    
    return recommendations;
  }
}

// 导出单例实例
export const preferenceManager = PreferenceManager.getInstance();
