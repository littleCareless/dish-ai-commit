## ADDED Requirements

### Requirement: Single-Repository Commit Pipeline Deduplication

The system SHALL execute SCM detection exactly once during single-repository commit generation and SHALL reuse the prepared command context for downstream generation.

#### Scenario: Single repository commit from SCM resource context

- **WHEN** the user triggers commit generation with resource states from one repository
- **THEN** SCM detection is completed during command preparation
- **AND** downstream execution reuses the prepared `scmProvider`, `selectedFiles`, and `repositoryPath`
- **AND** no secondary SCM detection call is performed by commit execution logic.

### Requirement: Cross-Repository Commit Path Reachability

The system SHALL route commit generation to cross-repository handling when selected resources belong to multiple repositories.

#### Scenario: Mixed repository resource states

- **WHEN** the user triggers commit generation with resource states spanning more than one repository
- **THEN** files are grouped by repository
- **AND** cross-repository handling is executed for each repository group
- **AND** cancellation from the parent progress token stops further repository processing.

### Requirement: Canonical Service and Command Artifacts

The system SHALL keep canonical service entrypoints and command artifacts without duplicate active implementations.

#### Scenario: Command and service consistency check

- **WHEN** maintainers run typecheck and command consistency checks
- **THEN** command contributions and runtime registrations remain aligned
- **AND** orphan command implementation files are absent
- **AND** duplicate service implementations outside canonical paths are removed or explicitly deprecated.

### Requirement: Structured Logging in Commit/SCM Critical Paths

The system SHALL use structured logger calls in commit/SCM critical paths instead of direct `console.*` statements.

#### Scenario: Commit generation diagnostics

- **WHEN** commit generation and SCM detection execute
- **THEN** diagnostics are emitted through the shared logger
- **AND** no direct `console.*` call is present in the critical path files.
