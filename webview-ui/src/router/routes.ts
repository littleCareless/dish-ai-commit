// 路由配置
export const routes = {
  welcome: "/",
  settings: "/settings",
  notifications: "/notifications",
  context: "/context",
  prompts: "/prompts",
  commitChat: "/commit-chat",
  experimental: "/experimental",
  about: "/about",
  indexing: "/indexing",
  i18nDebug: "/i18n-debug",
  usage: "/usage",
  storage: "/storage",
  profiles: "/profiles",
  migration: "/migration",
  weeklyReport: "/weekly-report",
} as const;

// 路由类型
export type RouteKey = keyof typeof routes;
