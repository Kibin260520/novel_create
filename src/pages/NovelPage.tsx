import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { ModuleCard } from '@/components/module/ModuleCard'
import { ModuleForm, type ModuleFormValue } from '@/components/module/ModuleForm'
import { NovelForm } from '@/components/novel/NovelForm'
import { AddCard } from '@/components/common/AddCard'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Modal } from '@/components/common/Modal'
import { IconPicker } from '@/components/icons/IconPicker'
import { UiIcon } from '@/components/icons/UiIcon'
import { useData } from '@/store/DataContext'
import { useToast } from '@/components/common/Toast'
import { initial } from '@/lib/format'
import type { Module } from '@/types/data'

export function NovelPage() {
  const { novelId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const {
    loadNovel,
    getNovel,
    getSummary,
    loadingNovel,
    updateNovel,
    deleteNovel,
    createModule,
    updateModule,
    deleteModule,
  } = useData()

  const novel = getNovel(novelId)
  const summary = getSummary(novelId)
  // 区分「还在读」和「确实不存在」，避免坏链路上永远转圈
  // undefined 表示尚未发起过加载，此时也按「读取中」处理，防止首帧闪一下「未找到」
  const loading = !novel && loadingNovel[novelId] !== false

  const [moduleFormOpen, setModuleFormOpen] = useState(false)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [pendingDeleteModule, setPendingDeleteModule] = useState<Module | null>(null)
  const [iconTarget, setIconTarget] = useState<Module | null>(null)
  const [novelFormOpen, setNovelFormOpen] = useState(false)
  const [pendingDeleteNovel, setPendingDeleteNovel] = useState(false)

  useEffect(() => {
    void loadNovel(novelId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novelId])

  const title = novel?.title ?? summary?.title ?? (loading ? '读取中…' : '未找到')
  const modules = novel?.modules ?? []

  const submitModule = async (v: ModuleFormValue) => {
    if (editingModule) {
      await updateModule(novelId, editingModule.id, v)
      toast.success(`模块「${v.name}」已更新`)
    } else {
      const created = await createModule(novelId, v)
      if (created) toast.success(`模块「${created.name}」已创建`)
    }
  }

  return (
    <>
      <Breadcrumbs items={[{ label: '首页', to: '/' }, { label: title }]} />

      <div className="page-head">
        <div className="page-title">
          {novel?.cover ? (
            <img
              src={novel.cover}
              alt=""
              style={{ width: 46, height: 60, objectFit: 'cover', borderRadius: 'var(--r-sm)' }}
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
              {initial(title)}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <h1>{title}</h1>
            <div className="page-sub row gap-2 wrap">
              {novel?.author && <span>{novel.author}</span>}
              {(novel?.tags ?? []).map((t) => (
                <span className="chip is-plain" key={t}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ghost" to="/">
            <UiIcon name="arrowLeft" size={16} /> 全部小说
          </Link>
          <button className="btn" onClick={() => setNovelFormOpen(true)} disabled={!novel}>
            <UiIcon name="edit" size={16} /> 编辑信息
          </button>
        </div>
      </div>

      {novel?.summary && (
        <p style={{ color: 'var(--text-2)', maxWidth: 780, marginBottom: 'var(--sp-5)' }}>
          {novel.summary}
        </p>
      )}

      {!novel ? (
        loading ? (
          <div className="grid">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="card glass">
                <div className="row gap-3">
                  <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 16 }} />
                  <div className="stack gap-2 grow">
                    <div className="skeleton" style={{ height: 14, width: '50%' }} />
                    <div className="skeleton" style={{ height: 11, width: '35%' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="alert"
            title="没有找到这本小说"
            desc={
              <>
                地址里的书籍标识 <code>{novelId}</code> 在数据中不存在，
                可能已经被删除，或者链接有误。
              </>
            }
            action={
              <Link className="btn btn-primary" to="/">
                <UiIcon name="arrowLeft" size={16} /> 返回全部小说
              </Link>
            }
          />
        )
      ) : modules.length === 0 ? (
        <EmptyState
          icon="layers"
          title="这本书还没有模块"
          desc="模块就是资料分类，比如「角色」「势力」「灵感」。"
          action={
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingModule(null)
                setModuleFormOpen(true)
              }}
            >
              <UiIcon name="plus" size={16} /> 新增模块
            </button>
          }
        />
      ) : (
        <>
          <div className="section-title">
            <UiIcon name="layers" size={14} /> 模块 · {modules.length}
          </div>
          <div className="grid">
            {[...modules]
              .sort((a, b) => a.order - b.order)
              .map((m) => (
                <ModuleCard
                  key={m.id}
                  novelId={novelId}
                  module={m}
                  onEdit={() => {
                    setEditingModule(m)
                    setModuleFormOpen(true)
                  }}
                  onDelete={() => setPendingDeleteModule(m)}
                  onPickIcon={() => setIconTarget(m)}
                />
              ))}
            <AddCard
              label="新增模块"
              hint="自定义名称与图标"
              onClick={() => {
                setEditingModule(null)
                setModuleFormOpen(true)
              }}
            />
          </div>
        </>
      )}

      {/* 底部操作区 */}
      {novel && (
        <div className="row" style={{ marginTop: 'var(--sp-7)' }}>
          <span className="grow" />
          <button className="btn btn-danger btn-sm" onClick={() => setPendingDeleteNovel(true)}>
            <UiIcon name="trash" size={15} /> 删除这本小说
          </button>
        </div>
      )}

      <ModuleForm
        open={moduleFormOpen}
        initial={editingModule}
        modules={novel?.modules}
        onClose={() => setModuleFormOpen(false)}
        onSubmit={submitModule}
      />

      <NovelForm
        open={novelFormOpen}
        initial={novel}
        onClose={() => setNovelFormOpen(false)}
        onSubmit={async (draft) => {
          await updateNovel(novelId, draft)
          toast.success('已更新小说信息')
        }}
      />

      {/* 快速替换图标 */}
      <Modal
        open={!!iconTarget}
        title={`替换「${iconTarget?.name}」的图标`}
        onClose={() => setIconTarget(null)}
        footer={
          <>
            <span className="grow" />
            <button className="btn btn-primary" onClick={() => setIconTarget(null)}>
              完成
            </button>
          </>
        }
      >
        {iconTarget && (
          <IconPicker
            value={iconTarget.icon}
            color={iconTarget.color}
            onChange={(icon) => {
              setIconTarget({ ...iconTarget, icon })
              void updateModule(novelId, iconTarget.id, { icon })
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!pendingDeleteModule}
        danger
        title="删除模块"
        confirmText="删除"
        message={
          <>
            确定要删除模块 <strong>「{pendingDeleteModule?.name}」</strong> 吗？
            {pendingDeleteModule && pendingDeleteModule.entries.length > 0 && (
              <>
                <br />
                其中 <strong>{pendingDeleteModule.entries.length}</strong> 条内容也会一起删除。
              </>
            )}
          </>
        }
        onCancel={() => setPendingDeleteModule(null)}
        onConfirm={() => {
          const target = pendingDeleteModule
          setPendingDeleteModule(null)
          if (target) {
            void deleteModule(novelId, target.id).then(() =>
              toast.success(`已删除模块「${target.name}」`)
            )
          }
        }}
      />

      <ConfirmDialog
        open={pendingDeleteNovel}
        danger
        title="删除小说"
        confirmText="删除"
        message={
          <>
            确定要删除 <strong>《{title}》</strong> 吗？全部模块与条目都会一并删除，且会从仓库移除文件。
          </>
        }
        onCancel={() => setPendingDeleteNovel(false)}
        onConfirm={() => {
          setPendingDeleteNovel(false)
          void deleteNovel(novelId).then((ok) => {
            if (!ok) return
            toast.success(`已删除《${title}》`)
            navigate('/')
          })
        }}
      />
    </>
  )
}
