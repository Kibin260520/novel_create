import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookCard } from '@/components/novel/BookCard'
import { NovelForm } from '@/components/novel/NovelForm'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { UiIcon } from '@/components/icons/UiIcon'
import { useData } from '@/store/DataContext'
import { useToast } from '@/components/common/Toast'
import type { Novel, NovelDraft } from '@/types/data'

/**
 * 首页 = 书架。
 * 竖版书封网格 + 书名 + 副信息 +「⋮」菜单，样式走 .shelf-page（纸书质感）。
 * 新增入口只保留网格末尾的「＋」，不再有顶部的紫色按钮。
 */
export function HomePage() {
  const { index, novels, loadingIndex, loadNovel, createNovel, updateNovel, deleteNovel } =
    useData()
  const toast = useToast()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Novel | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Novel | null>(null)

  const list = index?.novels ?? []

  // 后台把每本小说都拉下来，用于显示「模块数 / 条目数」
  useEffect(() => {
    list.slice(0, 40).forEach((n) => {
      if (!novels[n.id]) void loadNovel(n.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((n) =>
      [n.title, n.author, n.summary, ...(n.tags ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [list, query])

  /** 全库统计，给页头用 */
  const totals = useMemo(() => {
    let modules = 0
    let entries = 0
    let loadedCount = 0
    for (const n of list) {
      const full = novels[n.id]
      if (!full) continue
      loadedCount += 1
      modules += full.modules.length
      entries += full.modules.reduce((s, m) => s + m.entries.length, 0)
    }
    return { modules, entries, loadedCount }
  }, [list, novels])

  const submitNovel = async (draft: NovelDraft) => {
    if (editing) {
      await updateNovel(editing.id, draft)
      toast.success('已更新小说信息')
      return
    }
    const created = await createNovel(draft)
    if (created) {
      toast.success(`《${created.title}》已创建，预置了 9 个模块`)
      navigate(`/novel/${created.id}`)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const loading = loadingIndex && list.length === 0

  return (
    <div className="shelf-page">
      <div className="shelf-head">
        <div className="shelf-heading">
          <h1 className="shelf-title">书架</h1>
          <span className="shelf-count">
            {list.length > 0
              ? `共 ${list.length} 本${
                  totals.loadedCount === list.length
                    ? ` · ${totals.modules} 个模块 · ${totals.entries} 条记录`
                    : ''
                }`
              : '还没有书'}
          </span>
        </div>
        <div className="shelf-tools">
          {list.length > 0 && (
            <div className="search">
              <UiIcon name="search" size={16} />
              <input
                className="input"
                placeholder="搜索书名、作者、标签…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="shelf-grid">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div className="book" key={i}>
              <div className="book-sk-cover" />
              <div className="book-sk-line" style={{ width: '82%' }} />
              <div className="book-sk-line" style={{ width: '48%', height: 10 }} />
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon="layers"
          title="书架还空着"
          desc="点下面的「＋」，创建你的第一本书。创建后会自动带上 设定 / 势力 / 灵感 / 技能名 / 角色 / 情节 / 地点 / 道具 / 时间线 这 9 个模块。"
          action={
            <button className="btn btn-primary" onClick={openCreate}>
              <UiIcon name="plus" size={16} /> 新增小说
            </button>
          }
        />
      ) : (
        <div className="shelf-grid">
          {filtered.map((n) => (
            <BookCard
              key={n.id}
              novel={n}
              loaded={novels[n.id]}
              onEdit={async () => {
                const full = novels[n.id] ?? (await loadNovel(n.id))
                if (!full) {
                  toast.error('读取该小说信息失败，请检查网络或仓库配置')
                  return
                }
                setEditing(full)
                setFormOpen(true)
              }}
              onDelete={() => setPendingDelete(novels[n.id] ?? (n as unknown as Novel))}
            />
          ))}
          {!query && (
            <button type="button" className="book-add" onClick={openCreate}>
              <span className="plus-ring">
                <UiIcon name="plus" size={20} />
              </span>
              <span className="add-label">新增小说</span>
            </button>
          )}
        </div>
      )}

      {query && filtered.length === 0 && (
        <EmptyState icon="search" title="没有匹配的书" desc={`书架上没有包含「${query}」的书`} />
      )}

      <NovelForm
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={submitNovel}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        danger
        title="删除小说"
        confirmText="删除"
        message={
          <>
            确定要删除 <strong>《{pendingDelete?.title}》</strong> 吗？
            <br />
            这本小说下的全部模块与条目都会一并删除，且会从仓库中移除对应文件。此操作不可撤销。
          </>
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const target = pendingDelete
          setPendingDelete(null)
          if (target) {
            void deleteNovel(target.id).then((ok) => {
              if (ok) toast.success(`已删除《${target.title}》`)
            })
          }
        }}
      />
    </div>
  )
}
