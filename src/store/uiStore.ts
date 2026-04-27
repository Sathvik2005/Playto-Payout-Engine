import { create } from 'zustand'
import {
  applyThemePreference,
  getInitialThemeMode,
  getThemeCycle,
  type ThemeMode,
} from '../utils/theme'

const MERCHANT_STORAGE_KEY = 'playto-selected-merchant-id'
const AUTH_TOKEN_STORAGE_KEY = 'playto-auth-token'

function getInitialMerchantId(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(MERCHANT_STORAGE_KEY)
}

function persistMerchantId(merchantId: string | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (!merchantId) {
    window.localStorage.removeItem(MERCHANT_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(MERCHANT_STORAGE_KEY, merchantId)
}

function getInitialAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
}

function persistAuthToken(token: string | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (!token) {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
}

interface UIState {
  themeMode: ThemeMode
  resolvedDarkMode: boolean
  selectedMerchantId: string | null
  authToken: string | null
  cycleThemeMode: () => void
  setThemeMode: (mode: ThemeMode) => void
  setSelectedMerchantId: (merchantId: string | null) => void
  setAuthSession: (merchantId: string, token: string) => void
  clearAuthSession: () => void
}

const initialThemeMode = getInitialThemeMode()
const initialThemeState = applyThemePreference(initialThemeMode)

export const useUIStore = create<UIState>((set) => ({
  themeMode: initialThemeState.mode,
  resolvedDarkMode: initialThemeState.resolvedDarkMode,
  selectedMerchantId: getInitialMerchantId(),
  authToken: getInitialAuthToken(),
  cycleThemeMode: () =>
    set((state) => {
      const nextMode = getThemeCycle(state.themeMode)
      const applied = applyThemePreference(nextMode)
      return {
        themeMode: applied.mode,
        resolvedDarkMode: applied.resolvedDarkMode,
      }
    }),
  setThemeMode: (mode) =>
    set(() => {
      const applied = applyThemePreference(mode)
      return {
        themeMode: applied.mode,
        resolvedDarkMode: applied.resolvedDarkMode,
      }
    }),
  setSelectedMerchantId: (merchantId) =>
    set(() => {
      persistMerchantId(merchantId)
      return { selectedMerchantId: merchantId }
    }),
  setAuthSession: (merchantId, token) =>
    set(() => {
      persistMerchantId(merchantId)
      persistAuthToken(token)
      return {
        selectedMerchantId: merchantId,
        authToken: token,
      }
    }),
  clearAuthSession: () =>
    set(() => {
      persistMerchantId(null)
      persistAuthToken(null)
      return {
        selectedMerchantId: null,
        authToken: null,
      }
    }),
}))

if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    const state = useUIStore.getState()
    if (state.themeMode !== 'system') {
      return
    }

    const applied = applyThemePreference('system')
    useUIStore.setState({ resolvedDarkMode: applied.resolvedDarkMode })
  })
}

applyThemePreference(useUIStore.getState().themeMode)
