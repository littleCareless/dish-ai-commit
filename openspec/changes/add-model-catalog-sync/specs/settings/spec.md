## MODIFIED Requirements

### Requirement: Dynamic Model Discovery

The system SHALL provide a mechanism to dynamically fetch available models from the selected AI provider and merge discovered models with catalog metadata.

#### Scenario: User clicks detect models

- **WHEN** the user clicks the "Detect Models" button in the settings interface
- **AND** valid credentials (API Key/Base URL) are provided
- **THEN** the system SHALL attempt to connect to the provider
- **AND** retrieve the list of available models
- **AND** update the model selection dropdown with the retrieved list.

#### Scenario: Detection failure

- **WHEN** the model detection fails (e.g., network error, invalid key)
- **THEN** the system SHALL display an error message to the user
- **AND** retain the previous model selection.

#### Scenario: Discovered model missing token limits

- **WHEN** a discovered model does not include reliable token-limit metadata from provider APIs
- **THEN** the system SHALL resolve limits from the local Model Catalog
- **AND** if unavailable, SHALL assign conservative fallback limits with low confidence
- **AND** persist the resolved metadata for request preflight checks.
