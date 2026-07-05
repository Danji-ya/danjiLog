import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "danjilog:theme";

type Theme = "light" | "dark";

// index.html의 첫 페인트 이전 스크립트와 동일한 값으로 유지하세요.
const THEME_COLOR: Record<Theme, string> = { light: "#ffffff", dark: "#000000" };

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useDarkMode() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return { theme, isDark: theme === "dark", toggle };
}
