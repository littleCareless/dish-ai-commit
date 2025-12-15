# Spec: Indexing Visualization

## ADDED Requirements

### Requirement: Progress Visualization

The indexing page MUST provide clear visual feedback on the progress of the operation.

#### Scenario: Indexing in progress

Given the indexing process has started
When the backend sends a progress update with `current` and `total` values
Then the UI should display a progress bar reflecting the percentage completion
And the UI should display the name of the file currently being processed

### Requirement: Activity Log

The indexing page MUST display a history of recent indexing activities.

#### Scenario: Log updates

Given the indexing process is running
When the backend sends a progress message
Then the message should be appended to a scrollable log view
And the log view should auto-scroll to the latest entry
And the log should retain at least the last 50 entries

### Requirement: Statistics Enhancement

The indexing page MUST display detailed statistics about the indexing results.

#### Scenario: Indexing completed

Given the indexing process has finished
When the backend sends the final statistics
Then the UI should display the count of Succeeded, Failed, and Skipped files
And the UI should provide a way to view the list of failed files if any exist
