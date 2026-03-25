# WebView Entry Enhancement Plan

## Goal

Add WebView entry points for common operations while keeping all extension commands intact.

## Principles

1. Keep extension commands for compatibility, keybindings, and automation.
2. Add equivalent WebView entry points for user-facing operations.
3. Drive actions through typed message channels (`UIRequest`/`ExtensionResponse`).
4. Keep one backend execution path so command and WebView do not diverge.
5. Prefer feature-page-local actions (e.g. model catalog sync in `Features > Context Guard`).

## Current command inventory

From `src/commands.ts`:

1. `dish-ai-commit` (generate commit)
2. `dish-ai-commit.generateWeeklyReport`
3. `dish-ai-commit.reviewCode`
4. `dish-ai-commit.generateBranchName`
5. `dish-ai-commit.generatePRSummary`
6. `dish-ai-commit.syncModelCatalog`

## WebView coverage

1. `syncModelCatalog`: available in WebView (`Features > Context Guard > Sync Now`) and Command Palette.
2. `generateWeeklyReport`: available in WebView (`weekly-report-page`) and in `Features > Quick Actions`.
3. `generate commit/review/branch/pr summary`: available in `Features > Quick Actions` and still available in Command Palette.
4. Home page quick entry: common actions are available in `Welcome > Quick Actions`.

## Lightweight action tracking

1. Every WebView quick action records `{action, source, timestamp}` counters in extension global state.
2. Current sources: `settings-features`, `welcome-page`.
3. Purpose: compare discoverability and usage between WebView entry points and command-driven flow.

## Next migration steps

1. Add a "Quick Actions" block in WebView home/settings with the remaining command entry points.
2. Add message handlers for each remaining command action to keep UI and extension logic decoupled.
3. Add telemetry/usage counters by WebView action to validate UX impact.
