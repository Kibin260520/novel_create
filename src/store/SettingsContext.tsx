import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  KEYS,
  clearDataCache,
  readRaw,
  readSessionJSON,
  removeSessionKey,
  writeRaw,
  writeSessionJSON,
} from '@/lib/storage'
import { ghVerify } from '@/lib/github'
import type { GitHubConfig } from '@/types/github'

/**
 * 登录凭据。刻意不叫「账号密码」——
 * 这是个纯静态站点，没有后端，所谓「登录」= 校验这组凭据能不能操作你的仓库。
 */
export interface AppSettings {
  owner: string
  repo: string
  branch: string
  token: string
}

export type Theme = 'light' | 'dark'

/** 登录校验结果 */
export interface LoginResult {
  ok: boolean
  message: string
  /** 校验成功后，最终采用的分支（可能被仓库默认分支纠正） */
  branch?: string
}

const DEFAULT_AUTH: AppSettings = {
  owner: '',
  repo: '',
  branch: 'main',
  token: '',
}

interface SettingsApi {
  settings: AppSettings
  ghConfig: GitHubConfig
  /** 已填写 owner/repo */
  isConfigured: boolean
  /** 已配置且有 Token（可写入仓库） */
  canWrite: boolean
  /** 本会话是否已通过登录校验 */
  isAuthenticated: boolean
  /** 正在校验中 */
  verifying: boolean

  /** 登录：校验通过后才写入会话存储 */
  login: (draft: AppSettings) => Promise<LoginResult>
  /**
   * 登出。
   * - keepIdentity = true：仅清 Token，保留 owner/repo/branch，方便快速重登
   * - 默认：清空全部凭据
   * 两种情况都会清掉本机数据缓存。
   */
  logout: (opts?: { keepIdentity?: boolean }) => void

  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

const SettingsContext = createContext<SettingsApi | null>(null)

/** 凭据只在 sessionStorage：刷新不丢，关标签页即失效 */
function loadAuth(): AppSettings {
  const saved = readSessionJSON<Partial<AppSettings>>(KEYS.auth, {})
  return { ...DEFAULT_AUTH, ...saved }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadAuth())
  const [verifying, setVerifying] = useState(false)
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

  const login = useCallback(async (draft: AppSettings): Promise<LoginResult> => {
    const cfg: GitHubConfig = {
      owner: draft.owner.trim(),
      repo: draft.repo.trim(),
      branch: draft.branch.trim() || 'main',
      token: draft.token.trim(),
    }
    setVerifying(true)
    try {
      const r = await ghVerify(cfg)
      if (!r.ok) return { ok: false, message: r.message }

      // 分支纠正：用户留着默认的 main，但仓库默认分支不是 main 时，采用仓库的默认分支
      const branch = r.defaultBranch && cfg.branch === 'main' ? r.defaultBranch : cfg.branch

      const next: AppSettings = {
        owner: cfg.owner,
        repo: cfg.repo,
        branch,
        token: cfg.token,
      }
      writeSessionJSON(KEYS.auth, next)
      setSettings(next)
      return { ok: true, message: r.message, branch }
    } finally {
      setVerifying(false)
    }
  }, [])

  const logout = useCallback((opts?: { keepIdentity?: boolean }) => {
    const keepIdentity = !!opts?.keepIdentity
    setSettings((prev) => {
      const next = keepIdentity ? { ...prev, token: '' } : { ...DEFAULT_AUTH }
      if (keepIdentity) writeSessionJSON(KEYS.auth, next)
      else removeSessionKey(KEYS.auth)
      return next
    })
    // 清掉本机数据缓存，避免共用电脑上被下一个人从缓存读到内容
    clearDataCache()
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
    const isConfigured = !!(ghConfig.owner && ghConfig.repo)
    const canWrite = !!(ghConfig.owner && ghConfig.repo && ghConfig.token)
    return {
      settings,
      ghConfig,
      isConfigured,
      canWrite,
      // 会话里存有完整凭据 = 本会话已通过校验
      isAuthenticated: canWrite,
      verifying,
      login,
      logout,
      theme,
      setTheme,
      toggleTheme,
    }
  }, [settings, verifying, login, logout, theme, setTheme, toggleTheme])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsApi {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings 必须在 SettingsProvider 内使用')
  return ctx
}
