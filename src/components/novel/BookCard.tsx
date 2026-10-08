import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookCover } from './BookCover'
import { UiIcon } from '@/components/icons/UiIcon'
import type { Novel, NovelSummary } from '@/types/data'

interface Props {
  novel: NovelSummary
  /** 已加载的完整数据，用于在标签缺失时兜底显示模块数 */
  loaded?: Novel
  onEdit: () => void
  onDelete: () => void
}

/**
 * 书架上的一本书：竖版封面 + 两行书名 + 一行副信息 + 「⋮」菜单。
 * 点封面或书名进书，编辑/删除收进菜单里，避免卡片上挂一排按钮。
 */
export function BookCard({ novel, loaded, onEdit, onDelete }: Props) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const meta =
    (novel.tags ?? []).slice(0, 3).join(' · ') ||
    (loaded ? `${loaded.modules.length} 个模块` : '') ||
    novel.author ||
    '未分类'

  const open = () => navigate(`/novel/${novel.id}`)

  return (
    <article className="book">
      <button type="button" className="book-cover-btn" onClick={open} title={`打开《${novel.title}》`}>
        <BookCover novel={novel} />
      </button>

      <div
        className="book-title clamp-2"
        role="link"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => e.key === 'Enter' && open()}
      >
        {novel.title}
      </div>

      <div className="book-meta">
        <span className="book-meta-text" title={meta}>
          {meta}
        </span>
        <div className="book-menu" ref={menuRef}>
          <button
            type="button"
            className="book-menu-btn"
            title="更多操作"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <UiIcon name="more" size={15} />
          </button>
          {menuOpen && (
            <div className="book-menu-pop" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  onEdit()
                }}
              >
                <UiIcon name="edit" size={14} /> 编辑信息
              </button>
              <button
                type="button"
                role="menuitem"
                className="is-danger"
                onClick={() => {
                  setMenuOpen(false)
                  onDelete()
                }}
              >
                <UiIcon name="trash" size={14} /> 删除这本书
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
