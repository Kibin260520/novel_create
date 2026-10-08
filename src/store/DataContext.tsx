import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useSettings } from './SettingsContext'
import { useToast } from '@/components/common/Toast'
import {
  fetchIndex,
  fetchNovel,
  stringifyJson,
  type SourceKind,
} from '@/lib/dataSource'
import { commitFiles, removeFile } from '@/lib/githubQueue'
import { GitHubError } from '@/lib/github'
import { KEYS, readJSON, writeJSON } from '@/lib/storage'
import { INDEX_FILE, novelFile, repoPath } from '@/lib/paths'
import { newEntryId, newModuleId, newNovelId } from '@/lib/id'
import { createDefaultModules } from '@/lib/defaultModules'
import * as R from './reducers'
import type {
  Novel,
  NovelIndex,
  NovelSummary,
  Module,
  Entry,
  FieldDef,
  NovelDraft,
  ModuleDraft,
} from '@/types/data'

interface CommitFile {
  path: string
  content: string
  message: string
}

export interface DataApi {
  index: NovelIndex | null
  novels: Record<string, Novel>
  loadingIndex: boolean
  loadingNovel: Record<string, boolean>
  source: SourceKind | null
  error: string | null
  syncing: boolean
  lastError: string | null

  /** 当前是否会把改动提交到 GitHub（否则仅存本机） */
  canWrite: boolean
  isConfigured: boolean

  refresh: (force?: boolean) => Promise<void>
  getNovel: (id: string) => Novel | undefined
  getSummary: (id: string) => NovelSummary | undefined
  loadNovel: (id: string) => Promise<Novel | null>

  createNovel: (draft: NovelDraft) => Promise<Novel | null>
  updateNovel: (id: string, patch: Partial<Novel>) => Promise<void>
  deleteNovel: (id: string) => Promise<void>

  createModule: (novelId: string, draft: ModuleDraft) => Promise<Module | null>
  updateModule: (novelId: string, moduleId: string, patch: Partial<Module>) => Promise<void>
  deleteModule: (novelId: string, moduleId: string) => Promise<void>
  setModuleFields: (novelId: string, moduleId: string, fields: FieldDef[]) => Promise<void>

  createEntry: (
    novelId: string,
    moduleId: string,
    values: Record<string, unknown>,
    extra?: Partial<Pick<Entry, 'notes' | 'tags'>>
  ) => Promise<Entry | null>
  updateEntry: (
    novelId: string,
    moduleId: string,
    entryId: string,
    patch: Partial<Entry>
  ) => Promise<void>
  deleteEntry: (novelId: string, moduleId: string, entryId: string) => Promise<void>
  moveEntry: (novelId: string, moduleId: string, entryId: string, delta: number) => Promise<void>
}

