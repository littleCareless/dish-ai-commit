import React, { useCallback, useEffect, useState } from "react";

import {
  ExtensionResponse,
  ExtensionResponseMessage,
  UIRequestMessage,
} from "@shared/types/messages";
import i18n from "../i18n/setup";
import { convertTextMateToHljs } from "../utils/textMateToHljs";

import {
  ExtensionStateContext,
  mergeExtensionState,
} from "./extension-state/core";
import type {
  Command,
  ExtensionState,
  ExtensionStateContextType,
  HljsTheme,
  ProviderSettings,
  ProviderSettingsEntry,
} from "./extension-state/types";

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
  const [isFirstInstall, setIsFirstInstall] = useState(false);
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

          // 检查是否为首次安装（从 window.initialData 获取）
          const windowWithInitialData = window as Window & {
            initialData?: { isFirstInstall?: boolean };
          };
          const isFirstInstall =
            windowWithInitialData.initialData?.isFirstInstall || false;

          // 如果是首次安装，显示欢迎页面
          if (isFirstInstall) {
            setIsFirstInstall(true);
            setShowWelcome(true);
          } else {
            // 否则使用原有的逻辑：如果没有 API key 则显示欢迎页面
            const hasApiKeys = Object.values(
              newState.apiConfiguration || {},
            ).some((config) => !!config.apiKey);
            setShowWelcome(!hasApiKeys);
            setIsFirstInstall(false);
          }

          setDidHydrateState(true);
          break;
        }
        case ExtensionResponse.SystemMessageShown: {
          // Legacy: only handle string payload as theme json.
          // Normal SystemMessageShown payload is { callbackId, selection }.
          if (typeof message.data === "string") {
            try {
              setTheme(convertTextMateToHljs(JSON.parse(message.data)));
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
        case ExtensionResponse.ConnectionAllModelsFetched: {
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
    // 注意：webviewDidLaunch 已在 App.tsx 统一处理
    // 这里不再重复发送，避免消息风暴

    // Fallback: Ensure UI unblocks even if extension doesn't send initial state
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
    isFirstInstall,
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
      // 同步切换 i18next 语言
      i18n.changeLanguage(value);
    },
  };

  return (
    <ExtensionStateContext.Provider value={contextValue}>
      {children}
    </ExtensionStateContext.Provider>
  );
};
