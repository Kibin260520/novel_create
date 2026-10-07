import { UiIcon } from '@/components/icons/UiIcon'
import { newFieldKey } from '@/lib/id'
import type { FieldDef, FieldType } from '@/types/data'

interface Props {
  fields: FieldDef[]
  onChange: (fields: FieldDef[]) => void
}

const TYPE_LABELS: { value: FieldType; label: string }[] = [
  { value: 'text', label: '单行文本' },
  { value: 'textarea', label: '多行文本' },
  { value: 'number', label: '数字' },
  { value: 'select', label: '下拉单选' },
  { value: 'tags', label: '标签组' },
  { value: 'date', label: '日期' },
  { value: 'url', label: '链接' },
  { value: 'image', label: '图片地址' },
]

export function FieldDefEditor({ fields, onChange }: Props) {
  const update = (i: number, patch: Partial<FieldDef>) =>
    onChange(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)))

  const remove = (i: number) => onChange(fields.filter((_, idx) => idx !== i))

  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= fields.length) return
    const list = [...fields]
    ;[list[i], list[j]] = [list[j], list[i]]
    onChange(list.map((f, idx) => ({ ...f, order: idx })))
  }

  const add = () =>
    onChange([
      ...fields,
      { key: newFieldKey(), label: '新字段', type: 'text', order: fields.length },
    ])

  return (
    <div className="stack gap-2">
      {fields.length === 0 && (
        <div className="field-hint">还没有字段，条目将只有一个「名称」。点下方按钮添加字段。</div>
      )}

      {fields.map((f, i) => (
        <div
          key={f.key}
          style={{
            border: '1px solid var(--line)',
            background: 'var(--glass-bg-soft)',
            borderRadius: 'var(--r-md)',
            padding: 10,
          }}
        >
          <div className="row gap-2 wrap">
            <span className="muted" style={{ cursor: 'grab' }}>
              <UiIcon name="drag" size={16} />
            </span>
            <input
              className="input"
              style={{ width: 150 }}
              value={f.label}
              placeholder="字段名，如 阵营"
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <select
              className="select"
              style={{ width: 128 }}
              value={f.type}
              onChange={(e) => update(i, { type: e.target.value as FieldType })}
            >
              {TYPE_LABELS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <label className="row gap-1" style={{ fontSize: 13, color: 'var(--text-2)' }}>
              <input
                type="checkbox"
                checked={!!f.required}
                onChange={(e) => update(i, { required: e.target.checked })}
              />
              必填
            </label>
            <span className="grow" />
            <button
              type="button"
              className="btn btn-icon btn-sm btn-ghost"
              title="上移"
              disabled={i === 0}
              onClick={() => move(i, -1)}
            >
              <UiIcon name="chevronDown" size={15} className="" />
            </button>
            <button
              type="button"
              className="btn btn-icon btn-sm btn-ghost"
              style={{ transform: 'rotate(180deg)' }}
              title="下移"
              disabled={i === fields.length - 1}
              onClick={() => move(i, 1)}
            >
              <UiIcon name="chevronDown" size={15} />
            </button>
            <button
              type="button"
              className="btn btn-icon btn-sm btn-ghost"
              title="删除字段"
              onClick={() => remove(i)}
            >
              <UiIcon name="trash" size={15} />
            </button>
          </div>

          {f.type === 'select' && (
            <input
              className="input"
              style={{ marginTop: 8 }}
              value={(f.options ?? []).join(', ')}
              placeholder="可选值，用逗号分隔，如：正道, 中立, 魔道"
              onChange={(e) =>
                update(i, {
                  options: e.target.value
                    .split(/[,，]/)
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          )}
        </div>
      ))}

      <button type="button" className="btn btn-sm" onClick={add} style={{ alignSelf: 'flex-start' }}>
        <UiIcon name="plus" size={15} /> 添加字段
      </button>
    </div>
  )
}
