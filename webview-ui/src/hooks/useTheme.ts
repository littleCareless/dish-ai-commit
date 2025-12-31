import { useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark";

// 获取当前主题
export const getTheme = (): Theme => {
  if (typeof window === "undefined") {
    return "light";
  }

  // 优先检查 body 的 class（包括 Tailwind 的 dark/light 类）
  if (document.body.classList.contains("dark")) {
    return "dark";
  }
  if (document.body.classList.contains("light")) {
    return "light";
  }

  // 检查 VS Code 的主题类
  if (document.body.classList.contains("vscode-dark")) {
    return "dark";
  }
  if (document.body.classList.contains("vscode-light")) {
    return "light";
  }

  // 如果没有明确的类，检查系统主题
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
};

// 检查是否处于深色模式
export const isDarkTheme = (): boolean => {
  return getTheme() === "dark";
};

// 手动设置主题（用于测试或开发）
export const setTheme = (theme: Theme): void => {
  if (typeof window === "undefined") {
    return;
  }

  if (theme === "dark") {
    document.body.classList.add("dark");
    document.body.classList.remove("light");
  } else {
    document.body.classList.add("light");
    document.body.classList.remove("dark");
  }
};

// 主题切换钩子
export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(getTheme());
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 获取当前主题
  const getCurrentTheme = useCallback(() => {
    return getTheme();
  }, []);

  // 切换主题
  const toggleTheme = useCallback(() => {
    const newTheme = theme === "light" ? "dark" : "light";
    setIsTransitioning(true);
    setThemeState(newTheme);

    // 应用主题类
    if (newTheme === "dark") {
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    } else {
      document.body.classList.add("light");
      document.body.classList.remove("dark");
    }

    // 结束过渡状态
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);

    return newTheme;
  }, [theme]);

  // 强制设置主题
  const forceSetTheme = useCallback((newTheme: Theme) => {
    setIsTransitioning(true);
    setThemeState(newTheme);

    if (newTheme === "dark") {
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    } else {
      document.body.classList.add("light");
      document.body.classList.remove("dark");
    }

    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // 确保 body 上同时存在正确的 Tailwind 类和 VS Code 类
    const syncBodyClasses = () => {
      const hasVscodeDark = document.body.classList.contains("vscode-dark");
      const hasVscodeLight = document.body.classList.contains("vscode-light");
      const hasDark = document.body.classList.contains("dark");
      const hasLight = document.body.classList.contains("light");

      // 如果有 VS Code 类但没有对应的 Tailwind 类，添加 Tailwind 类
      if (hasVscodeDark && !hasDark) {
        document.body.classList.add("dark");
        document.body.classList.remove("light");
      } else if (hasVscodeLight && !hasLight) {
        document.body.classList.add("light");
        document.body.classList.remove("dark");
      } else if (!hasVscodeDark && !hasVscodeLight) {
        // 如果没有 VS Code 类，确保至少有一个 Tailwind 类
        if (!hasDark && !hasLight) {
          const currentTheme = getTheme();
          if (currentTheme === "dark") {
            document.body.classList.add("dark");
          } else {
            document.body.classList.add("light");
          }
        }
      }
    };

    // 初始同步
    syncBodyClasses();

    // 监听 body class 变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          // 先同步类，再检测主题
          syncBodyClasses();
          const newTheme = getTheme();
          if (newTheme !== theme) {
            setThemeState(newTheme);
          }
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // 监听系统主题变化（当没有 VS Code 主题时）
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // 只在没有明确的 VS Code 主题时响应系统变化
      if (
        !document.body.classList.contains("vscode-dark") &&
        !document.body.classList.contains("vscode-light")
      ) {
        const newTheme = e.matches ? "dark" : "light";
        setThemeState(newTheme);
        if (newTheme === "dark") {
          document.body.classList.add("dark");
          document.body.classList.remove("light");
        } else {
          document.body.classList.add("light");
          document.body.classList.remove("dark");
        }
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
    } else {
      // 兼容旧浏览器
      mediaQuery.addListener(handleSystemThemeChange as any);
    }

    return () => {
      observer.disconnect();
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleSystemThemeChange);
      } else {
        mediaQuery.removeListener(handleSystemThemeChange as any);
      }
    };
  }, [theme]); // Add theme to dependencies

  return {
    theme,
    isDark: theme === "dark",
    isLight: theme === "light",
    isTransitioning,
    getCurrentTheme,
    toggleTheme,
    forceSetTheme,
  };
};
