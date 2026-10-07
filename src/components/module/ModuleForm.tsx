import { useEffect, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { IconPicker } from '@/components/icons/IconPicker'
import { FieldDefEditor } from '@/components/field/FieldDefEditor'
import { UiIcon } from '@/components/icons/UiIcon'
import { MODULE_COLORS } from '@/lib/palette'
import { newFieldKey } from '@/lib/id'
import type { Module, IconRef, FieldDef } from '@/types/data'

export interface ModuleFormValue {
  name: string
  entryLabel: string
  description: string
  color: string
  icon: IconRef
  fields: FieldDef[]
}

interface Props {
  open: boolean
  initial?: Module | null
  onClose: () => void
  onSubmit: (value: ModuleFormValue) => Promise<void>
}

const DEFAULT_FIELDS = (): FieldDef[] => [
  { key: 'name', label: '名称', type: 'text', required: true, order: 0 },
  { key: 'note', label: '说明', type: 'textarea', order: 1 },
]

export function ModuleForm({ open, initial, onClose, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [entryLabel, setEntryLabel] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(MODULE_COLORS[0])
  const [icon, setIcon] = useState<IconRef>({ type: 'builtin', name: 'layers' })
  const [fields, setFields] = useState<FieldDef[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(initial?.name ?? '')
    setEntryLabel(initial?.entryLabel ?? '')
    setDescription(initial?.description ?? '')
    setColor(initial?.color ?? MODULE_COLORS[0])
    setIcon(initial?.icon ?? { type: 'builtin', name: 'layers' })
    setFields(initial?.fields ? initial.fields.map((f) => ({ ...f })) : DEFAULT_FIELDS())
    setSaving(false)
  }, [open, initial])

  const submit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        entryLabel: (entryLabel.trim() || name.trim()),
        description: description.trim(),
        color,
        icon,
        fields: fields.map((f, i) => ({ ...f, order: i })),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      wide
      title={initial ? `编辑模块「${initial.name}」` : '新增模块'}
      subtitle="模块名、图标、字段都可以随便定 —— 想加什么模块就加什么"
      onClose={onClose}
      footer={
        <>
          <span className="grow" />
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            取消
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={saving || !name.trim()}>
            {saving ? <UiIcon name="loader" size={16} className="spin" /> : <UiIcon name="check" size={16} />}
            {initial ? '保存' : '创建'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field">
          <label className="field-label">
            模块名称 <span className="req">*</span>
          </label>
          <input
            className="input"
            autoFocus
            value={name}
            placeholder="如：功法、宗门、神器…"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label">条目称呼</label>
          <input
            className="input"
            value={entryLabel}
            placeholder="如：角色 / 势力 / 技能（留空则同模块名）"
            onChange={(e) => setEntryLabel(e.target.value)}
          />
          <span className="field-hint">用于「新增xx」按钮的文案</span>
        </div>
      </div>

      <div className="field">
        <label className="field-label">模块说明</label>
        <input
          className="input"
          value={description}
          placeholder="一句话描述这个模块放什么"
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="field-label">主题色</label>
        <div className="color-row">
          {MODULE_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              className={`color-dot${c === color ? ' is-active' : ''}`}
              style={{ background: c }}
              title={c}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field-label">模块图标</label>
        <IconPicker value={icon} onChange={setIcon} color={color} />
      </div>

      <div className="divider" />

      <div className="field">
        <label className="field-label">条目字段定义</label>
        <span className="field-hint" style={{ marginBottom: 8, display: 'block' }}>
          决定每个条目能填哪些内容。改了字段定义后，已有条目里对应的值会保留。
        </span>
        <FieldDefEditor fields={fields} onChange={setFields} />
      </div>

      {!initial && (
        <div className="notice is-info" style={{ marginTop: 6 }}>
          <UiIcon name="info" size={18} />
          <div>
            也可以先只填模块名创建，之后再点模块上的「编辑」来补字段。新字段的 key 会自动生成（
            {newFieldKey()} 这种格式）。
          </div>
        </div>
      )}
    </Modal>
  )
}
