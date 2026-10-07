import { builtinToSvg, DEFAULT_ICON_NAME } from '@/lib/builtinIcons'
import type { IconRef } from '@/types/data'

interface Props {
  icon?: IconRef | null
  size?: number
  className?: string
  title?: string
}

/**
 * 渲染模块图标。
 * - 内置图标：直接取可信的内置 SVG
 * - 用户图标：已在保存时经过 DOMPurify 清洗
 */
export function SvgIcon({ icon, size = 24, className, title }: Props) {
  const html =
    icon?.type === 'svg' && icon.svg
      ? icon.svg
      : builtinToSvg(icon?.name || DEFAULT_ICON_NAME, size)

  return (
    <span
      className={`svg-icon${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
