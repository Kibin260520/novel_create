import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { NovelCard } from '@/components/novel/NovelCard'
import { NovelForm } from '@/components/novel/NovelForm'
import { AddCard } from '@/components/common/AddCard'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { UiIcon } from '@/components/icons/UiIcon'
import { useData } from '@/store/DataContext'
import { useToast } from '@/components/common/Toast'
import type { Novel, NovelDraft } from '@/types/data'

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

  return (
    <>
      <Breadcrumbs items={[{ label: '首页' }]} />

      <div className="page-head">
        <div className="page-title">
          <div>
            <h1>我的小说</h1>
            <div className="page-sub">
              {list.length > 0
                ? `共 ${list.length} 本 · 每本都可独立管理设定、角色、情节等模块`
                : '为每一本书建立自己的资料库'}
            </div>
          </div>
        </div>
        <div className="page-actions">
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
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <UiIcon name="plus" size={16} /> 新增小说
          </button>
        </div>
      </div>

      {loadingIndex && list.length === 0 ? (
        <div className="grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card glass">
              <div className="skeleton" style={{ height: 48, width: '60%' }} />
              <div className="skeleton" style={{ height: 12, width: '90%' }} />
              <div className="skeleton" style={{ height: 12, width: '75%' }} />
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon="layers"
          title="还没有小说"
          desc="点下面的按钮，创建你的第一本书。创建后会自动带上 设定 / 势力 / 灵感 / 技能名 / 角色 / 情节 / 地点 / 道具 / 时间线 这 9 个模块。"
          action={
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <UiIcon name="plus" size={16} /> 新增小说
            </button>
          }
        />
      ) : (
        <div className="grid grid-lg">
          {filtered.map((n) => (
            <NovelCard
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
            <AddCard
              label="新增小说"
              hint="想写多少本就写多少本"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            />
          )}
        </div>
      )}

      {query && filtered.length === 0 && (
        <EmptyState icon="search" title="没有匹配的小说" desc={`没有找到包含「${query}」的结果`} />
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
            void deleteNovel(target.id).then(() => toast.success(`已删除《${target.title}》`))
          }
        }}
      />
    </>
  )
}
