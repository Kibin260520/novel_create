import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { TagsInput } from '@/components/common/TagsInput'
import { DynamicFieldInput } from './DynamicFieldInput'
import { UiIcon } from '@/components/icons/UiIcon'
import type { Module, Entry, Novel } from '@/types/data'

interface Props {
  open: boolean
  module: Module
  initial?: Entry | null
  /** 所在的整本小说，引用字段需要它来解析目标条目 */
  novel?: Novel
  onClose: () => void
  onSubmit: (
    values: Record<string, unknown>,
    extra: { notes: string; tags: string[] }
  ) => Promise<void>
}

export function EntryForm({ open, module, initial, novel, onClose, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)

  const fields = useMemo(
    () => [...module.fields].sort((a, b) => a.order - b.order),
    [module.fields]
  )
  const label = module.entryLabel || module.name

  useEffect(() => {
    if (!open) return
    setValues(initial ? { ...initial.values } : {})
    setNotes(initial?.notes ?? '')
    setTags(initial?.tags ?? [])
    setSaving(false)
    setTouched(false)
  }, [open, initial])

  const missing = fields.filter((f) => {
    if (!f.required) return false
    const v = values[f.key]
    if (Array.isArray(v)) return v.length === 0
    return v == null || String(v).trim() === ''
  })

  const submit = async () => {
    setTouched(true)
    if (missing.length) return
    setSaving(true)
    try {
      await onSubmit(values, { notes, tags })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const headline = String(values.name ?? values.title ?? values.event ?? '')

  return (
    <Modal
      open={open}
      wide
      title={initial ? `编辑${label}${headline ? ` · ${headline}` : ''}` : `新增${label}`}
      subtitle={`所属模块：${module.name}`}
      onClose={onClose}
      footer={
        <>
          {touched && missing.length > 0 && (
            <span className="field-error">
              还有 {missing.length} 个必填字段：{missing.map((f) => f.label).join('、')}
            </span>
          )}
          <span className="grow" />
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            取消
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? <UiIcon name="loader" size={16} className="spin" /> : <UiIcon name="check" size={16} />}
            {initial ? '保存' : '添加'}
          </button>
        </>
      }
    >
      {fields.length === 0 ? (
        <div className="notice">
          <UiIcon name="alert" size={18} />
          <div>该模块还没有字段。请先到模块的「编辑」里添加字段，再来填写内容。</div>
        </div>
      ) : (
        <>
          {fields.map((f) => (
            <div className="field" key={f.key}>
              <label className="field-label">
                {f.label}
                {f.required && <span className="req">*</span>}
              </label>
              <DynamicFieldInput
                field={f}
                value={values[f.key]}
                novel={novel}
                onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
              />
              {touched && f.required && missing.some((m) => m.key === f.key) && (
                <span className="field-error">此项为必填</span>
              )}
            </div>
          ))}

          <div className="divider" />

          <div className="form-grid">
            <div className="field">
              <label className="field-label">标签</label>
              <TagsInput value={tags} onChange={setTags} placeholder="如：主角、反派…" />
            </div>
          </div>

          <div className="field">
            <label className="field-label">备注 / 补充</label>
            <textarea
              className="textarea"
              value={notes}
              placeholder="任何想额外记下的东西：命名灵感、后续改动、关联线索…"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </>
      )}
    </Modal>
  )
}
