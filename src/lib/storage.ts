/**
 * localStorage 封装：统一前缀、JSON 安全读写、容量容错。
 * 注意：Token 也会走这里，仅存本机浏览器，绝不写入任何文件。
 */

const PREFIX = 'nc.'

export const KEYS = {
  settings: `${PREFIX}settings`,
  cacheIndex: `${PREFIX}cache.index`,
  cacheNovel: (id: string) => `${PREFIX}cache.novel.${id}`,
  theme: `${PREFIX}theme`,
  work: `${PREFIX}work`,
} as const

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
