import { createContext } from "react";

import type { ExtensionState, ExtensionStateContextType } from "./types";

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
