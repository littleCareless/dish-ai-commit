import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Logger } from "../utils/logger";

/**
 * 文档接口
 */
export interface Document {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  version: string;
  lastModified: Date;
  author: string;
  language: string;
  metadata: Record<string, any>;
}

/**
 * 文档索引接口
 */
export interface DocumentIndex {
  documents: Document[];
  categories: string[];
  tags: string[];
  lastUpdated: Date;
}

/**
 * 搜索选项
 */
export interface SearchOptions {
  query: string;
  category?: string;
  tags?: string[];
  language?: string;
  limit?: number;
  fuzzy?: boolean;
}

/**
 * 搜索结果
 */
export interface SearchResult {
  document: Document;
  score: number;
  highlights: string[];
  matchedFields: string[];
}

/**
 * 文档反馈
 */
export interface DocumentFeedback {
  documentId: string;
  rating: number; // 1-5
  comment?: string;
  helpful: boolean;
  timestamp: Date;
  userId?: string;
}

/**
 * 文档管理系统
 * 负责文档的版本控制、搜索、索引和反馈管理
 */
export class DocumentManager {
  private static instance: DocumentManager;
  private logger: Logger;
  private context: vscode.ExtensionContext;
  private documents: Map<string, Document> = new Map();
  private index: DocumentIndex;
  private feedback: DocumentFeedback[] = [];

