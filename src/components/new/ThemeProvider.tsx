import React, { createContext, useContext, useState, useEffect } from "react";
import { type CustomTheme, schoolThemes, applyTheme } from "../../types/theme";

interface ThemeContextType {
  currentTheme: CustomTheme;
  setTheme: (themeKey: string) => void;
  availableThemes: typeof schoolThemes;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<CustomTheme>(schoolThemes.default);

  const setTheme = (themeKey: string) => {
    const theme = applyTheme(themeKey);
    setCurrentTheme(theme);
    // Store in localStorage for persistence
    localStorage.setItem("selectedTheme", themeKey);
  };

  useEffect(() => {
    // Load saved theme on mount
    const savedTheme = localStorage.getItem("selectedTheme");
    if (savedTheme && schoolThemes[savedTheme]) {
      setTheme(savedTheme);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{
      currentTheme,
      setTheme,
      availableThemes: schoolThemes
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}