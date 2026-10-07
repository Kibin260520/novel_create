import { useState } from 'react'

interface Props {
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}

/** 标签输入：回车添加，支持逗号分隔与退格删除 */
export function TagsInput({ value, onChange, placeholder }: Props) {
  const [draft, setDraft] = useState('')

  const add = (raw: string) => {
    const parts = raw
      .split(/[,，、\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (!parts.length) {
      setDraft('')
      return
    }
    onChange(Array.from(new Set([...value, ...parts])))
    setDraft('')
  }

  return (
    <div className="stack gap-2">
      {value.length > 0 && (
        <div className="chip-list">
          {value.map((t) => (
            <span className="chip is-plain" key={t}>
              {t}
              <span
                className="chip-x"
                role="button"
                aria-label={`移除 ${t}`}
                onClick={() => onChange(value.filter((x) => x !== t))}
              >
                ×
              </span>
            </span>
          ))}
        </div>
      )}
      <input
        className="input"
        value={draft}
        placeholder={placeholder ?? '输入后回车添加'}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add(draft)
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
      />
    </div>
  )
}
