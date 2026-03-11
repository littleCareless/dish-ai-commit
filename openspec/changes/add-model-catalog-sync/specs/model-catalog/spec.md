## ADDED Requirements

### Requirement: Catalog-Based Model Limit Resolution

The system SHALL resolve model token-limit metadata from a local Model Catalog before commit-generation request dispatch.

#### Scenario: Exact catalog hit

- **WHEN** a request is prepared with `(provider, model, endpointVariant)` that exists in the catalog
- **THEN** the system SHALL use the catalog `contextLength` and `maxOutputTokens` as the preflight source
- **AND** record the resolved metadata `source` and `confidence` in diagnostics logs.

#### Scenario: Partial catalog hit without endpoint variant

- **WHEN** `(provider, model)` exists but `endpointVariant` does not
- **THEN** the system SHALL fall back to the best matching `(provider, model)` entry
- **AND** mark the resolution as a downgraded match in diagnostics logs.

### Requirement: Deterministic Source Precedence

The system SHALL merge catalog metadata from multiple sources using deterministic precedence.

#### Scenario: Manual override present

- **WHEN** both manual local override and third-party synced records exist for the same key
- **THEN** the system SHALL use the manual local override record
- **AND** SHALL NOT overwrite manual fields during sync operations.

#### Scenario: Third-party default only

- **WHEN** no manual override exists and a third-party synced record exists
- **THEN** the system SHALL use the third-party record as default metadata.

### Requirement: Safe Fallback for Unknown Models

The system SHALL apply conservative fallback limits when no catalog record is available.

#### Scenario: Unknown provider-model key

- **WHEN** the request key is not found in manual or synced catalog records
- **THEN** the system SHALL use provider-family safe fallback limits
- **AND** tag the resolution confidence as `low`
- **AND** continue preflight truncation using the fallback limits.
