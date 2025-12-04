import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const getTheme = (): Theme => {
  if (typeof window === "undefined") {
    return "light";
  }
  return document.body.classList.contains("vscode-dark") ? "dark" : "light";
};

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(getTheme());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          setTheme(getTheme());
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return { theme };
};
