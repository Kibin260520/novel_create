import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { KEYS, readJSON, readRaw, writeJSON, writeRaw } from '@/lib/storage'
import type { GitHubConfig } from '@/types/github'

export interface AppSettings {
  owner: string
  repo: string
  branch: string
  token: string
  /** 是否记住 Token（关闭则仅本次会话有效） */
  rememberToken: boolean
}

export type Theme = 'light' | 'dark'

const DEFAULT_SETTINGS: AppSettings = {
  owner: '',
  repo: '',
  branch: 'main',
  token: '',
  rememberToken: true,
}

interface SettingsApi {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => void
  reset: () => void
  ghConfig: GitHubConfig
  /** 已填写 owner/repo */
  isConfigured: boolean
  /** 可以写入仓库（已配置且有 Token） */
  canWrite: boolean
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

const SettingsContext = createContext<SettingsApi | null>(null)

function loadSettings(): AppSettings {
  const saved = readJSON<Partial<AppSettings>>(KEYS.settings, {})
  return { ...DEFAULT_SETTINGS, ...saved }
}

function persist(s: AppSettings) {
  if (s.rememberToken) {
    writeJSON(KEYS.settings, s)
  } else {
    // 不记住 Token：只持久化非敏感字段
    writeJSON(KEYS.settings, { ...s, token: '' })
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [theme, setThemeState] = useState<Theme>(
    () => (readRaw(KEYS.theme, 'light') as Theme) || 'light'
  )

  // 应用主题到 <html>
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b0e1c' : '#eceffa')
    writeRaw(KEYS.theme, theme)
  }, [theme])

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      persist(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    persist(DEFAULT_SETTINGS)
  }, [])

  const setTheme = useCallback((t: Theme) => setThemeState(t), [])
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === 'light' ? 'dark' : 'light')),
    []
  )

  const value = useMemo<SettingsApi>(() => {
    const ghConfig: GitHubConfig = {
      owner: settings.owner.trim(),
      repo: settings.repo.trim(),
      branch: settings.branch.trim() || 'main',
      token: settings.token.trim(),
    }
    return {
      settings,
      update,
      reset,
      ghConfig,
      isConfigured: !!(ghConfig.owner && ghConfig.repo),
      canWrite: !!(ghConfig.owner && ghConfig.repo && ghConfig.token),
      theme,
      setTheme,
      toggleTheme,
    }
  }, [settings, update, reset, theme, setTheme, toggleTheme])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsApi {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings 必须在 SettingsProvider 内使用')
  return ctx
}
