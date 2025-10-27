import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  BookOpen,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  HelpCircle,
} from "lucide-react";

/**
 * 帮助内容接口
 */
interface HelpContent {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  lastUpdated: string;
  relatedTopics: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
}

/**
 * 帮助分类接口
 */
interface HelpCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  topics: HelpContent[];
  expanded: boolean;
}

/**
 * 搜索过滤器
 */
interface SearchFilters {
  category: string;
  difficulty: string;
  tags: string[];
}

/**
 * 帮助系统组件
 * 提供交互式帮助文档和搜索功能
 */
export const HelpSystem: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    category: "all",
    difficulty: "all",
    tags: [],
  });
  const [selectedTopic, setSelectedTopic] = useState<HelpContent | null>(null);
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [searchResults, setSearchResults] = useState<HelpContent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentTopics, setRecentTopics] = useState<HelpContent[]>([]);

  // 初始化帮助内容
  useEffect(() => {
    initializeHelpContent();
    loadRecentTopics();
  }, []);

  // 搜索功能
  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, filters]);

  /**
   * 初始化帮助内容
   */
  const initializeHelpContent = useCallback(() => {
    const helpCategories: HelpCategory[] = [
      {
        id: "getting-started",
        name: "快速开始",
        description: "新用户入门指南",
        icon: "🚀",
        expanded: false,
        topics: [
          {
            id: "installation",
            title: "安装和配置",
            content: "详细说明如何安装和配置Dish AI Commit Gen扩展...",
            category: "getting-started",
            tags: ["安装", "配置", "设置"],
            lastUpdated: "2024-01-15",
            relatedTopics: ["api-key-setup", "model-selection"],
            difficulty: "beginner",
          },
          {
            id: "first-commit",
            title: "生成第一个提交信息",
            content: "学习如何使用扩展生成您的第一个AI提交信息...",
            category: "getting-started",
            tags: ["提交", "AI", "入门"],
            lastUpdated: "2024-01-15",
            relatedTopics: ["commit-types", "best-practices"],
            difficulty: "beginner",
          },
        ],
      },
      {
        id: "configuration",
        name: "配置管理",
        description: "扩展配置和设置",
        icon: "⚙️",
        expanded: false,
        topics: [
          {
            id: "api-key-setup",
            title: "API密钥配置",
            content: "如何配置各种AI提供商的API密钥...",
            category: "configuration",
            tags: ["API", "密钥", "配置"],
            lastUpdated: "2024-01-15",
            relatedTopics: ["provider-selection", "security"],
            difficulty: "beginner",
          },
          {
            id: "model-selection",
            title: "模型选择",
            content: "如何选择最适合您需求的AI模型...",
            category: "configuration",
            tags: ["模型", "选择", "性能"],
            lastUpdated: "2024-01-15",
            relatedTopics: ["api-key-setup", "performance"],
            difficulty: "intermediate",
          },
        ],
      },
      {
        id: "troubleshooting",
        name: "故障排除",
        description: "常见问题和解决方案",
        icon: "🔧",
        expanded: false,
        topics: [
          {
            id: "common-errors",
            title: "常见错误",
            content: "列出并解决使用过程中遇到的常见错误...",
            category: "troubleshooting",
            tags: ["错误", "问题", "解决"],
            lastUpdated: "2024-01-15",
            relatedTopics: ["network-issues", "permission-errors"],
            difficulty: "beginner",
          },
          {
            id: "network-issues",
            title: "网络连接问题",
            content: "解决网络连接和API调用相关的问题...",
            category: "troubleshooting",
            tags: ["网络", "连接", "API"],
            lastUpdated: "2024-01-15",
            relatedTopics: ["common-errors", "api-key-setup"],
            difficulty: "intermediate",
          },
        ],
      },
    ];

    setCategories(helpCategories);
  }, []);

  /**
   * 加载最近查看的主题
   */
  const loadRecentTopics = useCallback(() => {
    // 从本地存储加载最近查看的主题
    const recent = localStorage.getItem("help-recent-topics");
    if (recent) {
      try {
        setRecentTopics(JSON.parse(recent));
      } catch (error) {
        console.error("Failed to load recent topics:", error);
      }
    }
  }, []);

  /**
   * 保存最近查看的主题
   */
  const saveRecentTopic = useCallback(
    (topic: HelpContent) => {
      const updated = [
        topic,
        ...recentTopics.filter((t) => t.id !== topic.id),
      ].slice(0, 5);
      setRecentTopics(updated);
      localStorage.setItem("help-recent-topics", JSON.stringify(updated));
    },
    [recentTopics],
  );

  /**
   * 执行搜索
   */
  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);

    try {
      // 模拟搜索延迟
      await new Promise((resolve) => setTimeout(resolve, 300));

      const allTopics = categories.flatMap((cat) => cat.topics);
      const filtered = allTopics.filter((topic) => {
        const matchesQuery =
          topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          topic.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          topic.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase()),
          );

        const matchesCategory =
          filters.category === "all" || topic.category === filters.category;
        const matchesDifficulty =
          filters.difficulty === "all" ||
          topic.difficulty === filters.difficulty;
        const matchesTags =
          filters.tags.length === 0 ||
          filters.tags.some((tag) => topic.tags.includes(tag));

        return (
          matchesQuery && matchesCategory && matchesDifficulty && matchesTags
        );
      });

      setSearchResults(filtered);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, filters, categories]);

  /**
   * 切换分类展开状态
   */
  const toggleCategory = useCallback((categoryId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId ? { ...cat, expanded: !cat.expanded } : cat,
      ),
    );
  }, []);

  /**
   * 选择主题
   */
  const selectTopic = useCallback(
    (topic: HelpContent) => {
      setSelectedTopic(topic);
      saveRecentTopic(topic);
    },
    [saveRecentTopic],
  );

  /**
   * 更新过滤器
   */
  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * 获取难度标签样式
   */
  const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="help-system h-full flex flex-col bg-white">
      {/* 头部 */}
      <div className="help-header p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-900">帮助中心</h1>
        </div>

        {/* 搜索栏 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索帮助内容..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 侧边栏 */}
        <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
          {/* 过滤器 */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">过滤器</h3>

            {/* 分类过滤器 */}
            <div className="mb-3">
              <label className="block text-xs text-gray-600 mb-1">分类</label>
              <select
                value={filters.category}
                onChange={(e) => updateFilters({ category: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="all">所有分类</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 难度过滤器 */}
            <div className="mb-3">
              <label className="block text-xs text-gray-600 mb-1">难度</label>
              <select
                value={filters.difficulty}
                onChange={(e) => updateFilters({ difficulty: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="all">所有难度</option>
                <option value="beginner">初级</option>
                <option value="intermediate">中级</option>
                <option value="advanced">高级</option>
              </select>
            </div>
          </div>

          {/* 内容列表 */}
          <div className="p-4">
            {searchQuery ? (
              // 搜索结果
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  搜索结果 ({searchResults.length})
                </h3>
                {searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((topic) => (
                      <div
                        key={topic.id}
                        onClick={() => selectTopic(topic)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedTopic?.id === topic.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">
                              {topic.title}
                            </h4>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {topic.content}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span
                                className={`px-2 py-1 text-xs rounded ${getDifficultyStyle(topic.difficulty)}`}
                              >
                                {topic.difficulty}
                              </span>
                              <span className="text-xs text-gray-500">
                                {topic.category}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>未找到相关帮助内容</p>
                  </div>
                )}
              </div>
            ) : (
              // 分类列表
              <div>
                {/* 最近查看 */}
                {recentTopics.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      最近查看
                    </h3>
                    <div className="space-y-2">
                      {recentTopics.map((topic) => (
                        <div
                          key={topic.id}
                          onClick={() => selectTopic(topic)}
                          className="p-2 rounded border border-gray-200 hover:border-gray-300 cursor-pointer"
                        >
                          <h4 className="text-sm font-medium text-gray-900">
                            {topic.title}
                          </h4>
                          <p className="text-xs text-gray-600">
                            {topic.category}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 分类列表 */}
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="border border-gray-200 rounded-lg"
                    >
                      <div
                        onClick={() => toggleCategory(category.id)}
                        className="p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{category.icon}</span>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              {category.name}
                            </h3>
                            <p className="text-xs text-gray-600">
                              {category.description}
                            </p>
                          </div>
                        </div>
                        {category.expanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>

                      {category.expanded && (
                        <div className="border-t border-gray-200 p-2">
                          <div className="space-y-1">
                            {category.topics.map((topic) => (
                              <div
                                key={topic.id}
                                onClick={() => selectTopic(topic)}
                                className={`p-2 rounded cursor-pointer text-sm ${
                                  selectedTopic?.id === topic.id
                                    ? "bg-blue-50 text-blue-900"
                                    : "hover:bg-gray-50 text-gray-700"
                                }`}
                              >
                                {topic.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 overflow-y-auto">
          {selectedTopic ? (
            <div className="p-6">
              <div className="max-w-4xl">
                {/* 主题头部 */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 text-xs rounded ${getDifficultyStyle(selectedTopic.difficulty)}`}
                    >
                      {selectedTopic.difficulty}
                    </span>
                    <span className="text-sm text-gray-600">
                      {selectedTopic.category}
                    </span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-500">
                      更新于 {selectedTopic.lastUpdated}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedTopic.title}
                  </h1>
                  <div className="flex flex-wrap gap-1">
                    {selectedTopic.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 主题内容 */}
                <div className="prose prose-sm max-w-none">
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <p className="text-gray-700 leading-relaxed">
                      {selectedTopic.content}
                    </p>
                  </div>
                </div>

                {/* 相关主题 */}
                {selectedTopic.relatedTopics.length > 0 && (
                  <div className="mt-8 border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      相关主题
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedTopic.relatedTopics.map((relatedId) => {
                        const relatedTopic = categories
                          .flatMap((cat) => cat.topics)
                          .find((topic) => topic.id === relatedId);

                        if (!relatedTopic) return null;

                        return (
                          <div
                            key={relatedId}
                            onClick={() => selectTopic(relatedTopic)}
                            className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer"
                          >
                            <h4 className="text-sm font-medium text-gray-900">
                              {relatedTopic.title}
                            </h4>
                            <p className="text-xs text-gray-600 mt-1">
                              {relatedTopic.category}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="mt-8 flex gap-3">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <ExternalLink className="w-4 h-4 inline mr-2" />
                    打开外部文档
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    反馈此页面
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">欢迎使用帮助中心</h3>
                <p>选择一个主题开始查看帮助内容</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
