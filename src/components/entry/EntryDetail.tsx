import { Modal } from '@/components/common/Modal'
import { UiIcon } from '@/components/icons/UiIcon'
import { SvgIcon } from '@/components/icons/SvgIcon'
import { formatDateTime, valueToText } from '@/lib/format'
import { collectBacklinks, displayValue, refIdsOf, resolveRef } from '@/lib/refs'
import type { Entry, Module, Novel } from '@/types/data'

interface Props {
  open: boolean
  module: Module
  entry: Entry | null
  /** 所在的整本小说，用于解析引用与反向引用 */
  novel?: Novel
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  /** 点引用标签时跳到目标条目 */
  onNavigate?: (moduleId: string, entryId: string) => void
}

export function EntryDetail({
  open,
  module,
  entry,
  novel,
  onClose,
  onEdit,
  onDelete,
  onNavigate,
}: Props) {
  if (!entry) return null
  const fields = [...module.fields].sort((a, b) => a.order - b.order)
  const filled = fields
    .map((f) => ({ f, text: displayValue(novel, f, entry.values[f.key]) }))
    .filter((x) => x.text)

  const headline =
    valueToText(entry.values.name) ||
    valueToText(entry.values.title) ||
    valueToText(entry.values.event) ||
    '详情'

  const backlinks = collectBacklinks(novel, module.id, entry.id)

  return (
    <Modal
      open={open}
      wide
      title={
        <span className="row gap-2">
          <span
            className="icon-tile is-sm"
            style={{ ['--card-color' as string]: module.color || '#6366f1' }}
          >
            <SvgIcon icon={module.icon} size={18} />
          </span>
          {headline}
        </span>
      }
      subtitle={`${module.name} · 更新于 ${formatDateTime(entry.updatedAt)}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-danger btn-sm" onClick={onDelete}>
            <UiIcon name="trash" size={15} /> 删除
          </button>
          <span className="grow" />
          <button className="btn btn-ghost" onClick={onClose}>
            关闭
          </button>
          <button className="btn btn-primary" onClick={onEdit}>
            <UiIcon name="edit" size={16} /> 编辑
          </button>
        </>
      }
    >
      {filled.length === 0 ? (
        <p className="muted">这条内容还没有填写任何字段。</p>
      ) : (
        <div className="kv-list">
          {filled.map(({ f, text }) => (
            <div className="kv" key={f.key}>
              <div className="kv-key">{f.label}</div>
              <div className="kv-val">
                {f.type === 'url' ? (
                  <a href={text} target="_blank" rel="noreferrer">
                    {text}
                  </a>
                ) : f.type === 'image' ? (
                  <img src={text} alt="" style={{ maxWidth: 260, borderRadius: 'var(--r-sm)' }} />
                ) : f.type === 'ref' ? (
                  <span className="row gap-2 wrap">
                    {refIdsOf(entry.values[f.key]).map((id) => {
                      const ref = resolveRef(novel, f.refModuleId, id)
                      if (!ref) {
                        // 旧数据遗留的纯文本，原样显示，不做跳转
                        return (
                          <span className="muted" key={id}>
                            {id}
                          </span>
                        )
                      }
                      return (
                        <button
                          type="button"
                          key={id}
                          className="ref-link"
                          title={`跳到「${ref.moduleName}」中的这条`}
                          onClick={() => onNavigate?.(ref.moduleId, ref.entryId)}
                        >
                          <UiIcon name="link" size={13} />
                          {ref.label}
                          <span className="ref-link-mod">{ref.moduleName}</span>
                        </button>
                      )
                    })}
                  </span>
                ) : (
                  text
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {backlinks.length > 0 && (
        <>
          <div className="divider" />
          <div className="stack gap-2">
            <span className="muted" style={{ fontSize: 13 }}>
              <UiIcon name="link" size={13} /> 被 {backlinks.length} 处引用
            </span>
            <div className="row gap-2 wrap">
              {backlinks.map((b) => (
                <button
                  type="button"
                  key={`${b.moduleId}-${b.entryId}-${b.fieldLabel}`}
                  className="ref-link"
                  title={`${b.moduleName} · 通过「${b.fieldLabel}」引用`}
                  onClick={() => onNavigate?.(b.moduleId, b.entryId)}
                >
                  <span className="ref-link-mod">{b.moduleName}</span>
                  {b.entryLabel}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {(entry.tags?.length ?? 0) > 0 && (
        <>
          <div className="divider" />
          <div className="row gap-2 wrap">
            <span className="muted" style={{ fontSize: 13 }}>
              标签
            </span>
            {entry.tags!.map((t) => (
              <span className="chip" key={t}>
                {t}
              </span>
            ))}
          </div>
        </>
      )}

      {entry.notes && (
        <>
          <div className="divider" />
          <div className="stack gap-2">
            <span className="muted" style={{ fontSize: 13 }}>
              备注
            </span>
            <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-2)' }}>{entry.notes}</div>
          </div>
        </>
      )}
    </Modal>
  )
}
