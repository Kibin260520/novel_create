/**
 * 浏览器存储封装：统一前缀、JSON 安全读写、容量容错。
 *
 * 两类存储刻意分开：
 * - localStorage：长期偏好（主题）与「已提交过」的数据缓存；
 * - sessionStorage：登录凭据（owner/repo/token）——仅本次会话有效，
 *   同一标签页刷新不丢，关掉标签页即失效，比写 localStorage 更安全。
 * 注意：Token 只存本机浏览器，绝不写入任何文件、绝不上传。
 */

const PREFIX = 'nc.'

export const KEYS = {
  /** 登录凭据（sessionStorage） */
  auth: `${PREFIX}auth`,
  cacheIndex: `${PREFIX}cache.index`,
  cacheNovel: (id: string) => `${PREFIX}cache.novel.${id}`,
  theme: `${PREFIX}theme`,
  work: `${PREFIX}work`,
} as const

/** 会被「登出」一并清掉的数据缓存前缀 */
const DATA_CACHE_PREFIX = `${PREFIX}cache.`

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    // 容量超限等：静默降级，不阻断主流程
    console.warn('[storage] 写入失败', key, e)
  }
}

export function readRaw(key: string, fallback = ''): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

export function writeRaw(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch (e) {
    console.warn('[storage] 写入失败', key, e)
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* noop */
  }
}

/* ---------------- sessionStorage：登录凭据（仅本次会话） ---------------- */

export function readSessionJSON<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeSessionJSON(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn('[storage] 会话写入失败', key, e)
  }
}

export function removeSessionKey(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* noop */
  }
}

/**
 * 清空数据缓存（index 与各小说）。
 * 登出时调用：避免在共用电脑上，下一个打开页面的人从缓存里读到内容。
 */
export function clearDataCache(): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(DATA_CACHE_PREFIX)) keys.push(k)
    }
    keys.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* noop */
  }
}
