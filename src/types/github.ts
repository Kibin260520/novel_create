/** GitHub Contents API 相关类型 */

export interface GitHubConfig {
  owner: string
  repo: string
  branch: string
  token: string
}

export interface GhFileResult {
  /** 文件文本内容（已 base64 解码） */
  content: string
  /** 当前文件 sha，更新时必填 */
  sha: string
}

export interface GhPutResult {
  commitSha: string
  commitUrl: string
  contentSha: string
}

/** Contents API 原始响应片段 */
export interface GhContentsResponse {
  name: string
  path: string
  sha: string
  size: number
  content?: string
  encoding?: string
}

export interface GhPutResponse {
  content: { sha: string; path: string } | null
  commit: { sha: string; html_url: string }
}
