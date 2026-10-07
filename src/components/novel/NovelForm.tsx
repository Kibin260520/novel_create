import { useEffect, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { TagsInput } from '@/components/common/TagsInput'
import { UiIcon } from '@/components/icons/UiIcon'
import type { Novel, NovelDraft } from '@/types/data'

interface Props {
  open: boolean
  initial?: Novel | null
  onClose: () => void
  onSubmit: (draft: NovelDraft) => Promise<void>
}

export function NovelForm({ open, initial, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [summary, setSummary] = useState('')
  const [cover, setCover] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(initial?.title ?? '')
    setAuthor(initial?.author ?? '')
    setSummary(initial?.summary ?? '')
    setCover(initial?.cover ?? '')
    setTags(initial?.tags ?? [])
    setSaving(false)
  }, [open, initial])

  const submit = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSubmit({ title, author, summary, cover, tags })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={initial ? '编辑小说信息' : '新增一本小说'}
      subtitle={initial ? undefined : '创建后会自动预置 设定 / 势力 / 角色 等 9 个模块'}
      onClose={onClose}
      footer={
        <>
          <span className="grow" />
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={saving || !title.trim()}
          >
            {saving ? <UiIcon name="loader" size={16} className="spin" /> : <UiIcon name="check" size={16} />}
            {initial ? '保存' : '创建'}
          </button>
        </>
      }
    >
      <div className="field">
        <label className="field-label">
          书名 <span className="req">*</span>
        </label>
        <input
          className="input"
          autoFocus
          value={title}
          placeholder="例如：青冥剑歌"
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && title.trim() && submit()}
        />
      </div>

      <div className="form-grid">
        <div className="field">
          <label className="field-label">作者</label>
          <input
            className="input"
            value={author}
            placeholder="笔名"
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label">分类标签</label>
          <TagsInput value={tags} onChange={setTags} placeholder="玄幻、科幻…" />
        </div>
      </div>

      <div className="field">
        <label className="field-label">一句话简介</label>
        <textarea
          className="textarea"
          value={summary}
          placeholder="这本书讲的是什么？"
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="field-label">封面图片链接</label>
        <input
          className="input"
          value={cover}
          placeholder="https://… （可留空）"
          onChange={(e) => setCover(e.target.value)}
        />
      </div>
    </Modal>
  )
}
