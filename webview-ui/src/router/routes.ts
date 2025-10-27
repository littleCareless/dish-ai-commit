// 路由配置
export const routes = {
  settings: "/settings",
  weeklyReport: "/weekly-report",
  vscodeTest: "/vscode-test",
  commitChat: "/commit-chat",
  help: "/help",
  onboarding: "/onboarding",
  operationGuide: "/operation-guide",
  troubleshooting: "/troubleshooting",
} as const;

// 路由类型
export type RouteKey = keyof typeof routes;
