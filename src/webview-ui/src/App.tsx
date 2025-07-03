import React, { useState, useEffect } from "react"; // React import for SettingsPage

import "@arco-design/web-react/dist/css/arco.css";

import SettingsPage from "./pages/settings-page";
import WeeklyReportPage from "./pages/weekly-report-page";

interface InitialData {
  viewType?: string;
  // Add other properties if initialData can contain more
}

// New main App component for routing
const App: React.FC = () => {
  // Access initialData passed from the extension's HTML
  // Ensure this runs after the window object is fully available.
  const [viewType, setViewType] = useState<string | null>(null);

  useEffect(() => {
    // initialData might be set by a script in the HTML.
    // We need to ensure we read it after it's potentially set.
    const initialData = (
      window as Window & typeof globalThis & { initialData?: InitialData }
    ).initialData;
    if (initialData && initialData.viewType) {
      setViewType(initialData.viewType);
    } else {
      // Default to weekly report if no specific viewType is provided
      // This could happen if the webview is opened for the weekly report directly
      setViewType("weeklyReportPage"); // Or handle as an error/unknown state
    }
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
    return <SettingsPage />;
  }
  // Default to WeeklyReportPage or handle other view types
  return <WeeklyReportPage />;
};

export default App;
