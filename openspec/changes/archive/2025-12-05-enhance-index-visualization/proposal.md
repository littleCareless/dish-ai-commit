# Proposal: Enhance Index Status Visualization

## 1. Why?

The current index status visualization is basic, showing only a simple progress bar and a single line of text. Users lack visibility into:

- Which files are currently being processed.
- The history of processed files (log).
- A clear visual indication of success vs. failure rates during the process.
- Estimated time remaining (optional but helpful).

## 2. What Changes?

We will enhance the `IndexingPage` in the webview to include:

- **Styled Progress Bar**: Use a modern UI component for the progress bar.
- **Detailed Status**: Show the current file being processed and the percentage complete.
- **Activity Log**: A scrollable log window showing the last N processed files with their status (Indexed, Skipped, Failed).
- **Visual Stats**: Improved layout for Succeeded/Failed/Total statistics.

## 3. Impact

- **User Experience**: Significantly improved transparency and feedback during the long-running indexing process.
- **Debugging**: Easier to spot which files are causing issues or taking too long.
