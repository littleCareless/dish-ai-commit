import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  ExtensionResponse,
  ExtensionResponseMessage,
  UIRequestMessage,
} from "@shared/types/messages";
import { convertTextMateToHljs } from "../utils/textMateToHljs";
import { postMessage } from "../utils/vscode";

// --- Type Definitions ---

export interface StyleRule {
  color?: string;
  fontStyle?: string;
  fontWeight?: string;
  textDecoration?: string;
}

export type HljsTheme = Record<string, StyleRule>;

// Adapted for the svn-commit-gen project. These types would typically be shared
// with the extension backend.

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

// The state broadcast from the extension to the webview
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

// The full context type, including state and setters
export interface ExtensionStateContextType extends ExtensionState {
  didHydrateState: boolean;
  showWelcome: boolean;
  theme: HljsTheme | undefined; // The converted TextMate theme for highlighting
  filePaths: string[];
  openedTabs: Array<{ label: string; isActive: boolean; path?: string }>;
  commands: Command[];

  // Setters
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

export const ExtensionStateContext = createContext<
  ExtensionStateContextType | undefined
>(undefined);

export const mergeExtensionState = (
  prevState: ExtensionState,
  newState: Partial<ExtensionState>,
) => {
  return {
    ...prevState,
    ...newState,
    apiConfiguration: {
      ...prevState.apiConfiguration,
      ...newState.apiConfiguration,
    },
  };
};

export const ExtensionStateContextProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [state, setState] = useState<ExtensionState>({
    apiConfiguration: {},
    version: "",
    language:
      (window as { initialData?: { language?: string } }).initialData
        ?.language || "en",
    listApiConfigMeta: [],
    currentApiConfigName: "default",
    telemetrySetting: "unset",
    diffEnabled: true,
    pinnedApiConfigs: {},
    historyPreviewCollapsed: false,
    reasoningBlockCollapsed: true,
    includeCurrentTime: true,
    includeCurrentCost: true,
  });

  const [didHydrateState, setDidHydrateState] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [theme, setTheme] = useState<HljsTheme | undefined>(undefined);
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [openedTabs, setOpenedTabs] = useState<
    Array<{ label: string; isActive: boolean; path?: string }>
  >([]);
  const [commands, setCommands] = useState<Command[]>([]);

  const setListApiConfigMeta = useCallback(
    (value: ProviderSettingsEntry[]) =>
      setState((prevState) => ({ ...prevState, listApiConfigMeta: value })),
    [],
  );

  const setApiConfiguration = useCallback((value: ProviderSettings) => {
    setState((prevState) => ({
      ...prevState,
      apiConfiguration: {
        ...prevState.apiConfiguration,
        ...value,
      },
    }));
  }, []);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const message: ExtensionResponseMessage | UIRequestMessage = event.data;
      switch (message.command) {
        case ExtensionResponse.SystemAllStorageLoaded: {
          const newState = message.data as ExtensionState;
          setState((prevState) => mergeExtensionState(prevState, newState));
          // A simple heuristic for the welcome screen: show if no API keys are configured.
          const hasApiKeys = Object.values(
            newState.apiConfiguration || {},
          ).some((config) => !!config.apiKey);
          setShowWelcome(!hasApiKeys);
          setDidHydrateState(true);
          break;
        }
        case ExtensionResponse.SystemMessageShown: {
          // Assuming this is for theme changes
          if (message.data) {
            try {
              setTheme(
                convertTextMateToHljs(JSON.parse(message.data as string)),
              );
            } catch (e) {
              console.error("Failed to parse or convert theme JSON", e);
              setTheme({});
            }
          }
          break;
        }
        case ExtensionResponse.SystemPackageInfoLoaded: {
          // Assuming this for workspace updates
          setFilePaths(message.data.filePaths ?? []);
          setOpenedTabs(message.data.openedTabs ?? []);
          break;
        }
        case ExtensionResponse.ConnectionAllModelsLoaded: {
          // Assuming this for command updates
          setCommands(message.data ?? []);
          break;
        }
        case ExtensionResponse.ProfileAllProvidersLoaded: {
          setListApiConfigMeta(message.data ?? []);
          break;
        }
      }
    },
    [setListApiConfigMeta],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [handleMessage]);

  useEffect(() => {
    postMessage("webviewDidLaunch");

    // Fallback: Ensure UI unblocks even if extension doesn't send initial state
    // 保留作为兜底方案，防止后端响应失败导致页面卡死
    const timer = setTimeout(() => {
      setDidHydrateState((prev) => {
        if (!prev) {
          console.warn(
            "[ExtensionStateContext] Hydration timed out, forcing ready state.",
          );
          return true;
        }
        return prev;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const contextValue: ExtensionStateContextType = {
    ...state,
    didHydrateState,
    showWelcome,
    theme,
    filePaths,
    openedTabs,
    commands,
    setApiConfiguration,
    setCustomInstructions: (value) =>
      setState((prevState) => ({ ...prevState, customInstructions: value })),
    setCurrentApiConfigName: (value) =>
      setState((prevState) => ({ ...prevState, currentApiConfigName: value })),
    setTelemetrySetting: (value) =>
      setState((prevState) => ({ ...prevState, telemetrySetting: value })),
    setDiffEnabled: (value) =>
      setState((prevState) => ({ ...prevState, diffEnabled: value })),
    togglePinnedApiConfig: (configId) =>
      setState((prevState) => {
        const currentPinned = prevState.pinnedApiConfigs || {};
        const newPinned = {
          ...currentPinned,
          [configId]: !currentPinned[configId],
        };

        if (!newPinned[configId]) {
          delete newPinned[configId];
        }

        return { ...prevState, pinnedApiConfigs: newPinned };
      }),
    setHistoryPreviewCollapsed: (value) =>
      setState((prevState) => ({
        ...prevState,
        historyPreviewCollapsed: value,
      })),
    setReasoningBlockCollapsed: (value) =>
      setState((prevState) => ({
        ...prevState,
        reasoningBlockCollapsed: value,
      })),
    setIncludeCurrentTime: (value) =>
      setState((prevState) => ({ ...prevState, includeCurrentTime: value })),
    setIncludeCurrentCost: (value) =>
      setState((prevState) => ({ ...prevState, includeCurrentCost: value })),
    setLanguage: (value) => {
      setState((prevState) => ({ ...prevState, language: value }));
      postMessage("setLanguage", { value });
    },
  };

  return (
    <ExtensionStateContext.Provider value={contextValue}>
      {children}
    </ExtensionStateContext.Provider>
  );
};

export const useExtensionState = () => {
  const context = useContext(ExtensionStateContext);

  if (context === undefined) {
    throw new Error(
      "useExtensionState must be used within an ExtensionStateContextProvider",
    );
  }

  return context;
};
