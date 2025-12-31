import React from "react";
import {
  ExtensionState,
  ExtensionStateContextProvider,
  useExtensionState,
} from "../context/ExtensionStateContext";

/**
 * Provides a hook to access the VS Code extension's state.
 * This is a compatibility wrapper around `useExtensionState`.
 *
 * @returns An object with:
 *  - `isReady`: A boolean that is true when the initial state has been received from the extension.
 *  - `initialData`: An object containing the full state from the extension.
 *  - `isFirstInstall`: A boolean indicating if this is the first installation.
 */
export const useVSCodeContext = () => {
  const state = useExtensionState();
  // Separate the readiness flag from the rest of the state data.
  const { didHydrateState, isFirstInstall, ...initialData } = state;

  return {
    isReady: didHydrateState,
    initialData: initialData as ExtensionState,
    isFirstInstall,
  };
};

/**
 * A compatibility wrapper for the ExtensionStateContextProvider.
 * This allows the rest of the application to use `VSCodeProvider` as expected.
 */
export const VSCodeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <ExtensionStateContextProvider>{children}</ExtensionStateContextProvider>
  );
};
