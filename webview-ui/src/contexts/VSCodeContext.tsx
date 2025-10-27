import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface VSCodeContextType {
  isReady: boolean;
  theme: string;
  viewType: string | null;
  initialData: any;
  setTheme: (theme: string) => void;
  setViewType: (viewType: string | null) => void;
}

const VSCodeContext = createContext<VSCodeContextType | undefined>(undefined);

interface VSCodeProviderProps {
  children: ReactNode;
}

export const VSCodeProvider: React.FC<VSCodeProviderProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [theme, setTheme] = useState("light");
  const [viewType, setViewType] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<any>(null);

  useEffect(() => {
    // 获取初始数据
    const getInitialData = () => {
      const data = (window as any).initialData;
      if (data) {
        setInitialData(data);
        if (data.vscodeTheme) {
          setTheme(data.vscodeTheme);
        }
        if (data.viewType) {
          setViewType(data.viewType);
        }
      }
    };

    // 监听主题变化
    const handleThemeChange = (event: CustomEvent) => {
      const newTheme = event.detail;
      setTheme(newTheme);
    };

    // 初始化
    const initialize = () => {
      getInitialData();
      setIsReady(true);
    };

    // 设置事件监听器
    window.addEventListener(
      "vscode-theme-changed",
      handleThemeChange as EventListener,
    );

    // 延迟初始化以确保所有数据都已加载
    const timer = setTimeout(initialize, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener(
        "vscode-theme-changed",
        handleThemeChange as EventListener,
      );
    };
  }, []);

  const value: VSCodeContextType = {
    isReady,
    theme,
    viewType,
    initialData,
    setTheme,
    setViewType,
  };

  return (
    <VSCodeContext.Provider value={value}>{children}</VSCodeContext.Provider>
  );
};

export const useVSCodeContext = (): VSCodeContextType => {
  const context = useContext(VSCodeContext);
  if (context === undefined) {
    throw new Error("useVSCodeContext must be used within a VSCodeProvider");
  }
  return context;
};
