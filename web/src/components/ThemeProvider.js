"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext({
  theme: "light",
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

const THEME_KEY = "theme";

const getPreferredTheme = () => {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
};

const applyThemeClass = (nextTheme) => {
  if (typeof document === "undefined") return;
  const isDark = nextTheme === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.dataset.theme = nextTheme;
};

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  // Initialize from storage/media once on mount
  useEffect(() => {
    const initial = getPreferredTheme();
    setTheme(initial);
    applyThemeClass(initial);
  }, []);

  // Persist and apply when theme changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(THEME_KEY, theme);
    applyThemeClass(theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      setTheme,
      toggleTheme: () => setTheme((prev) => (prev === "dark" ? "light" : "dark")),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
