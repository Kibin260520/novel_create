/**
 * 内置 SVG 图标库。
 * 每个图标只存「内部绘制标记」，渲染时统一包一层 24x24、stroke=currentColor 的 <svg>，
 * 这样图标颜色自动跟随模块主题色。
 */

export interface BuiltinIcon {
  name: string
  label: string
  /** <svg> 内部标记，不含外层标签 */
  inner: string
}

export const BUILTIN_ICONS: BuiltinIcon[] = [
  {
    name: 'book',
    label: '书 / 设定',
    inner:
      '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  },
  {
    name: 'book-open',
    label: '翻开的书 / 情节',
    inner:
      '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  },
  {
    name: 'user',
    label: '角色',
    inner:
      '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  },
  {
    name: 'users',
    label: '群体 / 势力',
    inner:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  },
  {
    name: 'shield',
    label: '守护 / 势力',
    inner: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  },
  {
    name: 'building',
    label: '组织 / 门派',
    inner:
      '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 21v-5h6v5"/><path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01"/>',
  },
  {
    name: 'sparkles',
    label: '灵感',
    inner:
      '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/>',
  },
  {
    name: 'lightbulb',
    label: '点子',
    inner:
      '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>',
  },
  {
    name: 'sword',
    label: '技能 / 战斗',
    inner:
      '<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/>',
  },
  {
    name: 'flame',
    label: '火焰 / 力量',
    inner:
      '<path d="M12 2c1.5 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1 .3-1.8.8-2.5C7 9 6 11 6 13a6 6 0 0 0 12 0c0-4.5-3-8-6-11z"/>',
  },
  {
    name: 'map',
    label: '地图 / 地点',
    inner:
      '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6z"/><path d="M9 3v15"/><path d="M15 6v15"/>',
  },
  {
    name: 'mountain',
    label: '山川 / 地理',
    inner: '<path d="m3 20 6-11 4 6 3-4 5 9H3z"/>',
  },
  {
    name: 'compass',
    label: '方向 / 世界观',
    inner:
      '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8z"/>',
  },
  {
    name: 'globe',
    label: '世界 / 大陆',
    inner:
      '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>',
  },
  {
    name: 'package',
    label: '道具 / 宝物',
    inner:
      '<path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="m3 7 9 5 9-5"/><path d="M12 12v10"/>',
  },
  {
    name: 'gem',
    label: '宝石 / 珍稀',
    inner:
      '<path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>',
  },
  {
    name: 'clock',
    label: '时间线',
    inner: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  },
  {
    name: 'scroll',
    label: '卷轴 / 秘典',
    inner:
      '<path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2H8a2 2 0 0 1-2-2V4z"/><path d="M6 8H4a2 2 0 0 0 0 4h2"/><path d="M10 8h6M10 12h6"/>',
  },
  {
    name: 'crown',
    label: '王权 / 领袖',
    inner: '<path d="M3 18h18l-1.6-9.5L15 13l-3-6-3 6-4.4-4.5L3 18z"/>',
  },
  {
    name: 'feather',
    label: '文笔 / 灵感',
    inner:
      '<path d="M20.2 12.2a6 6 0 0 0-8.5-8.5L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/>',
  },
  {
    name: 'layers',
    label: '分类 / 层级',
    inner:
      '<path d="m12 2 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  },
  {
    name: 'star',
    label: '重要 / 收藏',
    inner:
      '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 18l-6.2 3.1L7 14.2 2 9.3l6.9-1L12 2z"/>',
  },
  {
    name: 'heart',
    label: '情感 / 关系',
    inner:
      '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
  },
  {
    name: 'tag',
    label: '标签 / 分类',
    inner:
      '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  },
  {
    name: 'key',
    label: '关键 / 秘密',
    inner:
      '<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8-8"/><path d="m17 6 2 2"/><path d="m14.5 8.5 2 2"/>',
  },
]

export const BUILTIN_ICON_MAP: Record<string, BuiltinIcon> = Object.fromEntries(
  BUILTIN_ICONS.map((i) => [i.name, i])
)

export const DEFAULT_ICON_NAME = 'layers'

/** 把内置图标转成完整 SVG 字符串（可用于展示预览） */
export function builtinToSvg(name: string, size = 24): string {
  const icon = BUILTIN_ICON_MAP[name] ?? BUILTIN_ICON_MAP[DEFAULT_ICON_NAME]
  return wrapSvg(icon.inner, size)
}

/** 统一包装外层 <svg> */
export function wrapSvg(inner: string, size = 24): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
}
