"use client";

import { useTheme } from "@/components/ThemeProvider";

export default function DarkModeBubble() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-gray-900 dark:bg-accent-400 text-white dark:text-gray-900 shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="text-lg">{isDark ? "🌞" : "🌙"}</span>
    </button>
  );
}