const DataContext = createContext<DataApi | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { ghConfig, canWrite, isConfigured, isAuthenticated, logout } = useSettings()
  const toast = useToast()

  const [index, setIndex] = useState<NovelIndex | null>(null)
  const [novels, setNovels] = useState<Record<string, Novel>>({})
  const [loadingIndex, setLoadingIndex] = useState(true)
  const [loadingNovel, setLoadingNovel] = useState<Record<string, boolean>>({})
  const [source, setSource] = useState<SourceKind | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [syncCount, setSyncCount] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)

  const novelsRef = useRef<Record<string, Novel>>({})
  const indexRef = useRef<NovelIndex | null>(null)
  const notifiedLocalOnly = useRef(false)

  const setNovelLocal = useCallback((n: Novel) => {
    novelsRef.current = { ...novelsRef.current, [n.id]: n }
    setNovels(novelsRef.current)
    writeJSON(KEYS.cacheNovel(n.id), n)
  }, [])

  const removeNovelLocal = useCallback((id: string) => {
    const { [id]: _drop, ...rest } = novelsRef.current
    novelsRef.current = rest
    setNovels(rest)
  }, [])

  const setIndexLocal = useCallback((next: NovelIndex) => {
    indexRef.current = next
    setIndex(next)
    writeJSON(KEYS.cacheIndex, next)
  }, [])

  /* ---------------- 提交到 GitHub ---------------- */

  const runCommit = useCallback(
    async (files: CommitFile[], deletes: { path: string; message: string }[] = []) => {
      if (!canWrite) {
        if (!notifiedLocalOnly.current) {
          notifiedLocalOnly.current = true
          toast.info('改动已保存在本机浏览器。到「设置」填写 Token 后，即可自动提交到 GitHub 仓库。')
        }
        return
      }
      setSyncCount((n) => n + 1)
      try {
        for (const d of deletes) {
          await removeFile(ghConfig, d.path, d.message)
        }
        if (files.length) {
          await commitFiles(ghConfig, files)
        }
        setLastError(null)
      } catch (e) {
        // 凭据失效（Token 过期 / 被撤销 / 权限被收回）：直接登出并提示重新登录。
        // 否则每次提交都失败，用户却看不出根因。
        if (e instanceof GitHubError && (e.status === 401 || e.status === 403)) {
          setLastError(e.message)
          logout({ keepIdentity: true })
          toast.error(`登录已失效：${e.message}，请重新登录后再试`)
        }
        throw e
      } finally {
        setSyncCount((n) => Math.max(0, n - 1))
      }
    },
    [canWrite, ghConfig, logout, toast]
  )

  interface MutateOpts {
    prev: Novel
    /** 需要一并更新 index.json 时传入「更新前」与「更新后」的清单 */
    prevIndex?: NovelIndex | null
    nextIndex?: NovelIndex
  }

  /** 统一处理：先乐观更新，再提交；失败回滚 */
  const mutateNovel = useCallback(
    async (next: Novel, message: string, opts: MutateOpts) => {
      // 1) 乐观更新
      setNovelLocal(next)
      if (opts.nextIndex) setIndexLocal(opts.nextIndex)

      const files: CommitFile[] = [
        { path: repoPath(novelFile(next.id)), content: stringifyJson(next), message },
      ]
      if (opts.nextIndex) {
        files.push({
          path: repoPath(INDEX_FILE),
          content: stringifyJson(opts.nextIndex),
          message: `chore(data): 更新小说清单（${next.title}）`,
        })
      }

      try {
        await runCommit(files)
      } catch (e) {
        // 2) 回滚
        setNovelLocal(opts.prev)
        if (opts.nextIndex && opts.prevIndex) setIndexLocal(opts.prevIndex)
        const msg = (e as Error).message || '提交失败'
        setLastError(msg)
        throw e
      }
    },
    [runCommit, setNovelLocal, setIndexLocal]
  )

  /* ---------------- 加载 ---------------- */

  /**
   * 拉取小说清单。
   * 未配置写入（无 Token）时以「本机缓存」优先，避免把本机改动覆盖掉；
   * 传 force = true 可强制从远端重新拉取（会丢弃本机改动）。
   */
  const refresh = useCallback(
    async (force = false) => {
      setLoadingIndex(true)
      setError(null)
      try {
        const cached = readJSON<NovelIndex | null>(KEYS.cacheIndex, null)
        if (cached) setIndexLocal(cached)

        if (!force && !canWrite && cached) {
          // 本机优先：不覆盖未提交的本地改动
          return
        }

        const r = await fetchIndex(isConfigured ? ghConfig : null, true)
        setIndexLocal(r.data)
        setSource(r.source)
      } catch (e) {
        const msg = (e as Error).message
        setError(msg)
        if (!indexRef.current) {
          toast.error(`读取数据失败：${msg}`)
        }
      } finally {
        setLoadingIndex(false)
      }
    },
    [ghConfig, isConfigured, canWrite, setIndexLocal, toast]
  )

  /**
   * 登录成功后再拉数据（严格模式下未登录看不到内容）。
   * 登出时清空内存数据与引导标记，下次登录会重新拉取。
   */
  const bootstrapped = useRef(false)
  useEffect(() => {
    if (!isAuthenticated) {
      // 登出：清掉内存中的数据，避免内容残留在页面上
      novelsRef.current = {}
      indexRef.current = null
      setNovels({})
      setIndex(null)
      setLoadingNovel({})
      setLoadingIndex(false)
      setLastError(null)
      bootstrapped.current = false
      return
    }
    if (bootstrapped.current) return
    bootstrapped.current = true
    void refresh(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const loadNovel = useCallback(
    async (id: string): Promise<Novel | null> => {
      if (novelsRef.current[id]) return novelsRef.current[id]
      setLoadingNovel((s) => ({ ...s, [id]: true }))

      // 先上缓存，秒开
      const cached = readJSON<Novel | null>(KEYS.cacheNovel(id), null)
      if (cached && cached.id === id) {
        setNovelLocal(cached)
        // 未配置写入时以本机为准，避免未提交的改动被远端覆盖
        if (!canWrite) {
          setLoadingNovel((s) => ({ ...s, [id]: false }))
          return cached
        }
      }

      try {
        const summary = indexRef.current?.novels.find((n) => n.id === id)
        const file = summary?.file || novelFile(id)
        const r = await fetchNovel(isConfigured ? ghConfig : null, file, id, true)
        setNovelLocal(r.data)
        setSource(r.source)
        return r.data
      } catch (e) {
        const msg = (e as Error).message
        if (!novelsRef.current[id]) {
          setError(msg)
          toast.error(`读取《${id}》失败：${msg}`)
        }
        return novelsRef.current[id] ?? null
      } finally {
        setLoadingNovel((s) => ({ ...s, [id]: false }))
      }
    },
    [ghConfig, isConfigured, canWrite, setNovelLocal, toast]
  )

  const getNovel = useCallback((id: string) => novelsRef.current[id], [])
  const getSummary = useCallback(
    (id: string) => indexRef.current?.novels.find((n) => n.id === id),
    []
  )

  /* ---------------- 小说 CRUD ---------------- */

  const createNovel = useCallback(
    async (draft: NovelDraft): Promise<Novel | null> => {
      const novel: Novel = {
        id: newNovelId(),
        schemaVersion: 1,
        title: draft.title.trim() || '未命名小说',
        author: draft.author?.trim() || '',
        cover: draft.cover?.trim() || '',
        tags: draft.tags ?? [],
        summary: draft.summary?.trim() || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        modules: createDefaultModules(),
      }
      const prevIndex = indexRef.current ?? R.emptyIndex()
      const nextIndex = R.indexUpsert(prevIndex, novel)

      setNovelLocal(novel)
      setIndexLocal(nextIndex)

      const files: CommitFile[] = [
        {
          path: repoPath(novelFile(novel.id)),
          content: stringifyJson(novel),
          message: `feat(data): 新增小说《${novel.title}》`,
        },
        {
          path: repoPath(INDEX_FILE),
          content: stringifyJson(nextIndex),
          message: `chore(data): 小说清单加入《${novel.title}》`,
        },
      ]
      try {
        await runCommit(files)
      } catch (e) {
        removeNovelLocal(novel.id)
        setIndexLocal(prevIndex)
        toast.error(`创建失败：${(e as Error).message}`)
        return null
      }
      return novel
    },
    [runCommit, setNovelLocal, setIndexLocal, removeNovelLocal, toast]
  )

  const updateNovel = useCallback(
    async (id: string, patch: Partial<Novel>) => {
      const prev = novelsRef.current[id]
      if (!prev) return
      const prevIndex = indexRef.current
      const next = R.applyNovelPatch(prev, patch)
      const nextIndex = prevIndex ? R.indexUpsert(prevIndex, next) : undefined
      await mutateNovel(next, `chore(data): 更新《${next.title}》信息`, {
        prev,
        prevIndex,
        nextIndex,
      })
    },
    [mutateNovel]
  )

  const deleteNovel = useCallback(
    async (id: string) => {
      const prev = novelsRef.current[id]
      const prevIndex = indexRef.current
      const title = prev?.title ?? prevIndex?.novels.find((n) => n.id === id)?.title ?? id
      const nextIndex = prevIndex ? R.indexRemove(prevIndex, id) : undefined

      removeNovelLocal(id)
      if (nextIndex) setIndexLocal(nextIndex)

      try {
        await runCommit(
          nextIndex
            ? [
                {
                  path: repoPath(INDEX_FILE),
                  content: stringifyJson(nextIndex),
                  message: `chore(data): 小说清单移除《${title}》`,
                },
              ]
            : [],
          [{ path: repoPath(novelFile(id)), message: `chore(data): 删除小说《${title}》` }]
        )
      } catch (e) {
        if (prev) setNovelLocal(prev)
        if (prevIndex) setIndexLocal(prevIndex)
        toast.error(`删除失败：${(e as Error).message}`)
      }
    },
    [runCommit, removeNovelLocal, setIndexLocal, setNovelLocal, toast]
  )

  /* ---------------- 模块 CRUD ---------------- */

  const createModule = useCallback(
    async (novelId: string, draft: ModuleDraft): Promise<Module | null> => {
      const novel = novelsRef.current[novelId]
      if (!novel) return null
      const mod: Module = {
        id: newModuleId(),
        name: draft.name.trim() || '新模块',
        entryLabel: draft.entryLabel?.trim() || draft.name.trim() || '条目',
        description: draft.description?.trim() || '',
        icon: draft.icon ?? { type: 'builtin', name: 'layers' },
        color: draft.color || '#6366f1',
        fields: draft.fields ?? [
          { key: 'name', label: '名称', type: 'text', required: true, order: 0 },
          { key: 'note', label: '说明', type: 'textarea', order: 1 },
        ],
        entries: [],
        order: novel.modules.length,
      }
      const next = R.addModule(novel, mod)
      await mutateNovel(next, `feat(data): 《${novel.title}》新增模块「${mod.name}」`, { prev: novel })
      return mod
    },
    [mutateNovel]
  )

  const updateModule = useCallback(
    async (novelId: string, moduleId: string, patch: Partial<Module>) => {
      const novel = novelsRef.current[novelId]
      if (!novel) return
      const next = R.patchModule(novel, moduleId, patch)
      const name = next.modules.find((m) => m.id === moduleId)?.name ?? ''
      await mutateNovel(next, `chore(data): 更新模块「${name}」`, { prev: novel })
    },
    [mutateNovel]
  )

  const deleteModule = useCallback(
    async (novelId: string, moduleId: string) => {
      const novel = novelsRef.current[novelId]
      if (!novel) return
      const name = novel.modules.find((m) => m.id === moduleId)?.name ?? ''
      const next = R.dropModule(novel, moduleId)
      await mutateNovel(next, `chore(data): 删除模块「${name}」`, { prev: novel })
    },
    [mutateNovel]
  )

  const setModuleFields = useCallback(
    async (novelId: string, moduleId: string, fields: FieldDef[]) => {
      const novel = novelsRef.current[novelId]
      if (!novel) return
      const next = R.setModuleFields(novel, moduleId, fields)
      const name = next.modules.find((m) => m.id === moduleId)?.name ?? ''
      await mutateNovel(next, `chore(data): 调整模块「${name}」的字段`, { prev: novel })
    },
    [mutateNovel]
  )

  /* ---------------- 条目 CRUD ---------------- */

  const createEntry = useCallback(
    async (
      novelId: string,
      moduleId: string,
      values: Record<string, unknown>,
      extra?: Partial<Pick<Entry, 'notes' | 'tags'>>
    ): Promise<Entry | null> => {
      const novel = novelsRef.current[novelId]
      if (!novel) return null
      const now = new Date().toISOString()
      const entry: Entry = {
        id: newEntryId(),
        createdAt: now,
        updatedAt: now,
        values,
        notes: extra?.notes ?? '',
        tags: extra?.tags ?? [],
        order: (novel.modules.find((m) => m.id === moduleId)?.entries.length ?? 0),
      }
      const next = R.addEntry(novel, moduleId, entry)
      const label = novel.modules.find((m) => m.id === moduleId)?.entryLabel ?? '条目'
      const title = String(values.name ?? values.title ?? values.event ?? values.idea ?? '新内容')
      await mutateNovel(next, `feat(data): 《${novel.title}》新增${label}「${title}」`, {
        prev: novel,
      })
      return entry
    },
    [mutateNovel]
  )

  const updateEntry = useCallback(
    async (novelId: string, moduleId: string, entryId: string, patch: Partial<Entry>) => {
      const novel = novelsRef.current[novelId]
      if (!novel) return
      const next = R.patchEntry(novel, moduleId, entryId, patch)
      const mod = next.modules.find((m) => m.id === moduleId)
      const entry = mod?.entries.find((e) => e.id === entryId)
      const title = String(entry?.values?.name ?? entry?.values?.title ?? entry?.values?.event ?? '')
      await mutateNovel(next, `chore(data): 更新${mod?.entryLabel ?? '条目'}「${title}」`, {
        prev: novel,
      })
    },
    [mutateNovel]
  )

  const deleteEntry = useCallback(
    async (novelId: string, moduleId: string, entryId: string) => {
      const novel = novelsRef.current[novelId]
      if (!novel) return
      const mod = novel.modules.find((m) => m.id === moduleId)
      const entry = mod?.entries.find((e) => e.id === entryId)
      const title = String(entry?.values?.name ?? entry?.values?.title ?? entry?.values?.event ?? '')
      const next = R.dropEntry(novel, moduleId, entryId)
      await mutateNovel(next, `chore(data): 删除${mod?.entryLabel ?? '条目'}「${title}」`, {
        prev: novel,
      })
    },
    [mutateNovel]
  )

  const moveEntry = useCallback(
    async (novelId: string, moduleId: string, entryId: string, delta: number) => {
      const novel = novelsRef.current[novelId]
      if (!novel) return
      const next = R.moveEntry(novel, moduleId, entryId, delta)
      if (next === novel) return
      await mutateNovel(next, `chore(data): 调整条目顺序`, { prev: novel })
    },
    [mutateNovel]
  )

  const value = useMemo<DataApi>(
    () => ({
      index,
      novels,
      loadingIndex,
      loadingNovel,
      source,
      error,
      syncing: syncCount > 0,
      lastError,
      canWrite,
      isConfigured,
      refresh,
      getNovel,
      getSummary,
      loadNovel,
      createNovel,
      updateNovel,
      deleteNovel,
      createModule,
      updateModule,
      deleteModule,
      setModuleFields,
      createEntry,
      updateEntry,
      deleteEntry,
      moveEntry,
    }),
    [
      index,
      novels,
      loadingIndex,
      loadingNovel,
      source,
      error,
      syncCount,
      lastError,
      canWrite,
      isConfigured,
      refresh,
      getNovel,
      getSummary,
      loadNovel,
      createNovel,
      updateNovel,
      deleteNovel,
      createModule,
      updateModule,
      deleteModule,
      setModuleFields,
      createEntry,
      updateEntry,
      deleteEntry,
      moveEntry,
    ]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataApi {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData 必须在 DataProvider 内使用')
  return ctx
}
