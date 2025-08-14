/**
 * SCM相关常量定义
 * 集中管理所有SCM相关的常量，避免在多个文件中重复定义
 */

/** 默认超时时间（毫秒） */
export const SCM_TIMEOUTS = {
  /** 默认命令执行超时 */
  DEFAULT_COMMAND: 30000,
  /** 快速命令超时（如版本检查） */
  QUICK_COMMAND: 5000,
  /** 长时间运行命令超时（如大diff） */
  LONG_COMMAND: 60000,
  /** 网络相关命令超时 */
  NETWORK_COMMAND: 45000,
} as const;

/** 缓冲区大小配置 */
export const SCM_BUFFERS = {
  /** 默认最大缓冲区大小（10MB） */
  DEFAULT_MAX_BUFFER: 1024 * 1024 * 10,
  /** 小缓冲区大小（1MB） */
  SMALL_BUFFER: 1024 * 1024,
  /** 大缓冲区大小（50MB） */
  LARGE_BUFFER: 1024 * 1024 * 50,
} as const;

/** SCM类型常量 */
export const SCM_TYPES = {
  GIT: "git" as const,
  SVN: "svn" as const,
} as const;

/** 文件状态常量 */
export const FILE_STATUS = {
  NEW: "New File",
  ADDED: "Added File",
  MODIFIED: "Modified File",
  DELETED: "Deleted File",
  UNKNOWN: "Unknown",
} as const;

/** Diff目标类型 */
export const DIFF_TARGETS = {
  STAGED: "staged",
  ALL: "all",
} as const;

/** 默认分支名称 */
export const DEFAULT_BRANCHES = {
  MAIN: "main",
  MASTER: "master",
  ORIGIN_MAIN: "origin/main",
  ORIGIN_MASTER: "origin/master",
  HEAD: "HEAD",
} as const;

/** Git相关常量 */
export const GIT_CONSTANTS = {
  /** Git目录名 */
  GIT_DIR: ".git",
  /** 默认远程名称 */
  DEFAULT_REMOTE: "origin",
  /** 常见分支 */
  COMMON_BRANCHES: ["main", "master", "develop", "dev"],
  /** Git命令前缀 */
  COMMAND_PREFIX: "git",
  /** 版本标志 */
  VERSION_FLAG: "--version",
} as const;

/** SVN相关常量 */
export const SVN_CONSTANTS = {
  /** SVN目录名 */
  SVN_DIR: ".svn",
  /** SVN命令前缀 */
  COMMAND_PREFIX: "svn",
  /** 版本标志 */
  VERSION_FLAG: "--version",
  /** 默认区域设置 */
  DEFAULT_LOCALE: "en_US.UTF-8",
  /** 常见SVN路径 */
  COMMON_PATHS: {
    WINDOWS: [
      "C:\\Program Files\\TortoiseSVN\\bin\\svn.exe",
      "C:\\Program Files (x86)\\TortoiseSVN\\bin\\svn.exe",
      "C:\\Program Files\\SlikSvn\\bin\\svn.exe",
      "C:\\Program Files\\VisualSVN Server\\bin\\svn.exe",
    ],
    MACOS: [
      "/usr/bin/svn",
      "/usr/local/bin/svn",
      "/opt/homebrew/bin/svn",
      "/opt/local/bin/svn",
    ],
    LINUX: ["/usr/bin/svn", "/usr/local/bin/svn"],
  },
} as const;

/** 路径相关常量 */
export const PATH_CONSTANTS = {
  /** 路径分隔符 */
  SEPARATOR: require("path").sep,
  /** 临时文件前缀 */
  TEMP_PREFIX: "scm_temp_",
  /** 危险字符模式 */
  DANGEROUS_CHARS: /[;&|`$\\]/g,
  /** SCM目录模式 */
  SCM_DIRS: [".git", ".svn", ".hg", ".bzr"],
} as const;

/** 重试配置 */
export const RETRY_CONFIG = {
  /** 默认最大重试次数 */
  DEFAULT_MAX_RETRIES: 3,
  /** 默认重试延迟（毫秒） */
  DEFAULT_RETRY_DELAY: 1000,
  /** 指数退避基数 */
  EXPONENTIAL_BASE: 2,
  /** 最大重试延迟（毫秒） */
  MAX_RETRY_DELAY: 10000,
} as const;

/** 日志配置 */
export const LOG_CONFIG = {
  /** 日志前缀 */
  PREFIX: "[SCM]",
  /** 时间戳格式 */
  TIMESTAMP_FORMAT: "ISO",
  /** 最大日志长度 */
  MAX_LOG_LENGTH: 1000,
  /** 性能日志阈值（毫秒） */
  PERFORMANCE_THRESHOLD: 5000,
} as const;

/** 错误代码 */
export const ERROR_CODES = {
  /** SVN认证错误 */
  SVN_AUTH_ERROR: ["E170001", "E170013"],
  /** Git认证错误 */
  GIT_AUTH_ERROR: ["Authentication failed"],
  /** 网络错误 */
  NETWORK_ERROR: ["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT"],
  /** 权限错误 */
  PERMISSION_ERROR: ["EACCES", "EPERM"],
} as const;

/** 通知消息键 */
export const NOTIFICATION_KEYS = {
  /** 提交消息复制成功 */
  COMMIT_MESSAGE_COPIED: "commit.message.copied",
  /** 提交消息复制失败 */
  COMMIT_MESSAGE_COPY_FAILED: "commit.message.copy.failed",
  /** 差异文件信息 */
  DIFF_FILES_INFO: {
    SELECTED: "diff.files.selected",
    STAGED: "diff.staged.info",
    ALL: "diff.all.info",
  },
  /** SCM版本检测 */
  SCM_VERSION_DETECTED: "scm.version.detected",
  /** 仓库未找到 */
  REPOSITORY_NOT_FOUND: "scm.repository.not.found",
} as const;

/** 文件扩展名过滤 */
export const FILE_FILTERS = {
  /** 忽略的文件扩展名 */
  IGNORED_EXTENSIONS: [
    ".log",
    ".tmp",
    ".temp",
    ".cache",
    ".DS_Store",
    "Thumbs.db",
    ".gitkeep",
  ],
  /** 忽略的目录 */
  IGNORED_DIRECTORIES: [
    "node_modules",
    ".git",
    ".svn",
    ".hg",
    "dist",
    "build",
    "out",
    "target",
    ".vscode",
    ".idea",
    "__pycache__",
  ],
} as const;

/** 性能监控阈值 */
export const PERFORMANCE_THRESHOLDS = {
  /** 慢命令阈值（毫秒） */
  SLOW_COMMAND: 5000,
  /** 超慢命令阈值（毫秒） */
  VERY_SLOW_COMMAND: 15000,
  /** 内存使用警告阈值（MB） */
  MEMORY_WARNING: 100,
  /** 文件数量警告阈值 */
  FILE_COUNT_WARNING: 1000,
} as const;
