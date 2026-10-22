/**
 * 登录历史：记住连接成功过的「用户名 / 仓库 / 分支」，供登录页下拉选择。
 *
 * 只存这三个字段 —— **Token 绝不出现在这里**。凭据仍然只在 sessionStorage，
 * 关掉标签页即失效；历史只是为了省掉每次重新敲仓库地址。
 *
 * 放 localStorage 而不是 sessionStorage，正是「下次登录不用再输」的意义。
 * 登出不会清它：`clearDataCache()` 只清 `nc.cache.*`，碰不到登录历史。
 */
import { KEYS, readJSON, writeJSON } from './storage'

/** 最多保留多少条，防止无限增长 */
const MAX = 12

export interface LoginIdentity {
  owner: string
  repo: string
  branch: string
  /** 最后一次成功登录的时间（ISO），用于排序 */
  lastUsedAt: string
}

/** 去重键：GitHub 的 owner / repo 不区分大小写 */
const keyOf = (owner: string, repo: string) => `${owner}/${repo}`.toLowerCase()

/** 逐条清洗：手改过 localStorage、或旧版本遗留的脏数据都挡掉 */
function sanitize(value: unknown): LoginIdentity | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Partial<LoginIdentity>
  if (typeof v.owner !== 'string' || !v.owner.trim()) return null
  if (typeof v.repo !== 'string' || !v.repo.trim()) return null
  return {
    owner: v.owner.trim(),
    repo: v.repo.trim(),
    branch: typeof v.branch === 'string' && v.branch.trim() ? v.branch.trim() : 'main',
    lastUsedAt: typeof v.lastUsedAt === 'string' ? v.lastUsedAt : '',
  }
}

/** 读历史，最近的排在前面 */
export function readLoginHistory(): LoginIdentity[] {
  const raw = readJSON<unknown>(KEYS.loginHistory, [])
  if (!Array.isArray(raw)) return []

  const seen = new Set<string>()
  const list: LoginIdentity[] = []
  for (const item of raw) {
    const one = sanitize(item)
    if (!one) continue
    const key = keyOf(one.owner, one.repo)
    if (seen.has(key)) continue
    seen.add(key)
    list.push(one)
  }

  return list
    .sort((a, b) => (a.lastUsedAt < b.lastUsedAt ? 1 : a.lastUsedAt > b.lastUsedAt ? -1 : 0))
    .slice(0, MAX)
}

/**
 * 记一笔成功登录。同一个「owner/repo」只保留最新的一条（分支会被更新），
 * 并挪到列表最前。
 */
export function rememberLogin(input: {
  owner: string
  repo: string
  branch?: string
}): LoginIdentity[] {
  const owner = input.owner.trim()
  const repo = input.repo.trim()
  if (!owner || !repo) return readLoginHistory()

  const key = keyOf(owner, repo)
  const next = [
    {
      owner,
      repo,
      branch: (input.branch ?? '').trim() || 'main',
      lastUsedAt: new Date().toISOString(),
    },
    ...readLoginHistory().filter((x) => keyOf(x.owner, x.repo) !== key),
  ].slice(0, MAX)

  writeJSON(KEYS.loginHistory, next)
  return next
}

/** 删掉某条历史（用户点下拉里的小叉） */
export function forgetLogin(owner: string, repo: string): LoginIdentity[] {
  const key = keyOf(owner, repo)
  const next = readLoginHistory().filter((x) => keyOf(x.owner, x.repo) !== key)
  writeJSON(KEYS.loginHistory, next)
  return next
}
