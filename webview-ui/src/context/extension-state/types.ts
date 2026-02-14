export interface StyleRule {
  color?: string;
  fontStyle?: string;
  fontWeight?: string;
  textDecoration?: string;
}

export type HljsTheme = Record<string, StyleRule>;

export type ProviderSettings = Record<
  string,
  {
    apiKey?: string;
    model?: string;
    baseUrl?: string;
  }
>;

export type ProviderSettingsEntry = {
  name: string;
  provider: string;
};

export type TelemetrySetting = "unset" | "enabled" | "disabled";

export type Command = {
  id: string;
  name: string;
  description?: string;
};

export interface ExtensionState {
  apiConfiguration: ProviderSettings;
  version: string;
  language: string;
  customInstructions?: string;
  listApiConfigMeta: ProviderSettingsEntry[];
  currentApiConfigName: string;
  telemetrySetting: TelemetrySetting;
  machineId?: string;
  diffEnabled: boolean;
  pinnedApiConfigs?: Record<string, boolean>;
  historyPreviewCollapsed?: boolean;
  reasoningBlockCollapsed?: boolean;
  includeCurrentTime?: boolean;
  includeCurrentCost?: boolean;
}

export interface ExtensionStateContextType extends ExtensionState {
  didHydrateState: boolean;
  showWelcome: boolean;
  isFirstInstall: boolean;
  theme: HljsTheme | undefined;
  filePaths: string[];
  openedTabs: Array<{ label: string; isActive: boolean; path?: string }>;
  commands: Command[];

  setApiConfiguration: (config: ProviderSettings) => void;
  setCustomInstructions: (value?: string) => void;
  setCurrentApiConfigName: (value: string) => void;
  setTelemetrySetting: (value: TelemetrySetting) => void;
  setDiffEnabled: (value: boolean) => void;
  togglePinnedApiConfig: (configName: string) => void;
  setHistoryPreviewCollapsed: (value: boolean) => void;
  setReasoningBlockCollapsed: (value: boolean) => void;
  setIncludeCurrentTime: (value: boolean) => void;
  setIncludeCurrentCost: (value: boolean) => void;
  setLanguage: (value: string) => void;
}
