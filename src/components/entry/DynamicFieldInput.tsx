import { UiIcon } from '@/components/icons/UiIcon'
import { TagsInput } from '@/components/common/TagsInput'
import { RefFieldInput } from './RefFieldInput'
import { valueToText } from '@/lib/format'
import type { FieldDef, Novel } from '@/types/data'

interface Props {
  field: FieldDef
  value: unknown
  onChange: (v: unknown) => void
  /** 引用字段解析目标条目时需要 */
  novel?: Novel
}

export function DynamicFieldInput({ field, value, onChange, novel }: Props) {
  const common = {
    className: field.type === 'textarea' ? 'textarea' : 'input',
    placeholder: field.placeholder,
  }

  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          className="textarea"
          placeholder={field.placeholder}
          value={valueToText(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case 'number':
      return (
        <input
          type="number"
          {...common}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      )

    case 'date':
      return (
        <input
          type="date"
          {...common}
          value={valueToText(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case 'select': {
      const options = field.options ?? []
      if (!options.length) {
        return (
          <input
            {...common}
            value={valueToText(value)}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      }
      const current = valueToText(value)
      const unknown = current && !options.includes(current)
      return (
        <select
          className="select"
          value={current}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— 未选择 —</option>
          {unknown && <option value={current}>{current}</option>}
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )
    }

    case 'tags':
      return (
        <TagsInput
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={(v) => onChange(v)}
          placeholder="输入后回车添加，可用逗号分隔多个"
        />
      )

    case 'url':
      return (
        <div className="input-group">
          <input
            {...common}
            value={valueToText(value)}
            onChange={(e) => onChange(e.target.value)}
          />
          {valueToText(value) && (
            <a
              className="btn btn-icon"
              href={valueToText(value)}
              target="_blank"
              rel="noreferrer"
              title="打开链接"
            >
              <UiIcon name="external" size={16} />
            </a>
          )}
        </div>
      )

    case 'image': {
      const url = valueToText(value)
      return (
        <div className="stack gap-2">
          <input {...common} value={url} onChange={(e) => onChange(e.target.value)} />
          {url && (
            <img
              src={url}
              alt=""
              style={{
                maxWidth: 200,
                maxHeight: 140,
                borderRadius: 'var(--r-sm)',
                border: '1px solid var(--line)',
              }}
            />
          )}
        </div>
      )
    }

    case 'ref':
      return <RefFieldInput field={field} value={value} onChange={onChange} novel={novel} />

    default:
      return (
        <input {...common} value={valueToText(value)} onChange={(e) => onChange(e.target.value)} />
      )
  }
}
