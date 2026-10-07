import { useNavigate } from 'react-router-dom'
import { SvgIcon } from '@/components/icons/SvgIcon'
import { UiIcon } from '@/components/icons/UiIcon'
import { colorWithAlpha } from '@/lib/palette'
import type { Module } from '@/types/data'

interface Props {
  novelId: string
  module: Module
  onEdit: () => void
  onDelete: () => void
  onPickIcon: () => void
}

export function ModuleCard({ novelId, module, onEdit, onDelete, onPickIcon }: Props) {
  const navigate = useNavigate()
  const color = module.color || '#6366f1'
  const count = module.entries.length
  const fieldCount = module.fields.length

  return (
    <article
      className="card glass is-clickable"
      style={{ ['--card-color' as string]: color }}
      onClick={() => navigate(`/novel/${novelId}/module/${module.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) =>
        e.key === 'Enter' && navigate(`/novel/${novelId}/module/${module.id}`)
      }
    >
      <span className="card-glow" />
      <span className="card-accent" />

      <div className="card-top">
        <div className="icon-tile is-lg" title="点击右侧按钮可替换图标">
          <SvgIcon icon={module.icon} size={30} />
        </div>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="card-title clamp-1">{module.name}</div>
          <div className="muted" style={{ fontSize: 12.5 }}>
            {count} 条{module.entryLabel ? ` · ${module.entryLabel}` : ''}
          </div>
        </div>
        <div className="row gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            className="btn btn-icon btn-sm btn-ghost"
            title="替换图标"
            onClick={onPickIcon}
          >
            <UiIcon name="palette" size={15} />
          </button>
          <button className="btn btn-icon btn-sm btn-ghost" title="编辑模块" onClick={onEdit}>
            <UiIcon name="edit" size={15} />
          </button>
          <button className="btn btn-icon btn-sm btn-ghost" title="删除模块" onClick={onDelete}>
            <UiIcon name="trash" size={15} />
          </button>
        </div>
      </div>

      {module.description && (
        <p className="card-desc clamp-2" style={{ margin: 0 }}>
          {module.description}
        </p>
      )}

      {count === 0 && (
        <div
          className="row gap-1"
          style={{ fontSize: 12.5, color: color, marginTop: 'auto' }}
        >
          <UiIcon name="plus" size={13} /> 还没有内容，点进来添加
        </div>
      )}

      <div className="card-foot">
        <span
          className="chip is-plain"
          style={{
            background: colorWithAlpha(color, 0.12),
            borderColor: colorWithAlpha(color, 0.26),
            color,
          }}
        >
          {fieldCount} 个字段
        </span>
      </div>
    </article>
  )
}
