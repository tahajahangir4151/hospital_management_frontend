"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    // Enforce light mode as requested
    const root = document.documentElement;
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    try {
      localStorage.removeItem("hms_theme");
    } catch {}
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState("light");
    applyTheme("light");
  };

  const toggleTheme = () => {
    // Disabled for now
  };

  return (
    <ThemeContext.Provider value={{ theme: "light", toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
