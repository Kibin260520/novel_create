import { useNavigate } from 'react-router-dom'
import { UiIcon } from '@/components/icons/UiIcon'
import { initial } from '@/lib/format'
import type { Novel, NovelSummary } from '@/types/data'

interface Props {
  novel: NovelSummary
  loaded?: Novel
  onEdit?: () => void
  onDelete?: () => void
}

export function NovelCard({ novel, loaded, onEdit, onDelete }: Props) {
  const navigate = useNavigate()
  const moduleCount = loaded?.modules.length
  const entryCount = loaded?.modules.reduce((s, m) => s + m.entries.length, 0)

  return (
    <article
      className="card glass is-clickable"
      onClick={() => navigate(`/novel/${novel.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/novel/${novel.id}`)}
    >
      <span className="card-glow" style={{ ['--card-color' as string]: '#7c8cff' }} />

      <div className="card-top">
        {novel.cover ? (
          <img
            src={novel.cover}
            alt=""
            style={{
              width: 48,
              height: 62,
              objectFit: 'cover',
              borderRadius: 'var(--r-sm)',
              flex: 'none',
            }}
          />
        ) : (
          <div
            className="icon-tile is-lg"
            style={{
              ['--card-color' as string]: '#7c8cff',
              fontFamily: 'var(--font-serif)',
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            {initial(novel.title)}
          </div>
        )}
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="card-title clamp-1">{novel.title}</div>
          {novel.author && <div className="muted" style={{ fontSize: 13 }}>{novel.author}</div>}
        </div>
        {(onEdit || onDelete) && (
          <div className="row gap-1" onClick={(e) => e.stopPropagation()}>
            {onEdit && (
              <button className="btn btn-icon btn-sm btn-ghost" title="编辑信息" onClick={onEdit}>
                <UiIcon name="edit" size={15} />
              </button>
            )}
            {onDelete && (
              <button className="btn btn-icon btn-sm btn-ghost" title="删除小说" onClick={onDelete}>
                <UiIcon name="trash" size={15} />
              </button>
            )}
          </div>
        )}
      </div>

      {novel.summary && (
        <p className="card-desc clamp-3" style={{ margin: 0 }}>
          {novel.summary}
        </p>
      )}

      <div className="card-foot">
        {(novel.tags ?? []).slice(0, 3).map((t) => (
          <span className="chip is-plain" key={t}>
            {t}
          </span>
        ))}
        <span className="grow" />
        {moduleCount != null && (
          <span className="row gap-1">
            {moduleCount} 个模块
            {entryCount != null && ` · ${entryCount} 条`}
          </span>
        )}
      </div>
    </article>
  )
}
