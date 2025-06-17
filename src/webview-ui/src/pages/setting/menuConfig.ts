export const menuItemsConfig = [
  { key: "base", label: "基本设置" },
  {
    key: "providers",
    label: "提供商设置",
    children: [
      { key: "providers.openai", label: "OpenAI" },
      { key: "providers.ollama", label: "Ollama" },
      { key: "providers.zhipu", label: "智谱AI (Zhipu)" },
      { key: "providers.dashscope", label: "灵积 (DashScope)" },
      { key: "providers.doubao", label: "豆包 (Doubao)" },
      { key: "providers.gemini", label: "Gemini" },
      { key: "providers.deepseek", label: "Deepseek" },
      { key: "providers.siliconflow", label: "Siliconflow" },
      { key: "providers.openrouter", label: "OpenRouter" },
    ],
  },
  {
    key: "features",
    label: "功能特性",
    children: [
      { key: "features.codeAnalysis", label: "代码分析" },
      { key: "features.commitFormat", label: "提交格式" },
      { key: "features.commitMessage", label: "提交信息生成" },
      { key: "features.weeklyReport", label: "周报生成" },
      { key: "features.codeReview", label: "代码审查" },
      { key: "features.branchName", label: "分支名称生成" },
      { key: "features.prSummary", label: "PR摘要" },
    ],
  },
  {
    key: "experimental",
    label: "实验性功能",
    children: [{ key: "experimental.codeIndex", label: "代码库索引" }],
  },
];
