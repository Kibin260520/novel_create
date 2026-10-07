/** 模块主题色可选值 */
export const MODULE_COLORS = [
  '#6366f1', // 靛蓝
  '#8b5cf6', // 紫罗兰
  '#b06cf0', // 紫
  '#ec4899', // 粉
  '#e5484d', // 红
  '#f97316', // 橙
  '#f5a524', // 琥珀
  '#eab308', // 黄
  '#10a37f', // 翠绿
  '#14b8a6', // 青
  '#0ea5e9', // 天蓝
  '#3b82f6', // 蓝
  '#64748b', // 石板灰
  '#a16207', // 棕铜
]

export const DEFAULT_MODULE_COLOR = '#6366f1'

export function colorWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
