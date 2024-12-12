export interface Config {
    totalHours: number;
    totalDays: number;
    minUnit: number;
}

export interface JiraIssue {
    key: string;
    title: string;
    linkUsers?: string[];
    priority?: string;
    description?: string;
}

export interface WorkItem {
    content: string;
    time: string;
    description: string;
}

export interface Repository {
    type: 'git' | 'svn';
    path: string;
    author?: string;
}
