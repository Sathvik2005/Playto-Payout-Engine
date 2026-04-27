export const THEME_STORAGE_KEY = 'playto-theme'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface AppliedTheme {
  mode: ThemeMode
  resolvedDarkMode: boolean
}

function resolveDarkMode(mode: ThemeMode): boolean {
  if (mode === 'dark') {
    return true
  }

  if (mode === 'light') {
    return false
  }

  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function getInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'system'
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
    return storedTheme
  }

  return 'system'
}

export function applyThemePreference(mode: ThemeMode): AppliedTheme {
  const isDarkMode = resolveDarkMode(mode)

  if (typeof document === 'undefined') {
    return { mode, resolvedDarkMode: isDarkMode }
  }

  document.documentElement.classList.toggle('dark', isDarkMode)
  document.documentElement.dataset.theme = mode
  document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light'

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode)
  }

  return { mode, resolvedDarkMode: isDarkMode }
}

export function getThemeCycle(mode: ThemeMode): ThemeMode {
  if (mode === 'light') {
    return 'dark'
  }

  if (mode === 'dark') {
    return 'system'
  }

  return 'light'
}