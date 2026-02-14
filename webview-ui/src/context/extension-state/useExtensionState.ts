import { useContext } from "react";

import { ExtensionStateContext } from "./core";

export const useExtensionState = () => {
  const context = useContext(ExtensionStateContext);

  if (context === undefined) {
    throw new Error(
      "useExtensionState must be used within an ExtensionStateContextProvider",
    );
  }

  return context;
};
