import React, { useState, useEffect } from "react"; // React import for SettingsPage

import "@arco-design/web-react/dist/css/arco.css";

import SettingsPage from "./pages/settings-page";
import WeeklyReportPage from "./pages/weekly-report-page";
import CommitChatPage from "./pages/commit-chat-page";

interface InitialData {
  viewType?: string;
  vscodeTheme?: string;
  // Add other properties if initialData can contain more
}

// New main App component for routing
const App: React.FC = () => {
  // Access initialData passed from the extension's HTML
  // Ensure this runs after the window object is fully available.
  const [viewType, setViewType] = useState<string | null>(null);
  const [theme, setTheme] = useState<string>('light');

  // 应用主题到document元素
  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  useEffect(() => {
    // initialData might be set by a script in the HTML.
    // We need to ensure we read it after it's potentially set.
    const initialData = (
      window as Window & typeof globalThis & { initialData?: InitialData }
    ).initialData;
    if (initialData && initialData.viewType) {
      setViewType(initialData.viewType);
    } else {
      // Default to commit chat if no specific viewType is provided
      setViewType("commitChatPage");
    }
    
    // 设置初始主题
    if (initialData && initialData.vscodeTheme) {
      setTheme(initialData.vscodeTheme);
    }
  }, []);

  useEffect(() => {
    // 监听主题变化事件
    const handleThemeChange = (event: CustomEvent) => {
      const newTheme = event.detail;
      setTheme(newTheme);
      console.log('Theme changed to:', newTheme);
    };

    window.addEventListener('vscode-theme-changed', handleThemeChange as EventListener);

    return () => {
      window.removeEventListener('vscode-theme-changed', handleThemeChange as EventListener);
    };
  }, []);


  if (viewType === null) {
    // Still determining view type, or initialData not yet available
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg">Loading view...</p>
      </div>
    );
  }

  if (viewType === "settingsPage") {
    return <SettingsPage onBack={() => setViewType("commitChatPage")} />;
  }

  if (viewType === "weeklyReportPage") {
    return <WeeklyReportPage />;
  }

  // Default to CommitChatPage
  return <CommitChatPage onOpenSettings={() => setViewType("settingsPage")} />;
};

export default App;
