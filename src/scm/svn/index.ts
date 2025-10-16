/**
 * SVN源代码管理模块
 * 导出SVN相关类和接口
 */

// 导出主要的SVN提供者类
export { SvnProvider } from './svn-provider';

// 导出命令行提供者
export { SvnCommandProvider } from './svn-command-provider';
export { CliSvnProvider } from './cli-svn-provider';

// 导出SVN提供者工厂（支持优雅降级）
export { SvnProviderFactory } from './svn-provider-factory';

// 导出帮助工具类
export { SvnPathHelper } from './helpers/svn-path-helper';
export { SvnDiffHelper } from './helpers/svn-diff-helper';
export { SvnLogHelper } from './helpers/svn-log-helper';

// 导出仓库管理器
export { SvnRepositoryManager } from './svn-repository-manager';
