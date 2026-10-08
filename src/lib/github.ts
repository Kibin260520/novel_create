/**
 * GitHub Contents API 客户端。
 * 只做三件事：读文件（含 sha）、写文件（创建/更新）、连通性测试。
 */
import { toBase64, fromBase64 } from './base64'
import { REPO_DATA_DIR, INDEX_FILE } from './paths'
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
  if (res.status === 404)
    throw new GitHubError('提交被拒绝（404）：分支可能不存在，或 Token 缺少 Contents 写权限', 404)
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
export async function ghTest(cfg: GitHubConfig): Promise<{ ok: boolean; message: string }> {  try {
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

/* ---------------------- 登录校验 ---------------------- */

export interface GhVerifyResult {
  ok: boolean
  message: string
  /** 仓库是否可写（由真实写探针确认，非推断） */
  canWrite?: boolean
  /** 仓库里是否存在数据目录（public/data/index.json） */
  dataPathExists?: boolean
  /** 仓库的默认分支，用于纠正用户填错的分支 */
  defaultBranch?: string
  /** 仓库全名，如 owner/repo */
  fullName?: string
}

/**
 * 写能力探针：POST 一个极小的 blob 到对象库。
 *
 * 为什么不看 `GET /repos/{owner}/{repo}` 返回的 `permissions.push`？
 * 因为那是**当前账号在该仓库的角色权限**，与 Token 被授予的范围无关。
 * 实测（本仓库 owner 账号的 fine-grained Token 未勾选 Contents:write）：
 *   permissions = { admin: true, maintain: true, push: true, ... }  ← 全是 true
 *   而 POST /git/blobs → 403 "Resource not accessible by personal access token"
 * 即：公开仓库的元数据读取和内容读取对任何 fine-grained Token 都默认放行，
 * 靠 permissions 判写权限会**把没写权限的人放进门**，然后每次保存才失败。
 *
 * 该探针只往对象库写一个游离对象（dangling blob），**不产生 commit、不改动任何分支**，
 * 对仓库内容与历史零影响，会被 GitHub 自动回收，是目前唯一无损的写权限判定方式。
 */
async function probeWriteAccess(cfg: GitHubConfig): Promise<{ ok: boolean; status: number; message?: string }> {
  try {
    const res = await fetch(`${API}/repos/${cfg.owner}/${cfg.repo}/git/blobs`, {
      method: 'POST',
      headers: { ...headers(cfg.token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'novel-collection write probe', encoding: 'utf-8' }),
    })
    if (res.ok) return { ok: true, status: res.status }
    const detail = await res
      .json()
      .then((d: { message?: string }) => d?.message)
      .catch(() => undefined)
    return { ok: false, status: res.status, message: detail }
  } catch (e) {
    return { ok: false, status: 0, message: (e as Error).message }
  }
}

/**
 * 登录校验：拿到「能不能进、能不能写、找不找得到数据目录」三个结论。
 *
 * 1) GET /repos/{owner}/{repo} —— 仓库可达性、默认分支、公开/私有；
 * 2) 试读 public/data/index.json —— 确认这就是一个「小说资料库」仓库，
 *    避免用户把仓库名填错却一路绿灯、直到第一次提交才发现；
 * 3) 真实写探针 —— 见 probeWriteAccess，确认 Token 确实具备 Contents: 写权限。
 *
 * 返回 dataPathExists === true 且 canWrite === true 才算真正可用。
 */
export async function ghVerify(cfg: GitHubConfig): Promise<GhVerifyResult> {
  if (!cfg.owner || !cfg.repo) {
    return { ok: false, message: '请填写用户名（owner）与仓库名（repo）' }
  }
  if (!cfg.token) {
    return { ok: false, message: '请填写 Personal Access Token' }
  }

  let repo: {
    full_name?: string
    private?: boolean
    default_branch?: string
    // 注意：响应里的 permissions 字段是「账号在该仓库的角色」，不代表 Token 授予范围，
    // 不能用它判定写权限，故此处不接收。
  }

  try {
    const res = await fetch(`${API}/repos/${cfg.owner}/${cfg.repo}`, {
      headers: headers(cfg.token),
    })
    if (res.status === 404) {
      return { ok: false, message: '仓库不存在，或该 Token 没有被授权访问这个仓库（404）' }
    }
    if (res.status === 401) {
      return { ok: false, message: 'Token 无效或已过期（401），请到 GitHub 重新生成' }
    }
    if (res.status === 403) {
      return { ok: false, message: 'Token 权限不足或触发限流（403），请检查 Contents 权限' }
    }
    if (!res.ok) {
      return { ok: false, message: `访问仓库失败：${res.status} ${res.statusText}` }
    }
    repo = (await res.json()) as typeof repo
  } catch (e) {
    return { ok: false, message: `网络异常，无法连接 GitHub：${(e as Error).message}` }
  }

  const fullName = repo.full_name ?? `${cfg.owner}/${cfg.repo}`
  const flags = repo.private ? '私有' : '公开'
  const branch = repo.default_branch ?? 'main'

  // 真实写探针：只有它才能判定 Token 的写权限，permissions 字段不可信（见 probeWriteAccess）
  const probe = await probeWriteAccess(cfg)
  if (!probe.ok) {
    if (probe.status === 401) {
      return {
        ok: false,
        canWrite: false,
        fullName,
        defaultBranch: branch,
        message: 'Token 无效或已过期（401），请到 GitHub 重新生成',
      }
    }
    const isRepoMissing = probe.status === 404
    return {
      ok: false,
      canWrite: false,
      fullName,
      defaultBranch: branch,
      message: isRepoMissing
        ? `Token 没有被授权写 ${fullName}（404）。请到这个 Token 的 Repository access 里勾上该仓库。`
        : `已连上 ${fullName}（${flags}仓库），但这个 Token 没有写权限。请到该 Token 的 Repository permissions 里把 Contents 改为 “Read and write”。${
            probe.message ? `（GitHub 返回：${probe.message}）` : ''
          }`,
    }
  }

  // 试读数据目录，确认仓库结构对得上
  let dataPathExists = false
  try {
    const idx = await ghGetFile(cfg, `${REPO_DATA_DIR}/${INDEX_FILE}`)
    dataPathExists = !!idx
  } catch (e) {
    return {
      ok: false,
      canWrite: true,
      dataPathExists: false,
      fullName,
      defaultBranch: branch,
      message: `读到仓库 ${fullName}，但读取数据目录失败：${(e as Error).message}`,
    }
  }

  if (!dataPathExists) {
    return {
      ok: false,
      canWrite: true,
      dataPathExists: false,
      fullName,
      defaultBranch: branch,
      message: `仓库 ${fullName} 可写，但里面没有 ${REPO_DATA_DIR}/${INDEX_FILE}。请确认选的是小说资料库仓库。`,
    }
  }

  return {
    ok: true,
    canWrite: true,
    dataPathExists: true,
    fullName,
    defaultBranch: branch,
    message: `已连接 ${fullName}（${flags}仓库，默认分支 ${branch}），写权限正常`,
  }
}
