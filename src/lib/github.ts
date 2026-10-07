/**
 * GitHub Contents API 客户端。
 * 只做三件事：读文件（含 sha）、写文件（创建/更新）、连通性测试。
 */
import { toBase64, fromBase64 } from './base64'
import type {
  GitHubConfig,
  GhFileResult,
  GhPutResult,
  GhContentsResponse,
  GhPutResponse,
} from '@/types/github'

const API = 'https://api.github.com'

export class GitHubError extends Error {
  status: number
  constructor(message: string, status = 0) {
    super(message)
    this.name = 'GitHubError'
    this.status = status
  }
}

function headers(token: string): HeadersInit {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

function assertConfig(cfg: GitHubConfig, needToken = true) {
  if (!cfg.owner || !cfg.repo) {
    throw new GitHubError('尚未配置 GitHub 仓库（owner / repo）')
  }
  if (needToken && !cfg.token) {
    throw new GitHubError('尚未配置访问 Token，无法写入仓库')
  }
}

/** 读取文件；文件不存在返回 null（不抛错） */
export async function ghGetFile(
  cfg: GitHubConfig,
  path: string
): Promise<GhFileResult | null> {
  assertConfig(cfg, false)
  const url = `${API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(
    cfg.branch || 'main'
  )}`
  const res = await fetch(url, { headers: headers(cfg.token) })

  if (res.status === 404) return null
  if (res.status === 401) throw new GitHubError('Token 无效或已过期（401）', 401)
  if (res.status === 403)
    throw new GitHubError('Token 权限不足或触发限流（403），请检查 Contents 读写权限', 403)
  if (!res.ok) throw new GitHubError(`读取文件失败：${res.status} ${res.statusText}`, res.status)

  const data = (await res.json()) as GhContentsResponse
  const content = data.content ? fromBase64(data.content) : ''
  return { content, sha: data.sha }
}

/** 写入文件。sha 为空表示新建；返回提交信息 */
export async function ghPutFile(
  cfg: GitHubConfig,
  path: string,
  content: string,
  message: string,
  sha?: string | null
): Promise<GhPutResult> {
  assertConfig(cfg, true)
  const url = `${API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURI(path)}`
  const body: Record<string, unknown> = {
    message,
    content: toBase64(content),
    branch: cfg.branch || 'main',
  }
  if (sha) body.sha = sha

  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...headers(cfg.token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (res.status === 409 || res.status === 422) {
    throw new GitHubError('文件已被其他改动更新（sha 冲突），将自动重试', res.status)
  }
  if (res.status === 401) throw new GitHubError('Token 无效或已过期（401）', 401)
  if (res.status === 403)
    throw new GitHubError('Token 权限不足（403），请确认已勾选 Contents: Read and write', 403)
  if (!res.ok) throw new GitHubError(`提交失败：${res.status} ${res.statusText}`, res.status)

  const data = (await res.json()) as GhPutResponse
  return {
    commitSha: data.commit?.sha ?? '',
    commitUrl: data.commit?.html_url ?? '',
    contentSha: data.content?.sha ?? '',
  }
}

/** 删除文件 */
export async function ghDeleteFile(
  cfg: GitHubConfig,
  path: string,
  message: string,
  sha: string
): Promise<GhPutResult> {
  assertConfig(cfg, true)
  const url = `${API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURI(path)}`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { ...headers(cfg.token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sha, branch: cfg.branch || 'main' }),
  })
  if (res.status === 404) throw new GitHubError('文件不存在，无需删除', 404)
  if (res.status === 401) throw new GitHubError('Token 无效或已过期（401）', 401)
  if (res.status === 403) throw new GitHubError('Token 权限不足（403）', 403)
  if (!res.ok) throw new GitHubError(`删除失败：${res.status} ${res.statusText}`, res.status)
  const data = (await res.json()) as GhPutResponse
  return {
    commitSha: data.commit?.sha ?? '',
    commitUrl: data.commit?.html_url ?? '',
    contentSha: '',
  }
}

/** 测试连通性：能读到仓库就认为配置有效 */
export async function ghTest(cfg: GitHubConfig): Promise<{ ok: boolean; message: string }> {
  try {
    assertConfig(cfg, false)
  } catch (e) {
    return { ok: false, message: (e as Error).message }
  }
  try {
    const res = await fetch(`${API}/repos/${cfg.owner}/${cfg.repo}`, {
      headers: headers(cfg.token),
    })
    if (res.status === 404) return { ok: false, message: '仓库不存在或 Token 无权访问（404）' }
    if (res.status === 401) return { ok: false, message: 'Token 无效或已过期（401）' }
    if (!res.ok) return { ok: false, message: `访问失败：${res.status}` }
    const data = (await res.json()) as { full_name?: string; private?: boolean; default_branch?: string }
    const flags = `${data.private ? '私有' : '公开'}仓库`
    return {
      ok: true,
      message: `已连接 ${data.full_name ?? `${cfg.owner}/${cfg.repo}`}（${flags}，默认分支 ${
        data.default_branch ?? 'main'
      }）`,
    }
  } catch (e) {
    return { ok: false, message: `网络异常：${(e as Error).message}` }
  }
}
