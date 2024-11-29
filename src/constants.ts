
export const EXTENSION_NAME = 'svn-ai-commit';
export const DISPLAY_NAME = 'SVN AI Commit';

export const COMMANDS = {
    GENERATE: 'extension.svn-ai-commit',
    SHOW_MODELS: `${EXTENSION_NAME}.showAvailableModels`,
    REFRESH_MODELS: `${EXTENSION_NAME}.refreshModels`
} as const;