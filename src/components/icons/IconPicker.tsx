import { useRef, useState } from 'react'
import { BUILTIN_ICONS } from '@/lib/builtinIcons'
import { sanitizeSvg } from '@/lib/sanitizeSvg'
import { SvgIcon } from './SvgIcon'
import { UiIcon } from './UiIcon'
import { useToast } from '@/components/common/Toast'
import type { IconRef } from '@/types/data'

interface Props {
  value: IconRef
  onChange: (icon: IconRef) => void
  color?: string
}

type Tab = 'builtin' | 'custom'

export function IconPicker({ value, onChange, color }: Props) {
  const [tab, setTab] = useState<Tab>(value.type === 'svg' ? 'custom' : 'builtin')
  const [paste, setPaste] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const applySvg = (raw: string) => {
    const res = sanitizeSvg(raw)
    if (!res.ok || !res.svg) {
      toast.error(`SVG 无法使用：${res.error ?? '未知错误'}`)
      return
    }
    onChange({ type: 'svg', svg: res.svg })
    toast.success('自定义图标已应用')
  }

  const onFile = async (file?: File | null) => {
    if (!file) return
    if (!/\.svg$/i.test(file.name) && file.type !== 'image/svg+xml') {
      toast.error('请选择 .svg 文件')
      return
    }
    if (file.size > 100 * 1024) {
      toast.error('SVG 文件过大（上限 100KB）')
      return
    }
    const text = await file.text()
    applySvg(text)
  }

  return (
    <div className="stack gap-3">
      <div className="row gap-3">
        <div className="icon-preview" style={color ? { color } : undefined}>
          <SvgIcon icon={value} size={32} />
        </div>
        <div className="stack gap-1 grow">
          <div className="row gap-2">
            <button
              type="button"
              className={`btn btn-sm ${tab === 'builtin' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab('builtin')}
            >
              内置图标
            </button>
            <button
              type="button"
              className={`btn btn-sm ${tab === 'custom' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab('custom')}
            >
              自定义 SVG
            </button>
          </div>
          <div className="field-hint">
            {value.type === 'svg' ? '当前使用自定义 SVG 图标' : `当前使用内置图标：${value.name}`}
          </div>
        </div>
      </div>

      {tab === 'builtin' ? (
        <div className="icon-grid">
          {BUILTIN_ICONS.map((ic) => {
            const active = value.type === 'builtin' && value.name === ic.name
            return (
              <button
                type="button"
                key={ic.name}
                title={ic.label}
                className={`icon-choice${active ? ' is-active' : ''}`}
                onClick={() => onChange({ type: 'builtin', name: ic.name })}
              >
                <SvgIcon icon={{ type: 'builtin', name: ic.name }} size={22} />
              </button>
            )
          })}
        </div>
      ) : (
        <div className="stack gap-3">
          <div className="row gap-2 wrap">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => fileRef.current?.click()}
            >
              <UiIcon name="upload" size={15} /> 上传 .svg 文件
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".svg,image/svg+xml"
              style={{ display: 'none' }}
              onChange={(e) => {
                void onFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <span className="field-hint">或直接粘贴 SVG 代码 ↓</span>
          </div>

          <textarea
            className="textarea"
            style={{ minHeight: 120, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}
            placeholder={'<svg viewBox="0 0 24 24">…</svg>'}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
          />

          <div className="row gap-2">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={!paste.trim()}
              onClick={() => applySvg(paste)}
            >
              <UiIcon name="check" size={15} /> 应用这段 SVG
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setPaste('')}>
              清空
            </button>
          </div>

          <div className="notice">
            <UiIcon name="info" size={18} />
            <div>
              出于安全考虑，SVG 中的脚本、外部链接与事件属性会被自动移除，仅保留图形本身。
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
