import React from "react";
import { ExtensionStateContextProvider } from "../context/ExtensionStateContext";

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
