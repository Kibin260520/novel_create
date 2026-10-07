/**
 * GitHub 写操作的串行队列 + 冲突重试。
 * 串行可以避免「自己和自己抢 sha」，409/422 时自动重取 sha 再试。
 */
import { ghDeleteFile, ghGetFile, ghPutFile, GitHubError } from './github'
import type { GitHubConfig, GhPutResult } from '@/types/github'

let chain: Promise<unknown> = Promise.resolve()

/** 把任务追加到全局串行队列 */
export function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = chain.then(job, job)
  // 无论成功失败都让队列继续
  chain = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * 提交一个文件（自动判断新建 / 更新），带冲突重试。
 * @param cfg GitHub 配置
 * @param path 仓库内路径，如 data/novels/xxx.json
 * @param content 文本内容（中文安全）
 * @param message 提交信息
 */
export async function commitFile(
  cfg: GitHubConfig,
  path: string,
  content: string,
  message: string
): Promise<GhPutResult> {
  return enqueue(async () => {
    let lastErr: unknown
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const existing = await ghGetFile(cfg, path)
        return await ghPutFile(cfg, path, content, message, existing?.sha ?? null)
      } catch (e) {
        lastErr = e
        // 只在 sha 冲突时重试，其余（401/403/网络）直接抛出
        if (e instanceof GitHubError && (e.status === 409 || e.status === 422)) {
          await sleep(300 * (attempt + 1))
          continue
        }
        throw e
      }
    }
    throw lastErr instanceof Error ? lastErr : new GitHubError('提交失败，请稍后重试')
  })
}

/** 删除仓库中的文件（文件不存在则视为成功） */
export async function removeFile(cfg: GitHubConfig, path: string, message: string): Promise<void> {
  return enqueue(async () => {
    const existing = await ghGetFile(cfg, path)
    if (!existing) return
    await ghDeleteFile(cfg, path, message, existing.sha)
  })
}

/**
 * 依次提交多个文件（例如「新增小说」需要同时写小说文件和 index.json）。
 * 任一失败会中断并抛出，便于上层回滚。
 */
export async function commitFiles(
  cfg: GitHubConfig,
  files: { path: string; content: string; message: string }[]
): Promise<GhPutResult[]> {
  const results: GhPutResult[] = []
  for (const f of files) {
    results.push(await commitFile(cfg, f.path, f.content, f.message))
  }
  return results
}
