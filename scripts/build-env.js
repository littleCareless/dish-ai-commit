/**
 * 构建环境管理工具
 * 统一管理开发/生产环境的环境变量
 */

/**
 * 解析构建模式
 * @param {string[]} args - 命令行参数
 * @returns {'development' | 'production'}
 */
function parseMode(args) {
  if (args.includes("--production")) return "production";
  if (args.includes("--mode=prod")) return "production";
  if (args.includes("--mode=dev")) return "development";
  return "development";
}

/**
 * 获取构建环境变量
 * @param {string} mode - 构建模式 'development' | 'production'
 * @returns {object} 环境变量配置
 */
function getBuildEnv(mode = "development") {
  const isProd = mode === "production" || mode === "prod";

  return {
    BUILD_MODE: isProd ? "production" : "development",
    ENABLE_DEBUG_ROUTES: !isProd,
    ENABLE_DEBUG_LOGS: !isProd,
    BUILD_VERSION: isProd ? "prod" : "dev",
  };
}

/**
 * 获取用于 esbuild 的 define 配置
 * @param {string} mode - 构建模式
 * @returns {object} esbuild define 配置
 */
function getEsbuildDefine(mode = "development") {
  const env = getBuildEnv(mode);

  return {
    "process.env.BUILD_MODE": JSON.stringify(env.BUILD_MODE),
    "process.env.ENABLE_DEBUG_ROUTES": JSON.stringify(env.ENABLE_DEBUG_ROUTES),
    "process.env.ENABLE_DEBUG_LOGS": JSON.stringify(env.ENABLE_DEBUG_LOGS),
  };
}

/**
 * 获取用于 Vite 的 define 配置
 * @param {string} mode - 构建模式
 * @returns {object} Vite define 配置
 */
function getViteDefine(mode = "development") {
  const env = getBuildEnv(mode);

  return {
    "import.meta.env.BUILD_MODE": JSON.stringify(env.BUILD_MODE),
    "import.meta.env.ENABLE_DEBUG_ROUTES": JSON.stringify(
      env.ENABLE_DEBUG_ROUTES,
    ),
    "import.meta.env.ENABLE_DEBUG_LOGS": JSON.stringify(env.ENABLE_DEBUG_LOGS),
  };
}

/**
 * 输出构建信息日志
 * @param {string} builder - 构建工具名称
 * @param {string} mode - 构建模式
 * @param {object} options - 额外选项
 */
function logBuildInfo(builder, mode, options = {}) {
  const env = getBuildEnv(mode);
  const { minify, sourcemap } = options;

  console.log(`[${builder}] ========== 构建环境信息 ==========`);
  console.log(`[${builder}] BUILD_MODE: ${env.BUILD_MODE}`);
  console.log(`[${builder}] ENABLE_DEBUG_ROUTES: ${env.ENABLE_DEBUG_ROUTES}`);
  console.log(`[${builder}] ENABLE_DEBUG_LOGS: ${env.ENABLE_DEBUG_LOGS}`);
  if (minify !== undefined) {
    console.log(`[${builder}] minify: ${minify}`);
  }
  if (sourcemap !== undefined) {
    console.log(`[${builder}] sourcemap: ${sourcemap}`);
  }
  console.log(`[${builder}] ===================================`);
}

module.exports = {
  parseMode,
  getBuildEnv,
  getEsbuildDefine,
  getViteDefine,
  logBuildInfo,
};
