/**
 * SVN源代码管理模块
 * 导出SVN相关类和接口
 */

// 导出主要的SVN提供者类
export { SvnProvider } from '@/scm/svn/svn-provider';

// 导出命令行提供者
export { SvnCommandProvider } from '@/scm/svn/svn-command-provider';
export { CliSvnProvider } from '@/scm/svn/cli-svn-provider';

// 导出SVN提供者工厂（支持优雅降级）
export { SvnProviderFactory } from '@/scm/svn/svn-provider-factory';

// 导出帮助工具类
export { SvnPathHelper } from '@/scm/svn/helpers/svn-path-helper';
export { SvnDiffHelper } from '@/scm/svn/helpers/svn-diff-helper';
export { SvnLogHelper } from '@/scm/svn/helpers/svn-log-helper';

// 导出仓库管理器
export { SvnRepositoryManager } from '@/scm/svn/svn-repository-manager';
