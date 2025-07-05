import { useState, useEffect, useCallback } from 'react';

// Types following strict TypeScript guidelines from rules.md
export type Theme = 'light' | 'dark' | 'auto';

export interface ThemeState {
  theme: Theme;
  actualTheme: 'light' | 'dark'; // The actual theme being used (resolved from auto)
  isSystemDark: boolean;
}

export interface ThemeActions {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  resetToSystem: () => void;
}

export type UseThemeReturn = ThemeState & ThemeActions;

const THEME_STORAGE_KEY = 'ghostline-theme';

export const useTheme = (): UseThemeReturn => {
  const [theme, setThemeState] = useState<Theme>('auto');
  const [isSystemDark, setIsSystemDark] = useState(false);

  // Get system theme preference
  const getSystemTheme = useCallback((): boolean => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }, []);

  // Get actual theme to use (resolve 'auto' to light/dark)
  const getActualTheme = useCallback((themePreference: Theme, systemDark: boolean): 'light' | 'dark' => {
    if (themePreference === 'auto') {
      return systemDark ? 'dark' : 'light';
    }
    return themePreference;
  }, []);

  // Load theme from localStorage
  const loadTheme = useCallback((): Theme => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'auto')) {
        return saved as Theme;
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
    }
    return 'auto';
  }, []);

  // Save theme to localStorage
  const saveTheme = useCallback((newTheme: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
  }, []);

  // Apply theme to document
  const applyTheme = useCallback((actualTheme: 'light' | 'dark') => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      
      if (actualTheme === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
      
      // Add a data attribute for CSS targeting
      root.setAttribute('data-theme', actualTheme);
    }
  }, []);

  // Set theme
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    saveTheme(newTheme);
    
    const actualTheme = getActualTheme(newTheme, isSystemDark);
    applyTheme(actualTheme);
  }, [isSystemDark, saveTheme, getActualTheme, applyTheme]);

  // Toggle between light and dark (ignoring auto)
  const toggleTheme = useCallback(() => {
    const actualTheme = getActualTheme(theme, isSystemDark);
    const newTheme = actualTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [theme, isSystemDark, getActualTheme, setTheme]);

  // Reset to system preference
  const resetToSystem = useCallback(() => {
    setTheme('auto');
  }, [setTheme]);

  // Initialize theme on mount
  useEffect(() => {
    const systemDark = getSystemTheme();
    setIsSystemDark(systemDark);
    
    const savedTheme = loadTheme();
    setThemeState(savedTheme);
    
    const actualTheme = getActualTheme(savedTheme, systemDark);
    applyTheme(actualTheme);
  }, [getSystemTheme, loadTheme, getActualTheme, applyTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        setIsSystemDark(e.matches);
        
        // If using auto theme, update the actual theme
        if (theme === 'auto') {
          const actualTheme = getActualTheme('auto', e.matches);
          applyTheme(actualTheme);
        }
      };

      // Modern browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } 
      // Legacy browsers
      else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    }
  }, [theme, getActualTheme, applyTheme]);

  // Calculate actual theme for return value
  const actualTheme = getActualTheme(theme, isSystemDark);

  return {
    theme,
    actualTheme,
    isSystemDark,
    setTheme,
    toggleTheme,
    resetToSystem
  };
};