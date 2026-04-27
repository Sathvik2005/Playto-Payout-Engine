import { useEffect, useMemo, useState } from 'react'
import { MoonStar, Sun, WalletCards } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useDashboard, useIssueMerchantToken, useMerchants } from '../hooks/useDashboard'
import { useUIStore } from '../store/uiStore'
import { cn } from '../utils/cn'

const navLinks = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Ledger', to: '/ledger' },
  { label: 'Payouts', to: '/payouts' },
]

export function AppShell() {
  const location = useLocation()
  const { data } = useDashboard()
  const { data: merchants } = useMerchants()
  const { mutate: issueMerchantToken, isPending: isIssuingMerchantToken } = useIssueMerchantToken()
  const {
    themeMode,
    resolvedDarkMode,
    cycleThemeMode,
    selectedMerchantId,
    authToken,
    setAuthSession,
  } = useUIStore()
  const [authError, setAuthError] = useState('')

  const themeLabel = themeMode === 'system' ? `System (${resolvedDarkMode ? 'Dark' : 'Light'})` : themeMode === 'dark' ? 'Dark' : 'Light'

  const activeMerchantId = useMemo(() => {
    if (selectedMerchantId) {
      return selectedMerchantId
    }

    return merchants?.[0]?.id ?? null
  }, [merchants, selectedMerchantId])

  useEffect(() => {
    if (!activeMerchantId) {
      return
    }

    if (authToken && selectedMerchantId === activeMerchantId) {
      return
    }

    issueMerchantToken(activeMerchantId, {
      onSuccess: (response) => {
        setAuthError('')
        setAuthSession(response.merchant.id, response.access_token)
      },
      onError: () => {
        setAuthError('Could not authenticate merchant session. Try selecting a merchant again.')
      },
    })
  }, [activeMerchantId, authToken, issueMerchantToken, selectedMerchantId, setAuthSession])

  function handleMerchantChange(merchantId: string) {
    const nextMerchantId = merchantId || merchants?.[0]?.id
    if (!nextMerchantId) {
      return
    }

    issueMerchantToken(nextMerchantId, {
      onSuccess: (response) => {
        setAuthError('')
        setAuthSession(response.merchant.id, response.access_token)
      },
      onError: () => {
        setAuthError('Could not authenticate merchant session. Please retry.')
      },
    })
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-ink-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-float-soft absolute -left-24 top-10 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl dark:bg-sky-500/10" />
        <div className="animate-float-soft absolute right-0 top-24 h-80 w-80 rounded-full bg-emerald-400/12 blur-3xl dark:bg-emerald-500/10" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[250px_1fr]">
        <aside className="border-r border-ink-200/80 bg-white/75 p-6 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/70 lg:sticky lg:top-0 lg:h-screen">
          <div className="mb-10 flex items-center gap-3">
            <div className="rounded-xl bg-ink-950 p-2 text-white">
              <WalletCards size={20} />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-ink-950">Playto Pay</p>
              <p className="text-xs text-ink-500 dark:text-slate-400">Payout Engine</p>
            </div>
          </div>

          <nav className="space-y-2">
            {navLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'block rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200',
                    isActive
                      ? 'bg-ink-950 text-white shadow-lg shadow-ink-950/15 dark:bg-slate-100 dark:text-slate-950 dark:shadow-slate-950/20'
                      : 'text-ink-700 hover:-translate-y-0.5 hover:bg-paper-100 hover:text-ink-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="border-b border-ink-200/80 bg-white/70 px-6 py-4 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/60 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ink-500 dark:text-slate-400">Merchant</p>
                <div>
                  <select
                    value={activeMerchantId ?? ''}
                    onChange={(event) => handleMerchantChange(event.target.value)}
                    disabled={isIssuingMerchantToken}
                    className="app-select w-[240px] max-w-full"
                  >
                    {(merchants ?? []).map((merchant) => (
                      <option key={merchant.id} value={merchant.id}>
                        {merchant.name}
                      </option>
                    ))}
                  </select>
                  {!activeMerchantId ? (
                    <p className="mt-1 truncate font-display text-sm font-semibold text-ink-900 dark:text-slate-100">
                      {data?.merchant.name ?? 'Loading merchant...'}
                    </p>
                  ) : null}
                  {authError ? <p className="mt-1 text-xs text-danger-600 dark:text-red-300">{authError}</p> : null}
                </div>
              </div>

              <button
                type="button"
                onClick={cycleThemeMode}
                className="app-button-secondary min-w-[112px] justify-center"
              >
                {resolvedDarkMode ? <Sun size={16} /> : <MoonStar size={16} />}
                {themeLabel}
              </button>
            </div>
          </header>

          <main className="flex-1 p-6 lg:p-8">
            <div key={location.pathname} className="animate-fade-up">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
