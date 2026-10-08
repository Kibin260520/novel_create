import { UiIcon } from '@/components/icons/UiIcon'
import { valueToText } from '@/lib/format'
import { displayValue } from '@/lib/refs'
import { colorWithAlpha } from '@/lib/palette'
import type { Entry, Module, Novel } from '@/types/data'

interface Props {
  module: Module
  entry: Entry
  /** 用于把引用字段解析成条目名字 */
  novel?: Novel
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}

export function EntryCard({ module, entry, novel, onOpen, onEdit, onDelete }: Props) {
  const color = module.color || '#6366f1'
  const fields = [...module.fields].sort((a, b) => a.order - b.order)

  const primary = fields.find((f) => f.required) ?? fields[0]
  const title =
    (primary ? displayValue(novel, primary, entry.values[primary.key]) : '') ||
    valueToText(entry.values.name) ||
    valueToText(entry.values.title) ||
    valueToText(entry.values.event) ||
    '（未命名）'

  const rest = fields
    .filter((f) => f.key !== primary?.key && f.type !== 'textarea' && f.type !== 'image')
    .map((f) => ({
      label: f.label,
      text: displayValue(novel, f, entry.values[f.key]),
      isRef: f.type === 'ref',
    }))
    .filter((x) => x.text)

  const summaryField = fields.find(
    (f) => f.type === 'textarea' && valueToText(entry.values[f.key])
  )
  const summary = summaryField ? valueToText(entry.values[summaryField.key]) : ''
  const tags = entry.tags ?? []

  return (
    <article
      className="card glass is-clickable"
      style={{ ['--card-color' as string]: color, minHeight: 132 }}
      onClick={onOpen}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
    >
      <span className="card-accent" />

      <div className="card-top">
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="card-title clamp-1" style={{ fontFamily: 'var(--font-serif)' }}>
            {title}
          </div>
        </div>
        <div className="row gap-1" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-icon btn-sm btn-ghost" title="编辑" onClick={onEdit}>
            <UiIcon name="edit" size={15} />
          </button>
          <button className="btn btn-icon btn-sm btn-ghost" title="删除" onClick={onDelete}>
            <UiIcon name="trash" size={15} />
          </button>
        </div>
      </div>

      {rest.length > 0 && (
        <div className="row gap-2 wrap" style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
          {rest.slice(0, 3).map((r) => (
            <span key={r.label} className={r.isRef ? 'row gap-1' : undefined}>
              {r.isRef && <UiIcon name="link" size={12} />}
              <span style={{ opacity: 0.75 }}>{r.label}：</span>
              <span style={{ color: 'var(--text-2)' }}>{r.text}</span>
            </span>
          ))}
        </div>
      )}

      {summary && (
        <p className="card-desc clamp-3" style={{ margin: 0 }}>
          {summary}
        </p>
      )}

      {tags.length > 0 && (
        <div className="card-foot">
          {tags.slice(0, 3).map((t) => (
            <span
              className="chip is-plain"
              key={t}
              style={{
                background: colorWithAlpha(color, 0.12),
                borderColor: colorWithAlpha(color, 0.24),
                color,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
