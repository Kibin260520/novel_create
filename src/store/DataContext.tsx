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
  readBundledIndex,
  readBundledNovel,
  readRawIndex,
  readRawNovel,
  stringifyJson,
  type SourceKind,
} from '@/lib/dataSource'
import { commitFiles, removeFile } from '@/lib/githubQueue'
import { GitHubError } from '@/lib/github'
import { KEYS, readJSON, removeKey, writeJSON } from '@/lib/storage'
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

  /** 刷新数据；返回「这次远端刷新是否真的拿到了数据」 */
  refresh: (force?: boolean) => Promise<boolean>
  getNovel: (id: string) => Novel | undefined
  getSummary: (id: string) => NovelSummary | undefined
  loadNovel: (id: string) => Promise<Novel | null>

  createNovel: (draft: NovelDraft) => Promise<Novel | null>
  updateNovel: (id: string, patch: Partial<Novel>) => Promise<void>
  /** 返回是否真的删掉了（失败 / 数据未就绪时为 false，调用方据此决定要不要报成功） */
  deleteNovel: (id: string) => Promise<boolean>

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
  /** 按给定的 id 顺序重排条目（拖拽 / 上移下移都走这里） */
  reorderEntries: (novelId: string, moduleId: string, orderedIds: string[]) => Promise<void>
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
  /**
   * 本地改动代次。每次用户增删改都会 +1。
   *
   * 后台从远端回填数据是异步的，期间用户可能刚好改了一笔；
   * 回填前对比代次，不一致就丢弃这份远端结果，否则会把刚改的内容冲掉。
   */
  const mutateGen = useRef(0)

  const setNovelLocal = useCallback((n: Novel) => {
    novelsRef.current = { ...novelsRef.current, [n.id]: n }
    setNovels(novelsRef.current)
    writeJSON(KEYS.cacheNovel(n.id), n)
  }, [])

  const removeNovelLocal = useCallback((id: string) => {
    const { [id]: _drop, ...rest } = novelsRef.current
    novelsRef.current = rest
    setNovels(rest)
    // 单本缓存也要一起清掉。只从内存里拿掉的话，这本书仍躺在 localStorage 里，
    // 一旦后续被 loadNovel 读到（例如清单被旧数据覆盖回来），已删除的书就会复活。
    removeKey(KEYS.cacheNovel(id))
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
        // 先写、后删。删除小说时「清单」是写在 files 里的，「小说文件」在 deletes 里，
        // 顺序反过来会出现「文件已从仓库删掉、但清单里还留着这本书」的坏状态：
        // 书架上点进去就是 404。先更清单则相反，最坏只是留一个没人引用的文件。
        if (files.length) {
          await commitFiles(ghConfig, files)
        }
        for (const d of deletes) {
          await removeFile(ghConfig, d.path, d.message)
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
      mutateGen.current += 1
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
   * 拉取小说清单。顺序：本机缓存 → 打包副本 → 远端。
   *
   * 前两步都是本地读取，毫秒级返回，先把页面填上；远端放后台拉，
   * 拿到更新的数据再覆盖。这样 raw 超时（国内很常见）也不会让首屏干等，
   * 而且远端不可达时保留的是本地数据、不会倒退成更旧的副本。
   *
   * 未配置写入（无 Token）时以「本机缓存」为准，避免把未提交的改动覆盖掉；
   * 传 force = true 表示以远端为准（本机未提交的改动会被丢弃）。
   *
   * 返回值表示这次远端刷新**是否真的拿到了数据**：页面渲染不等它，
   * 但「从远端重新拉取」这类按钮需要它来决定提示文案 —— 否则远端还没回来
   * （或者压根不可达）就报「已同步」，等于骗人。
   */
  const refresh = useCallback(
    async (force = false): Promise<boolean> => {
      setLoadingIndex(true)
      setError(null)

      const gen = mutateGen.current
      /** 代次变了说明期间用户改过数据，这份远端结果已过期，必须丢弃 */
      const applyIndex = (data: NovelIndex, src: SourceKind) => {
        if (mutateGen.current !== gen) return
        setIndexLocal(data)
        setSource(src)
      }

      const cfg = isConfigured ? ghConfig : null

      const revalidate = (): Promise<boolean> => {
        if (!cfg) return Promise.resolve(false)
        return readRawIndex(cfg, true)
          .then((data) => {
            // 只往「更新」的方向走 —— 这条规矩对 index 同样成立。
            //
            // 远端不一定比本地新：改动提交是排队执行的（每次都要先 GET 拿 sha，
            // 国内网络下一次要几十秒），用户点完「新增 / 删除」就刷新页面时，
            // 那一笔很可能还没写进仓库；即使写进去了，raw 也可能还挂着上一版。
            // 此时若拿它覆盖本地，就会出现「刚删掉的书刷新又回来」「刚新增的书
            // 刷新就消失」——实测仓库里就发生过：新增《第一本小说》成功提交，
            // 紧接着删另一本书时用落后一版的 index 做基准，把《第一本小说》
            // 从清单里一并抹掉了（文件还在仓库，但书架不再显示它）。
            const cur = indexRef.current
            if (cur && data.updatedAt < cur.updatedAt) return false
            applyIndex(data, 'raw')
            return true
          })
          .catch(() => {
            /* 远端不可达：保留本地数据，绝不回退成更旧的副本 */
            return false
          })
      }

      try {
        // ① 本机缓存：秒开，且可能含着尚未提交到仓库的改动
        const cached = readJSON<NovelIndex | null>(KEYS.cacheIndex, null)
        if (cached) applyIndex(cached, 'cache')

        // ② 只读凭据 + 有本机缓存 → 以本机为准，不去打扰远端
        if (!force && !canWrite && cached) return false

        // ③ 连缓存都没有，用打包副本顶上
        if (!indexRef.current) {
          const bundled = await readBundledIndex()
          if (bundled) applyIndex(bundled, 'bundled')
        }

        // ④ 本地已有内容 → 先撤掉加载态把页面渲染出来，再等远端
        if (indexRef.current) setLoadingIndex(false)

        // ⑤ 本地彻底没有内容时只能等远端，否则页面上什么都显示不出来
        return await revalidate()
      } catch (e) {
        const msg = (e as Error).message
        setError(msg)
        if (!indexRef.current) {
          toast.error(`读取数据失败：${msg}`)
        }
        return false
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

      const gen = mutateGen.current
      const summary = indexRef.current?.novels.find((n) => n.id === id)
      const file = summary?.file || novelFile(id)
      const cfg = isConfigured ? ghConfig : null

      const applyNovel = (data: Novel, src: SourceKind) => {
        // 代次变了 = 用户期间改过这本书，丢弃这份远端结果
        if (mutateGen.current !== gen) return
        const cur = novelsRef.current[id]
        // 手上这份比远端新（例如本机缓存晚于打包副本），别用旧的覆盖
        if (cur && cur.updatedAt > data.updatedAt) return
        setNovelLocal(data)
        setSource(src)
      }

      try {
        // ① 本机缓存：可能含着尚未提交到仓库的改动
        const cached = readJSON<Novel | null>(KEYS.cacheNovel(id), null)
        if (cached && cached.id === id) {
          applyNovel(cached, 'cache')
          // 只读凭据：以本机为准，避免未提交的改动被远端覆盖
          if (!canWrite) return novelsRef.current[id] ?? cached
        }

        // ② 打包副本（本地，毫秒级）。只在本机没有这本书时才用它顶上 ——
        // 缓存可能比打包副本更新（刚提交、部署还没跑完），不能倒着覆盖。
        if (!novelsRef.current[id]) {
          const bundled = await readBundledNovel(file, id)
          if (bundled) applyNovel(bundled, 'bundled')
        }

        if (!cfg) return novelsRef.current[id] ?? null

        // ③ 远端：本地有货就后台刷新；本地彻底没有才等它，
        //    否则会先闪一下「不存在」再出现内容
        if (novelsRef.current[id]) {
          void readRawNovel(cfg, file, id, true)
            .then((data) => applyNovel(data, 'raw'))
            .catch(() => {
              /* 远端不可达：保留本地数据 */
            })
        } else {
          applyNovel(await readRawNovel(cfg, file, id, true), 'raw')
        }
        return novelsRef.current[id] ?? null
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
      // 清单必须以「仓库里已有的清单」为基准。以前这里用 `?? R.emptyIndex()` 兜底，
      // 一旦 index 尚未加载完就此操作，等于拿一个空清单去覆盖 index.json，
      // 书架上原有的书会被一次性清空 —— 宁可让用户等一秒重试。
      const prevIndex = indexRef.current
      if (!prevIndex) {
        toast.error('数据还没加载完，请稍候重试')
        return null
      }
      const nextIndex = R.indexUpsert(prevIndex, novel)

      mutateGen.current += 1
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
    async (id: string): Promise<boolean> => {
      const prev = novelsRef.current[id]
      const prevIndex = indexRef.current
      // 清单是书架的来源，也是「要不要删文件」的依据。拿不到就先别动手。
      if (!prevIndex) {
        toast.error('数据还没加载完，请稍候重试')
        return false
      }

      const summary = prevIndex.novels.find((n) => n.id === id)
      const title = prev?.title ?? summary?.title ?? id
      // 以清单里记录的 file 为准：手写或历史数据的文件名未必等于 novels/<id>.json。
      // 用 novelFile(id) 硬拼会指向一个不存在的路径，而 removeFile 对「文件不存在」
      // 是静默放行的 —— 于是显示「删除成功」，仓库里的文件却原封不动。
      const file = summary?.file || novelFile(id)
      const nextIndex = R.indexRemove(prevIndex, id)

      mutateGen.current += 1
      removeNovelLocal(id)
      setIndexLocal(nextIndex)

      try {
        await runCommit(
          [
            {
              path: repoPath(INDEX_FILE),
              content: stringifyJson(nextIndex),
              message: `chore(data): 小说清单移除《${title}》`,
            },
          ],
          [{ path: repoPath(file), message: `chore(data): 删除小说《${title}》` }]
        )
        return true
      } catch (e) {
        if (prev) setNovelLocal(prev)
        setIndexLocal(prevIndex)
        toast.error(`删除失败：${(e as Error).message}`)
        return false
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

  const reorderEntries = useCallback(
    async (novelId: string, moduleId: string, orderedIds: string[]) => {
      const novel = novelsRef.current[novelId]
      if (!novel) return
      const next = R.reorderEntries(novel, moduleId, orderedIds)
      // 顺序没变就不提交，避免留下一个什么都没改的 commit
      if (next === novel) return
      const label = novel.modules.find((m) => m.id === moduleId)?.entryLabel ?? '条目'
      await mutateNovel(next, `chore(data): 调整《${novel.title}》${label}顺序`, { prev: novel })
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
      reorderEntries,
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
      reorderEntries,
    ]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataApi {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData 必须在 DataProvider 内使用')
  return ctx
}
