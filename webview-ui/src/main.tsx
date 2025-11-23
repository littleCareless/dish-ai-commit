import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../node_modules/@vscode/codicons/dist/codicon.css";
import AppWithProviders from "./App";
import "./i18n/setup"; // 初始化 i18next
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWithProviders />
  </StrictMode>,
);
