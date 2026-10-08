import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { EntryCard } from '@/components/entry/EntryCard'
import { EntryForm } from '@/components/entry/EntryForm'
import { EntryDetail } from '@/components/entry/EntryDetail'
import { ModuleForm, type ModuleFormValue } from '@/components/module/ModuleForm'
import { AddCard } from '@/components/common/AddCard'
import { SortableGrid } from '@/components/common/SortableGrid'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { SvgIcon } from '@/components/icons/SvgIcon'
import { UiIcon } from '@/components/icons/UiIcon'
import { useData } from '@/store/DataContext'
import { useToast } from '@/components/common/Toast'
import { valueToText } from '@/lib/format'
import { displayValue } from '@/lib/refs'
import type { Entry } from '@/types/data'

export function ModulePage() {
  const { novelId = '', moduleId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const {
    loadNovel,
    getNovel,
    loadingNovel,
    createEntry,
    updateEntry,
    deleteEntry,
    reorderEntries,
    updateModule,
    deleteModule,
  } = useData()

  const novel = getNovel(novelId)
  const module = novel?.modules.find((m) => m.id === moduleId)
  // undefined 表示还没发起加载；为 false 时说明读完了却没有这个模块
  const loading = !novel || loadingNovel[novelId] !== false

  const [query, setQuery] = useState('')
  /** 整理顺序模式：进入后卡片可拖动，搜索框与「＋」先收起来，避免在筛选结果上排序 */
  const [sorting, setSorting] = useState(false)
  const [entryFormOpen, setEntryFormOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [detailEntry, setDetailEntry] = useState<Entry | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Entry | null>(null)
  const [moduleFormOpen, setModuleFormOpen] = useState(false)
  const [pendingDeleteModule, setPendingDeleteModule] = useState(false)

  // ?entry=<id> 支持从别的模块（引用/反向引用）直接跳到某条
  const [searchParams, setSearchParams] = useSearchParams()
  const deepEntryId = searchParams.get('entry')
  const handledDeep = useRef<string | null>(null)

  useEffect(() => {
    void loadNovel(novelId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novelId])

  useEffect(() => {
    if (!deepEntryId) {
      handledDeep.current = null
      return
    }
    if (!module || handledDeep.current === deepEntryId) return
    const target = module.entries.find((e) => e.id === deepEntryId)
    if (target) {
      setDetailEntry(target)
      handledDeep.current = deepEntryId
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepEntryId, module])

  const closeDetail = () => {
    setDetailEntry(null)
    handledDeep.current = null
    if (deepEntryId) {
      const next = new URLSearchParams(searchParams)
      next.delete('entry')
      setSearchParams(next, { replace: true })
    }
  }

  /** 点引用标签：关掉弹窗并跳到目标条目 */
  const goToEntry = (targetModuleId: string, targetEntryId: string) => {
    setDetailEntry(null)
    handledDeep.current = null
    if (targetModuleId === moduleId) {
      setSearchParams({ entry: targetEntryId }, { replace: true })
    } else {
      navigate(`/novel/${novelId}/module/${targetModuleId}?entry=${targetEntryId}`)
    }
  }

  // 详情弹窗要跟数据保持同步
  const liveDetail = detailEntry
    ? module?.entries.find((e) => e.id === detailEntry.id) ?? null
    : null

  const entries = useMemo(() => {
    const list = [...(module?.entries ?? [])].sort((a, b) => a.order - b.order)
    const q = query.trim().toLowerCase()
    if (!q) return list
    const fields = module?.fields ?? []
    return list.filter((e) => {
      const hay = [
        // 引用字段要按「条目名字」搜，否则搜到的是内部 id，等于搜不到
        ...fields.map((f) => displayValue(novel, f, e.values[f.key])),
        ...Object.values(e.values).map(valueToText),
        e.notes ?? '',
        ...(e.tags ?? []),
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [module, query, novel])

  const entryIds = useMemo(() => entries.map((e) => e.id), [entries])
  const entryById = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries])

  const label = module?.entryLabel || module?.name || '条目'

  if (!module) {
    return (
      <>
        <Breadcrumbs
          items={[
            { label: '首页', to: '/' },
            { label: novel?.title ?? '小说', to: `/novel/${novelId}` },
            { label: loading ? '读取中…' : '未找到' },
          ]}
        />
        {loading ? (
          <div className="grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card glass">
                <div className="skeleton" style={{ height: 16, width: '50%' }} />
                <div className="skeleton" style={{ height: 12, width: '85%' }} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="alert"
            title="没有找到这个模块"
            desc={
              <>
                模块标识 <code>{moduleId}</code> 在《{novel?.title ?? novelId}》里不存在，
                可能已经被删除，或者链接有误。
              </>
            }
            action={
              <Link className="btn btn-primary" to={`/novel/${novelId}`}>
                <UiIcon name="arrowLeft" size={16} /> 返回模块列表
              </Link>
            }
          />
        )}
      </>
    )
  }

  const submitEntry = async (
    values: Record<string, unknown>,
    extra: { notes: string; tags: string[] }
  ) => {
    if (editingEntry) {
      await updateEntry(novelId, moduleId, editingEntry.id, { values, ...extra })
      toast.success(`${label}已更新`)
    } else {
      const created = await createEntry(novelId, moduleId, values, extra)
      if (created) toast.success(`已添加${label}`)
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: '首页', to: '/' },
          { label: novel?.title ?? '小说', to: `/novel/${novelId}` },
          { label: module.name },
        ]}
      />

      <div className="page-head">
        <div className="page-title">
          <div className="icon-tile is-lg" style={{ ['--card-color' as string]: module.color }}>
            <SvgIcon icon={module.icon} size={30} title={module.name} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1>{module.name}</h1>
            <div className="page-sub">
              {module.description ? `${module.description} · ` : ''}
              共 {module.entries.length} 条{label}
            </div>
          </div>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ghost" to={`/novel/${novelId}`}>
            <UiIcon name="arrowLeft" size={16} /> 返回模块
          </Link>
          <button className="btn" onClick={() => setModuleFormOpen(true)}>
            <UiIcon name="settings" size={16} /> 模块设置
          </button>
        </div>
      </div>

      {module.entries.length > 0 && (
        <div className="toolbar">
          {sorting ? (
            <>
              <span className="sort-hint">
                <UiIcon name="drag" size={15} />
                按住卡片左上角的手柄拖动换位，也可以用 ↑ ↓ 微调；松手后自动保存
              </span>
              <span className="grow" />
              <button className="btn btn-sm btn-primary" onClick={() => setSorting(false)}>
                <UiIcon name="check" size={15} /> 完成
              </button>
            </>
          ) : (
            <>
              <div className="search">
                <UiIcon name="search" size={16} />
                <input
                  className="input"
                  placeholder={`搜索${label}…`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <span className="muted" style={{ fontSize: 13 }}>
                {query ? `匹配 ${entries.length} 条` : ''}
              </span>
              <span className="grow" />
              {module.entries.length > 1 && (
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    setQuery('')
                    setSorting(true)
                  }}
                >
                  <UiIcon name="sort" size={15} /> 整理顺序
                </button>
              )}
            </>
          )}
        </div>
      )}

      {module.entries.length === 0 ? (
        <EmptyState
          icon="inbox"
          title={`还没有${label}`}
          desc={
            <>
              点「+」添加第一条{label}。
              <br />
              每个{label}要填哪些内容，由模块的「条目字段定义」决定，随时可以改。
            </>
          }
          action={
            <div className="row gap-2">
              <button className="btn" onClick={() => setModuleFormOpen(true)}>
                <UiIcon name="settings" size={16} /> 设置字段
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingEntry(null)
                  setEntryFormOpen(true)
                }}
              >
                <UiIcon name="plus" size={16} /> 新增{label}
              </button>
            </div>
          }
        />
      ) : (
        <SortableGrid
          ids={entryIds}
          enabled={sorting}
          onReorder={(next) =>
            void reorderEntries(novelId, moduleId, next).catch((e: unknown) => {
              // 失败时数据已回滚、卡片会自己弹回原位，这里补一句说明
              toast.error(`顺序保存失败：${(e as Error)?.message ?? '未知错误'}`)
            })
          }
          renderItem={(id, ctx) => {
            const e = entryById.get(id)
            if (!e) return null
            return (
              <EntryCard
                module={module}
                entry={e}
                novel={novel}
                sort={sorting ? ctx : undefined}
                onOpen={() => setDetailEntry(e)}
                onEdit={() => {
                  setEditingEntry(e)
                  setEntryFormOpen(true)
                }}
                onDelete={() => setPendingDelete(e)}
              />
            )
          }}
          footer={
            !query && !sorting ? (
              <AddCard
                label={`新增${label}`}
                onClick={() => {
                  setEditingEntry(null)
                  setEntryFormOpen(true)
                }}
              />
            ) : null
          }
        />
      )}

      {query && entries.length === 0 && (
        <EmptyState icon="search" title="没有匹配的内容" desc={`没有找到包含「${query}」的${label}`} />
      )}

      <EntryForm
        open={entryFormOpen}
        module={module}
        novel={novel}
        initial={editingEntry}
        onClose={() => setEntryFormOpen(false)}
        onSubmit={submitEntry}
      />

      <EntryDetail
        open={!!liveDetail}
        module={module}
        entry={liveDetail}
        novel={novel}
        onClose={closeDetail}
        onNavigate={goToEntry}
        onEdit={() => {
          if (liveDetail) {
            setEditingEntry(liveDetail)
            closeDetail()
            setEntryFormOpen(true)
          }
        }}
        onDelete={() => {
          if (liveDetail) {
            setPendingDelete(liveDetail)
            closeDetail()
          }
        }}
      />

      <ModuleForm
        open={moduleFormOpen}
        initial={module}
        modules={novel?.modules}
        onClose={() => setModuleFormOpen(false)}
        onSubmit={async (v: ModuleFormValue) => {
          await updateModule(novelId, moduleId, v)
          toast.success('模块已更新')
        }}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        danger
        title={`删除${label}`}
        confirmText="删除"
        message={
          <>
            确定要删除这条
            <strong>
              「
              {valueToText(
                pendingDelete?.values?.name ??
                  pendingDelete?.values?.title ??
                  pendingDelete?.values?.event
              ) || '内容'}
              」
            </strong>
            吗？
          </>
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const target = pendingDelete
          setPendingDelete(null)
          if (target) {
            void deleteEntry(novelId, moduleId, target.id).then(() =>
              toast.success(`已删除该${label}`)
            )
          }
        }}
      />

      <ConfirmDialog
        open={pendingDeleteModule}
        danger
        title="删除模块"
        confirmText="删除"
        message={`确定要删除模块「${module.name}」吗？其中 ${module.entries.length} 条内容都会一起删除。`}
        onCancel={() => setPendingDeleteModule(false)}
        onConfirm={() => {
          setPendingDeleteModule(false)
          void deleteModule(novelId, moduleId).then(() => {
            toast.success('模块已删除')
            navigate(`/novel/${novelId}`)
          })
        }}
      />
    </>
  )
}
