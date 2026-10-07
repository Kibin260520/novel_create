/** 日期 / 文本 格式化工具 */

const pad = (n: number) => String(n).padStart(2, '0')

/** 2026-10-07 19:11 */
export function formatDateTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}

/** 2026-10-07 */
export function formatDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 刚刚 / 3 分钟前 / 2 天前 */
export function timeAgo(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso).getTime()
  if (Number.isNaN(d)) return ''
  const diff = Date.now() - d
  const min = 60_000
  const hour = 60 * min
  const day = 24 * hour
  if (diff < min) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / min)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`
  return formatDate(iso)
}

/** 取字符串首字，用于无图标时的占位 */
export function initial(text?: string): string {
  if (!text) return '·'
  const t = text.trim()
  return t ? Array.from(t)[0] : '·'
}

/** 把任意值转成用于搜索/展示的纯文本 */
export function valueToText(v: unknown): string {
  if (v == null) return ''
  if (Array.isArray(v)) return v.join('、')
  if (typeof v === 'object') return ''
  return String(v)
}