  private constructor(context: vscode.ExtensionContext) {
    this.logger = Logger.getInstance("DocumentManager");
    this.context = context;
    this.index = {
      documents: [],
      categories: [],
      tags: [],
      lastUpdated: new Date()
    };
    this.initializeDocuments();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(context?: vscode.ExtensionContext): DocumentManager {
    if (!DocumentManager.instance && context) {
      DocumentManager.instance = new DocumentManager(context);
    }
    return DocumentManager.instance;
  }

  /**
   * 获取文档
   * @param id - 文档ID
   * @returns 文档对象
   */
  public getDocument(id: string): Document | undefined {
    return this.documents.get(id);
  }

  /**
   * 获取所有文档
   * @returns 文档列表
   */
  public getAllDocuments(): Document[] {
    return Array.from(this.documents.values());
  }

  /**
   * 按分类获取文档
   * @param category - 分类名称
   * @returns 文档列表
   */
  public getDocumentsByCategory(category: string): Document[] {
    return Array.from(this.documents.values()).filter(doc => doc.category === category);
  }

  /**
   * 按标签获取文档
   * @param tags - 标签列表
   * @returns 文档列表
   */
  public getDocumentsByTags(tags: string[]): Document[] {
    return Array.from(this.documents.values()).filter(doc =>
      tags.some(tag => doc.tags.includes(tag))
    );
  }

  /**
   * 搜索文档
   * @param options - 搜索选项
   * @returns 搜索结果
   */
  public searchDocuments(options: SearchOptions): SearchResult[] {
    const { query, category, tags, language, limit = 10, fuzzy = true } = options;
    
    let documents = Array.from(this.documents.values());
    
    // 应用过滤器
    if (category) {
      documents = documents.filter(doc => doc.category === category);
    }
    
    if (tags && tags.length > 0) {
      documents = documents.filter(doc =>
        tags.some(tag => doc.tags.includes(tag))
      );
    }
    
    if (language) {
      documents = documents.filter(doc => doc.language === language);
    }
    
    // 执行搜索
    const results: SearchResult[] = [];
    
    for (const document of documents) {
      const score = this.calculateRelevanceScore(document, query, fuzzy);
      
      if (score > 0) {
        const highlights = this.generateHighlights(document, query);
        const matchedFields = this.getMatchedFields(document, query);
        
        results.push({
          document,
          score,
          highlights,
          matchedFields
        });
      }
    }
    
    // 按相关性排序并限制结果数量
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * 添加文档
   * @param document - 文档对象
   */
  public addDocument(document: Document): void {
    this.documents.set(document.id, document);
    this.updateIndex();
    this.logger.info(`Added document: ${document.title}`);
  }

  /**
   * 更新文档
   * @param id - 文档ID
   * @param updates - 更新内容
   */
  public updateDocument(id: string, updates: Partial<Document>): void {
    const existing = this.documents.get(id);
    if (existing) {
      const updated: Document = {
        ...existing,
        ...updates,
        id, // 确保ID不被更改
        lastModified: new Date()
      };
      this.documents.set(id, updated);
      this.updateIndex();
      this.logger.info(`Updated document: ${updated.title}`);
    }
  }

  /**
   * 删除文档
   * @param id - 文档ID
   */
  public deleteDocument(id: string): void {
    const document = this.documents.get(id);
    if (document) {
      this.documents.delete(id);
      this.updateIndex();
      this.logger.info(`Deleted document: ${document.title}`);
    }
  }

  /**
   * 获取文档索引
   * @returns 文档索引
   */
  public getIndex(): DocumentIndex {
    return { ...this.index };
  }

  /**
   * 获取所有分类
   * @returns 分类列表
   */
  public getCategories(): string[] {
    return [...this.index.categories];
  }

  /**
   * 获取所有标签
   * @returns 标签列表
   */
  public getTags(): string[] {
    return [...this.index.tags];
  }

  /**
   * 添加文档反馈
   * @param feedback - 反馈信息
   */
  public addFeedback(feedback: DocumentFeedback): void {
    this.feedback.push(feedback);
    this.saveFeedback();
    this.logger.info(`Added feedback for document: ${feedback.documentId}`);
  }

  /**
   * 获取文档反馈
   * @param documentId - 文档ID
   * @returns 反馈列表
   */
  public getDocumentFeedback(documentId: string): DocumentFeedback[] {
    return this.feedback.filter(f => f.documentId === documentId);
  }

  /**
   * 获取文档平均评分
   * @param documentId - 文档ID
   * @returns 平均评分
   */
  public getDocumentRating(documentId: string): number {
    const documentFeedback = this.getDocumentFeedback(documentId);
    if (documentFeedback.length === 0) {
      return 0;
    }
    
    const totalRating = documentFeedback.reduce((sum, f) => sum + f.rating, 0);
    return totalRating / documentFeedback.length;
  }

  /**
   * 导出文档
   * @param documentId - 文档ID
   * @param format - 导出格式
   * @returns 导出内容
   */
  public exportDocument(documentId: string, format: 'markdown' | 'html' | 'json'): string {
    const document = this.getDocument(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }
    
    switch (format) {
      case 'markdown':
        return this.exportToMarkdown(document);
      case 'html':
        return this.exportToHtml(document);
      case 'json':
        return JSON.stringify(document, null, 2);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * 导入文档
   * @param content - 文档内容
   * @param format - 导入格式
   * @returns 文档对象
   */
  public importDocument(content: string, format: 'markdown' | 'json'): Document {
    switch (format) {
      case 'markdown':
        return this.importFromMarkdown(content);
      case 'json':
        return JSON.parse(content) as Document;
      default:
        throw new Error(`Unsupported import format: ${format}`);
    }
  }

  /**
   * 初始化文档
   */
  private initializeDocuments(): void {
    // 创建默认文档
    const defaultDocuments: Document[] = [
      {
        id: 'getting-started',
        title: '快速开始指南',
        content: `# 快速开始指南

欢迎使用 Dish AI Commit Gen 扩展！本指南将帮助您快速上手。

## 安装和配置

1. 确保您已安装 VS Code
2. 从扩展市场安装 Dish AI Commit Gen
3. 配置您的 AI 提供商 API 密钥

## 基本使用

1. 打开您的 Git 仓库
2. 进行代码更改
3. 使用扩展生成提交信息
4. 提交您的更改

## 获取帮助

如果您遇到问题，请查看帮助文档或联系支持团队。`,
        category: 'getting-started',
        tags: ['安装', '配置', '入门'],
        version: '1.0.0',
        lastModified: new Date(),
        author: 'Dish AI Team',
        language: 'zh-CN',
        metadata: {
          difficulty: 'beginner',
          estimatedTime: '5分钟'
        }
      },
      {
        id: 'api-configuration',
        title: 'API 配置指南',
        content: `# API 配置指南

本指南将帮助您配置各种 AI 提供商的 API 密钥。

## 支持的提供商

- OpenAI
- Anthropic Claude
- Ollama
- 其他兼容提供商

## 配置步骤

1. 获取 API 密钥
2. 在设置中配置
3. 测试连接
4. 开始使用

## 安全注意事项

- 妥善保管您的 API 密钥
- 不要与他人分享
- 定期轮换密钥`,
        category: 'configuration',
        tags: ['API', '配置', '安全'],
        version: '1.0.0',
        lastModified: new Date(),
        author: 'Dish AI Team',
        language: 'zh-CN',
        metadata: {
          difficulty: 'beginner',
          estimatedTime: '10分钟'
        }
      },
      {
        id: 'troubleshooting',
        title: '故障排除指南',
        content: `# 故障排除指南

本指南将帮助您解决使用过程中遇到的常见问题。

## 常见问题

### API 连接失败
- 检查网络连接
- 验证 API 密钥
- 确认服务状态

### 生成质量不佳
- 调整提示词
- 尝试不同模型
- 检查代码更改

### 性能问题
- 检查网络延迟
- 优化代码更改
- 使用本地模型

## 获取支持

如果问题仍然存在，请：
1. 查看日志文件
2. 联系技术支持
3. 提交问题报告`,
        category: 'troubleshooting',
        tags: ['问题', '解决', '支持'],
        version: '1.0.0',
        lastModified: new Date(),
        author: 'Dish AI Team',
        language: 'zh-CN',
        metadata: {
          difficulty: 'intermediate',
          estimatedTime: '15分钟'
        }
      }
    ];

    // 添加默认文档
    defaultDocuments.forEach(doc => {
      this.documents.set(doc.id, doc);
    });

    this.updateIndex();
  }

  /**
   * 更新索引
   */
  private updateIndex(): void {
    const documents = Array.from(this.documents.values());
    const categories = [...new Set(documents.map(doc => doc.category))];
    const tags = [...new Set(documents.flatMap(doc => doc.tags))];

    this.index = {
      documents,
      categories,
      tags,
      lastUpdated: new Date()
    };
  }

  /**
   * 计算相关性分数
   */
  private calculateRelevanceScore(document: Document, query: string, fuzzy: boolean): number {
    const queryLower = query.toLowerCase();
    let score = 0;

    // 标题匹配（权重最高）
    if (document.title.toLowerCase().includes(queryLower)) {
      score += 10;
    }

    // 内容匹配
    const contentMatches = (document.content.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length;
    score += contentMatches * 2;

    // 标签匹配
    const tagMatches = document.tags.filter(tag => tag.toLowerCase().includes(queryLower)).length;
    score += tagMatches * 5;

    // 分类匹配
    if (document.category.toLowerCase().includes(queryLower)) {
      score += 3;
    }

    // 模糊匹配
    if (fuzzy) {
      score += this.calculateFuzzyScore(document, query);
    }

    return score;
  }

  /**
   * 计算模糊匹配分数
   */
  private calculateFuzzyScore(document: Document, query: string): number {
    // 简单的模糊匹配实现
    const queryWords = query.toLowerCase().split(/\s+/);
    let fuzzyScore = 0;

    for (const word of queryWords) {
      if (document.title.toLowerCase().includes(word)) {
        fuzzyScore += 2;
      }
      if (document.content.toLowerCase().includes(word)) {
        fuzzyScore += 1;
      }
    }

    return fuzzyScore;
  }

  /**
   * 生成高亮文本
   */
  private generateHighlights(document: Document, query: string): string[] {
    const highlights: string[] = [];
    const queryLower = query.toLowerCase();

    // 从标题中提取高亮
    if (document.title.toLowerCase().includes(queryLower)) {
      highlights.push(`标题: ${document.title}`);
    }

    // 从内容中提取高亮
    const contentLines = document.content.split('\n');
    for (const line of contentLines) {
      if (line.toLowerCase().includes(queryLower)) {
        highlights.push(`内容: ${line.trim()}`);
      }
    }

    return highlights.slice(0, 3); // 限制高亮数量
  }

  /**
   * 获取匹配字段
   */
  private getMatchedFields(document: Document, query: string): string[] {
    const matchedFields: string[] = [];
    const queryLower = query.toLowerCase();

    if (document.title.toLowerCase().includes(queryLower)) {
      matchedFields.push('title');
    }
    if (document.content.toLowerCase().includes(queryLower)) {
      matchedFields.push('content');
    }
    if (document.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
      matchedFields.push('tags');
    }
    if (document.category.toLowerCase().includes(queryLower)) {
      matchedFields.push('category');
    }

    return matchedFields;
  }

  /**
   * 导出为 Markdown
   */
  private exportToMarkdown(document: Document): string {
    return `# ${document.title}

**分类**: ${document.category}  
**标签**: ${document.tags.join(', ')}  
**版本**: ${document.version}  
**最后修改**: ${document.lastModified.toISOString()}  
**作者**: ${document.author}  
**语言**: ${document.language}

---

${document.content}

---

*本文档由 Dish AI Commit Gen 扩展生成*`;
  }

  /**
   * 导出为 HTML
   */
  private exportToHtml(document: Document): string {
    return `<!DOCTYPE html>
<html lang="${document.language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${document.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .metadata { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .content { line-height: 1.6; }
        .tags { margin-top: 10px; }
        .tag { display: inline-block; background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-right: 5px; }
    </style>
</head>
<body>
    <h1>${document.title}</h1>
    <div class="metadata">
        <p><strong>分类</strong>: ${document.category}</p>
        <p><strong>版本</strong>: ${document.version}</p>
        <p><strong>最后修改</strong>: ${document.lastModified.toLocaleString()}</p>
        <p><strong>作者</strong>: ${document.author}</p>
        <div class="tags">
            ${document.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
    </div>
    <div class="content">
        ${document.content.replace(/\n/g, '<br>')}
    </div>
</body>
</html>`;
  }

  /**
   * 从 Markdown 导入
   */
  private importFromMarkdown(content: string): Document {
    const lines = content.split('\n');
    const title = lines[0].replace(/^#\s*/, '');
    
    // 简单的 Markdown 解析
    const metadata: Record<string, any> = {};
    let contentStart = 1;
    
    // 查找元数据
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('**') && line.includes('**:')) {
        const match = line.match(/\*\*(.*?)\*\*:\s*(.*)/);
        if (match) {
          const key = match[1].toLowerCase().replace(/\s+/g, '');
          const value = match[2];
          metadata[key] = value;
        }
      } else if (line.trim() === '---') {
        contentStart = i + 1;
        break;
      }
    }
    
    const documentContent = lines.slice(contentStart).join('\n').trim();
    
    return {
      id: this.generateDocumentId(title),
      title,
      content: documentContent,
      category: metadata.category || 'general',
      tags: metadata.tags ? metadata.tags.split(',').map((t: string) => t.trim()) : [],
      version: metadata.version || '1.0.0',
      lastModified: new Date(),
      author: metadata.author || 'Unknown',
      language: metadata.language || 'zh-CN',
      metadata
    };
  }

  /**
   * 生成文档ID
   */
  private generateDocumentId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }

  /**
   * 保存反馈
   */
  private saveFeedback(): void {
    try {
      const feedbackData = JSON.stringify(this.feedback, null, 2);
      this.context.globalState.update('documentFeedback', feedbackData);
    } catch (error) {
      this.logger.logError(error as Error, 'Failed to save feedback');
    }
  }

  /**
   * 加载反馈
   */
  private loadFeedback(): void {
    try {
      const feedbackData = this.context.globalState.get<string>('documentFeedback');
      if (feedbackData) {
        this.feedback = JSON.parse(feedbackData).map((f: any) => ({
          ...f,
          timestamp: new Date(f.timestamp)
        }));
      }
    } catch (error) {
      this.logger.logError(error as Error, 'Failed to load feedback');
    }
  }
}
