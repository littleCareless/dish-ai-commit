import { Theme, getTheme, isDarkTheme } from "@/hooks/useTheme";

/**
 * 主题工具函数
 * 提供主题相关的辅助功能
 */

/**
 * 获取当前主题的CSS变量值
 * @param variableName - CSS变量名（不包含--前缀）
 * @returns 变量值或默认值
 */
export function getCSSVariable(
  variableName: string,
  defaultValue?: string,
): string {
  if (typeof window === "undefined") {
    return defaultValue || "";
  }

  const computedStyle = getComputedStyle(document.documentElement);
  const value = computedStyle.getPropertyValue(`--${variableName}`).trim();

  return value || defaultValue || "";
}

/**
 * 获取主题相关的CSS变量值
 * 自动处理浅色/深色模式的变量映射
 * @param baseVariable - 基础变量名（不包含--前缀）
 * @returns 主题适配的变量值
 */
export function getThemeVariable(baseVariable: string): string {
  const theme = getTheme();
  const suffix = theme === "dark" ? "-dark" : "-light";

  // 尝试获取主题特定的变量
  const themedValue = getCSSVariable(`${baseVariable}${suffix}`, "");

  // 如果没有主题特定变量，返回基础变量
  if (!themedValue) {
    return getCSSVariable(baseVariable, "");
  }

  return themedValue;
}

/**
 * 检查当前是否为深色主题
 * @returns 是否为深色主题
 */
export function isDark(): boolean {
  return isDarkTheme();
}

/**
 * 检查当前是否为浅色主题
 * @returns 是否为浅色主题
 */
export function isLight(): boolean {
  return !isDarkTheme();
}

/**
 * 动态生成主题类名
 * @param baseClass - 基础类名
 * @param darkClass - 深色模式类名（可选）
 * @param lightClass - 浅色模式类名（可选）
 * @returns 组合后的类名字符串
 */
export function themedClass(
  baseClass: string,
  darkClass?: string,
  lightClass?: string,
): string {
  const theme = getTheme();
  const classes = [baseClass];

  if (theme === "dark" && darkClass) {
    classes.push(darkClass);
  } else if (theme === "light" && lightClass) {
    classes.push(lightClass);
  }

  return classes.join(" ");
}

/**
 * 获取主题颜色值（HSL格式）
 * @param colorName - 颜色变量名
 * @returns HSL颜色字符串
 */
export function getThemeColor(colorName: string): string {
  const value = getCSSVariable(colorName);
  return value ? `hsl(${value})` : "";
}

/**
 * 主题切换器
 * 提供平滑的主题切换功能
 */
export class ThemeSwitcher {
  private static instance: ThemeSwitcher;

  private constructor() {}

  static getInstance(): ThemeSwitcher {
    if (!ThemeSwitcher.instance) {
      ThemeSwitcher.instance = new ThemeSwitcher();
    }
    return ThemeSwitcher.instance;
  }

  /**
   * 切换主题
   */
  toggle(): Theme {
    const current = getTheme();
    const next = current === "light" ? "dark" : "light";

    if (next === "dark") {
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    } else {
      document.body.classList.add("light");
      document.body.classList.remove("dark");
    }

    // 触发自定义事件
    const event = new CustomEvent("theme-change", {
      detail: { theme: next, previous: current },
    });
    window.dispatchEvent(event);

    return next;
  }

  /**
   * 设置特定主题
   */
  setTheme(theme: Theme): void {
    const current = getTheme();

    if (theme === "dark") {
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    } else {
      document.body.classList.add("light");
      document.body.classList.remove("dark");
    }

    if (current !== theme) {
      const event = new CustomEvent("theme-change", {
        detail: { theme, previous: current },
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * 监听主题变化
   */
  onChange(callback: (theme: Theme, previous: Theme) => void): () => void {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { theme, previous } = customEvent.detail;
      callback(theme, previous);
    };

    window.addEventListener("theme-change", handler);

    return () => {
      window.removeEventListener("theme-change", handler);
    };
  }
}

/**
 * 主题感知的样式生成器
 */
export const themeStyles = {
  /**
   * 生成主题适配的背景色
   */
  background: (opacity: number = 1) => {
    const color = getThemeColor("background");
    return opacity < 1
      ? color.replace(")", `, ${opacity})`).replace("hsl", "hsla")
      : color;
  },

  /**
   * 生成主题适配的前景色
   */
  foreground: (opacity: number = 1) => {
    const color = getThemeColor("foreground");
    return opacity < 1
      ? color.replace(")", `, ${opacity})`).replace("hsl", "hsla")
      : color;
  },

  /**
   * 生成主题适配的边框色
   */
  border: (strength: "subtle" | "normal" | "strong" = "normal") => {
    const variableMap = {
      subtle: "border-subtle",
      normal: "border",
      strong: "border-strong",
    };
    return getThemeColor(variableMap[strength]);
  },

  /**
   * 生成主题适配的悬停色
   */
  hover: () => {
    return getThemeColor("hover-bg");
  },

  /**
   * 生成主题适配的 muted 背景色
   */
  muted: () => {
    return getThemeColor("muted");
  },

  /**
   * 生成主题适配的 muted 前景色
   */
  mutedForeground: () => {
    return getThemeColor("muted-foreground");
  },
};

/**
 * 主题验证工具
 */
export const themeValidator = {
  /**
   * 验证CSS变量是否存在
   */
  hasVariable: (variableName: string): boolean => {
    return !!getCSSVariable(variableName);
  },

  /**
   * 验证主题是否有效
   */
  isValidTheme: (theme: string): theme is Theme => {
    return theme === "light" || theme === "dark";
  },

  /**
   * 检查主题系统是否已初始化
   */
  isInitialized: (): boolean => {
    if (typeof window === "undefined") return false;

    const bodyClasses = document.body.classList;
    return (
      bodyClasses.contains("dark") ||
      bodyClasses.contains("light") ||
      bodyClasses.contains("vscode-dark") ||
      bodyClasses.contains("vscode-light")
    );
  },
};

/**
 * 主题动画工具
 */
export const themeAnimation = {
  /**
   * 为元素添加主题切换动画
   */
  addTransition: (element: HTMLElement, duration: number = 300) => {
    element.style.transition = `background-color ${duration}ms ease, color ${duration}ms ease, border-color ${duration}ms ease`;
  },

  /**
   * 移除主题切换动画
   */
  removeTransition: (element: HTMLElement) => {
    element.style.transition = "";
  },

  /**
   * 等待主题切换完成
   */
  waitForTransition: (duration: number = 300): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, duration));
  },
};
