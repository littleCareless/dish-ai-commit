## ADDED Requirements

### Requirement: Progressive Onboarding Wizard

The system SHALL provide a step-by-step onboarding wizard for first-time users to configure essential settings.

#### Scenario: First-time user starts onboarding

- **WHEN** a user opens the extension for the first time
- **THEN** the system SHALL display an onboarding wizard
- **AND** the wizard SHALL guide the user through provider selection, API key configuration, and model selection in sequential steps

#### Scenario: User completes a wizard step

- **WHEN** the user completes configuration for a wizard step
- **THEN** the system SHALL validate the configuration immediately
- **AND** display success or error feedback before allowing progression to the next step

#### Scenario: User skips onboarding

- **WHEN** the user chooses to skip the onboarding wizard
- **THEN** the system SHALL allow the user to proceed with default or minimal configuration
- **AND** provide an option to restart onboarding from the settings page

### Requirement: Configuration Instant Validation

The system SHALL provide real-time validation of user configurations with immediate feedback.

#### Scenario: API Key validation

- **WHEN** the user enters an API key for a selected provider
- **THEN** the system SHALL attempt to validate the key by making a test API call
- **AND** display a connection status indicator (success, failure, or loading)

#### Scenario: Validation failure with guidance

- **WHEN** the configuration validation fails
- **THEN** the system SHALL display a user-friendly error message
- **AND** provide specific guidance based on the error type (invalid key, network issue, quota exceeded)

### Requirement: Smart Environment Detection

The system SHALL detect local AI services and provide intelligent recommendations.

#### Scenario: Local Ollama detected

- **WHEN** the user starts the onboarding wizard
- **AND** Ollama is running locally
- **THEN** the system SHALL recommend Ollama as the preferred provider
- **AND** display detected models available for use

#### Scenario: No local services detected

- **WHEN** no local AI services are detected
- **THEN** the system SHALL recommend free cloud providers (e.g., Gemini, Zhipu AI free tier)
- **AND** provide guidance on obtaining API keys

### Requirement: Quick Start Templates

The system SHALL provide pre-configured templates for common use cases.

#### Scenario: User selects a template

- **WHEN** the user selects a quick start template
- **THEN** the system SHALL apply all template configurations automatically
- **AND** display a summary of applied settings for user review

#### Scenario: Template customization

- **WHEN** the user wants to modify a template configuration
- **THEN** the system SHALL allow inline editing of template values
- **AND** preserve customizations when applying the template
