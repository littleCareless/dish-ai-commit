import { useExtensionState } from "@/context/extension-state/useExtensionState";
import type { ExtensionState } from "@/context/extension-state/types";

export const useVSCodeContext = () => {
  const state = useExtensionState();
  const { didHydrateState, isFirstInstall, ...initialData } = state;

  return {
    isReady: didHydrateState,
    initialData: initialData as ExtensionState,
    isFirstInstall,
  };
};
