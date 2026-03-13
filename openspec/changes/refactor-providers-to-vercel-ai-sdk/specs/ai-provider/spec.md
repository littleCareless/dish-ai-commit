## MODIFIED Requirements

### Requirement: Unified Provider Runtime Execution

The system SHALL execute provider text generation and streaming using Vercel AI SDK while preserving existing `AIProvider` interfaces.

#### Scenario: Standard text generation

- **WHEN** a command invokes `AIProvider.generateCommit` or related generation methods
- **THEN** the provider runtime SHALL execute via AI SDK model generation
- **AND** the returned payload SHALL keep existing content and usage fields.

#### Scenario: Streaming generation

- **WHEN** a command invokes `AIProvider.generateCommitStream`
- **THEN** the provider runtime SHALL stream text chunks through AI SDK streaming
- **AND** callers SHALL continue receiving `AsyncIterable<string>` chunks.

### Requirement: Provider Compatibility

The system SHALL preserve provider id/class compatibility while migrating runtime execution.

#### Scenario: Existing provider selection

- **WHEN** provider instances are created through `AIProviderFactory`
- **THEN** existing provider ids and class entry points SHALL remain valid
- **AND** migrated providers SHALL use the shared AI SDK execution path.

### Requirement: Function Calling Compatibility

The system SHALL preserve commit function-calling behavior for existing call sites.

#### Scenario: Commit function-calling invocation

- **WHEN** `generateCommitWithFunctionCalling` is invoked with JSON-schema style tool definitions
- **THEN** the provider runtime SHALL produce structured arguments compatible with existing commit message assembly
- **AND** fallback content behavior SHALL remain available.
