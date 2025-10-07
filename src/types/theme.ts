export interface CustomTheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background?: string;
    foreground?: string;
  };
  logo?: string;
  companyName?: string;
}

export interface ThemeConfig {
  [key: string]: CustomTheme;
}

// Predefined school themes
export const schoolThemes: ThemeConfig = {
  peculiar: {
    name: "Peculiar Nursery and Primary School",
    colors: {
      primary: "210 100% 50%",    // Blue
      secondary: "0 100% 50%",    // Red
      accent: "0 0% 100%",        // White
      background: "0 0% 98%",
      foreground: "222.2 84% 4.9%",
    },
    logo: "/src/assets/school-logo-example.jpg",
    companyName: "Peculiar Nursery and Primary School"
  },
  default: {
    name: "Diamond Attendance",
    colors: {
      primary: "210 100% 50%",
      secondary: "330 60% 75%",
      accent: "220 50% 25%",
      background: "0 0% 100%",
      foreground: "222.2 84% 4.9%",
    },
    logo: "/src/assets/diamond-logo-new.jpg",
    companyName: "Diamond Attendance"
  }
};

export function applyTheme(themeKey: string) {
  const theme = schoolThemes[themeKey] || schoolThemes.default;
  const root = document.documentElement;
  
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
  
  return theme;
}