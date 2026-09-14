"use client";

import { createContext, useContext } from "react";

const LocaleContext = createContext({
  locale: "en",
  globalData: null,
});

export function LocaleProvider({ locale = "en", globalData = null, children }) {
  return (
    <LocaleContext.Provider value={{ locale, globalData }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  return context?.locale || "en";
}

export function useGlobalData() {
  const context = useContext(LocaleContext);
  return context?.globalData || null;
}
