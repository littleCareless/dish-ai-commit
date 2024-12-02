
export const EXTENSION_NAME = 'dish-ai-commit';
export const DISPLAY_NAME = 'SVN AI Commit';

export const COMMANDS = {
    GENERATE: 'extension.dish-ai-commit',
    SHOW_MODELS: `${EXTENSION_NAME}.showAvailableModels`,
    REFRESH_MODELS: `${EXTENSION_NAME}.refreshModels`
} as const;