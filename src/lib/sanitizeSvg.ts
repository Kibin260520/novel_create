/**
 * 用户自定义 SVG 的安全清洗。
 *
 * 风险：内联 SVG 可以携带 <script>、on* 事件、<foreignObject>、外链 <use>、
 * javascript: 协议等，一旦通过 dangerouslySetInnerHTML 注入就会执行，
 * 进而可能窃取本机保存的 GitHub Token。所以必须做白名单清洗。
 */
import DOMPurify from 'dompurify'

const MAX_LENGTH = 100 * 1024 // 100KB

export interface SvgSanitizeResult {
  ok: boolean
  svg?: string
  error?: string
}

let hookInstalled = false

function ensureHook() {
  if (hookInstalled) return
  hookInstalled = true
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    const el = node as Element
    if (typeof el.getAttributeNames !== 'function') return
    for (const attr of el.getAttributeNames()) {
      // 1) 去掉所有内联事件属性
      if (attr.toLowerCase().startsWith('on')) {
        el.removeAttribute(attr)
        continue
      }
      // 2) href / xlink:href 只允许内部锚点引用
      if (attr === 'href' || attr === 'xlink:href') {
        const v = (el.getAttribute(attr) || '').trim()
        if (!v.startsWith('#')) el.removeAttribute(attr)
        continue
      }
      // 3) style 里禁止外联资源引入
      if (attr === 'style') {
        const v = el.getAttribute(attr) || ''
        if (/url\s*\(|@import|expression/i.test(v)) el.removeAttribute(attr)
      }
    }
  })
}

/** 若缺少 viewBox，则依据 width/height 或默认值补上，保证可缩放 */
function ensureViewBox(svg: string): string {
  if (/viewbox\s*=/i.test(svg)) return svg
  const w = /width\s*=\s*["']?(\d+(?:\.\d+)?)/i.exec(svg)
  const h = /height\s*=\s*["']?(\d+(?:\.\d+)?)/i.exec(svg)
  const vb = w && h ? `0 0 ${w[1]} ${h[1]}` : '0 0 24 24'
  return svg.replace(/<svg/i, `<svg viewBox="${vb}"`)
}

export function sanitizeSvg(raw: string): SvgSanitizeResult {
  const input = (raw || '').trim()
  if (!input) return { ok: false, error: '内容为空' }
  if (input.length > MAX_LENGTH) return { ok: false, error: 'SVG 体积过大（超过 100KB）' }
  if (!/<svg[\s>]/i.test(input)) return { ok: false, error: '未检测到 <svg> 标签' }

  ensureHook()

  const clean = DOMPurify.sanitize(input, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: [
      'script',
      'foreignObject',
      'iframe',
      'animate',
      'animateTransform',
      'animateMotion',
      'set',
      'image',
      'a',
    ],
    FORBID_ATTR: ['href', 'xlink:href'],
    ALLOW_DATA_ATTR: false,
  }) as unknown as string

  // FORBID_ATTR 会误伤内部锚点引用，这里重新放宽「以 # 开头」的引用
  const restored = clean.replace(/(<use[^>]*?)\s*\/?>/gi, (m) => m)

  if (!/<svg[\s>]/i.test(restored)) return { ok: false, error: '清洗后未得到有效的 SVG' }

  return { ok: true, svg: ensureViewBox(restored) }
}

/** 仅用于快速判断，不做信任 */
export function looksLikeSvg(text: string): boolean {
  return /<svg[\s>]/i.test(text || '')
}
