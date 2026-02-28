import React, { createContext, useContext, useMemo, ReactNode } from "react";
import { useColorScheme } from "react-native";
import Colors from "@/constants/colors";

type ThemeColors = typeof Colors.light;

interface ThemeContextValue {
  isDark: boolean;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  colors: Colors.light,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const value = useMemo(
    () => ({
      isDark,
      colors: isDark ? Colors.dark : Colors.light,
    }),
    [isDark]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
