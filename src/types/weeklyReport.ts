/**
 * 周报配置接口
 * @interface Config
 */
export interface Config {
    /** 总工作时长(小时) */
    totalHours: number;
    /** 总工作天数 */
    totalDays: number;
    /** 最小计算单位(小时) */
    minUnit: number;
}

/**
 * Jira问题接口
 * @interface JiraIssue
 */
export interface JiraIssue {
    /** Jira问题的唯一标识符 */
    key: string;
    /** 问题标题 */
    title: string;
    /** 关联用户列表 */
    linkUsers?: string[];
    /** 优先级 */
    priority?: string;
    /** 问题描述 */
    description?: string;
}

/**
 * 工作项接口
 * @interface WorkItem
 */
export interface WorkItem {
    /** 工作内容 */
    content: string;
    /** 工作耗时 */
    time: string;
    /** 工作描述 */
    description: string;
}

/**
 * 代码仓库接口
 * @interface Repository 
 */
export interface Repository {
    /** 仓库类型: git或svn */
    type: 'git' | 'svn';
    /** 仓库路径 */
    path: string;
    /** 仓库作者 */
    author?: string;
}
