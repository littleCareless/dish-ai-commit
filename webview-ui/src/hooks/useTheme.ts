import { useState, useEffect } from "react";
import { useVSCodeContext } from "../contexts/VSCodeContext";

export const useTheme = () => {
  const { theme: vscodeTheme, setTheme: setVSCodeTheme } = useVSCodeContext();
  const [theme, setTheme] = useState(vscodeTheme || "light");

  useEffect(() => {
    if (vscodeTheme) {
      setTheme(vscodeTheme);
    }
  }, [vscodeTheme]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    setVSCodeTheme(newTheme);
  };

  const isDark = theme === "dark";
  const isLight = theme === "light";

  return {
    theme,
    isDark,
    isLight,
    toggleTheme,
    setTheme: (newTheme: string) => {
      setTheme(newTheme);
      setVSCodeTheme(newTheme);
    },
  };
};
