/**
 * 数据文件路径约定。
 * 数据只存一份：仓库内的 public/data/ —— Vite 打包后就是站点根目录下的 /data/，
 * 所以「站点路径」是 data/，「仓库路径」是 public/data/。
 */

/** 站点内路径（打包后 public/ 内容会平移到根目录） */
export const DATA_DIR = 'data'

/** 仓库内路径（GitHub raw / Contents API 用） */
export const REPO_DATA_DIR = 'public/data'

export const INDEX_FILE = 'index.json'

/** 小说文件名（相对 data/） */
export function novelFile(id: string): string {
  return `novels/${id}.json`
}

/** 仓库内完整路径 */
export function repoPath(file: string): string {
  return `${REPO_DATA_DIR}/${file}`
}
