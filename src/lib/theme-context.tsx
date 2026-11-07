import * as React from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "altcycles_theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "light";
  });

  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>(() => {
    if (theme === "system") return getSystemTheme();
    return theme;
  });

  // Terapkan class .dark pada elemen <html> dan perbarui resolvedTheme
  React.useEffect(() => {
    const root = document.documentElement;

    function applyTheme(targetResolved: ResolvedTheme) {
      setResolvedTheme(targetResolved);
      if (targetResolved === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mediaQuery.matches ? "dark" : "light");

      const listener = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? "dark" : "light");
      };
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    } else {
      applyTheme(theme);
    }
  }, [theme]);

  function setTheme(newTheme: Theme) {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // Abaikan jika localStorage dibatasi
    }
  }

  function toggleTheme() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  const value = React.useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme harus digunakan di dalam <ThemeProvider>");
  }
  return ctx;
}

