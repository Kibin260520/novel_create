/**
 * 纯函数形式的增删改。
 * 全部返回新对象（结构共享），便于做「乐观更新 + 失败回滚」。
 */
import type { Novel, Module, Entry, FieldDef, NovelIndex, NovelSummary } from '@/types/data'
import { novelFile } from '@/lib/paths'

const now = () => new Date().toISOString()

export function touch(n: Novel): Novel {
  return { ...n, updatedAt: now() }
}

/* ---------------- 小说 ---------------- */

export function applyNovelPatch(n: Novel, patch: Partial<Novel>): Novel {
  return touch({ ...n, ...patch, id: n.id, modules: n.modules })
}

/* ---------------- 模块 ---------------- */

export function addModule(n: Novel, mod: Module): Novel {
  const order = n.modules.length
  return touch({ ...n, modules: [...n.modules, { ...mod, order }] })
}

export function patchModule(n: Novel, moduleId: string, patch: Partial<Module>): Novel {
  return touch({
    ...n,
    modules: n.modules.map((m) => (m.id === moduleId ? { ...m, ...patch, id: m.id } : m)),
  })
}

export function dropModule(n: Novel, moduleId: string): Novel {
  return touch({
    ...n,
    modules: n.modules.filter((m) => m.id !== moduleId).map((m, i) => ({ ...m, order: i })),
  })
}

export function setModuleFields(n: Novel, moduleId: string, fields: FieldDef[]): Novel {
  return patchModule(n, moduleId, {
    fields: fields.map((f, i) => ({ ...f, order: i })),
  })
}

export function moveModule(n: Novel, moduleId: string, delta: number): Novel {
  const list = [...n.modules].sort((a, b) => a.order - b.order)
  const i = list.findIndex((m) => m.id === moduleId)
  const j = i + delta
  if (i < 0 || j < 0 || j >= list.length) return n
  ;[list[i], list[j]] = [list[j], list[i]]
  return touch({ ...n, modules: list.map((m, idx) => ({ ...m, order: idx })) })
}

/* ---------------- 条目 ---------------- */

export function addEntry(n: Novel, moduleId: string, entry: Entry): Novel {
  return touch({
    ...n,
    modules: n.modules.map((m) =>
      m.id === moduleId
        ? { ...m, entries: [...m.entries, { ...entry, order: m.entries.length }] }
        : m
    ),
  })
}

export function patchEntry(
  n: Novel,
  moduleId: string,
  entryId: string,
  patch: Partial<Entry>
): Novel {
  return touch({
    ...n,
    modules: n.modules.map((m) =>
      m.id === moduleId
        ? {
            ...m,
            entries: m.entries.map((e) =>
              e.id === entryId ? { ...e, ...patch, id: e.id, updatedAt: now() } : e
            ),
          }
        : m
    ),
  })
}

export function dropEntry(n: Novel, moduleId: string, entryId: string): Novel {
  return touch({
    ...n,
    modules: n.modules.map((m) =>
      m.id === moduleId
        ? { ...m, entries: m.entries.filter((e) => e.id !== entryId).map((e, i) => ({ ...e, order: i })) }
        : m
    ),
  })
}

export function moveEntry(n: Novel, moduleId: string, entryId: string, delta: number): Novel {
  return touch({
    ...n,
    modules: n.modules.map((m) => {
      if (m.id !== moduleId) return m
      const list = [...m.entries].sort((a, b) => a.order - b.order)
      const i = list.findIndex((e) => e.id === entryId)
      const j = i + delta
      if (i < 0 || j < 0 || j >= list.length) return m
      ;[list[i], list[j]] = [list[j], list[i]]
      return { ...m, entries: list.map((e, idx) => ({ ...e, order: idx })) }
    }),
  })
}

/* ---------------- 首页清单 ---------------- */

export function toSummary(n: Novel): NovelSummary {
  return {
    id: n.id,
    title: n.title,
    author: n.author,
    cover: n.cover,
    summary: n.summary,
    tags: n.tags,
    file: novelFile(n.id),
  }
}

export function indexUpsert(index: NovelIndex, n: Novel): NovelIndex {
  const summary = toSummary(n)
  const exists = index.novels.some((x) => x.id === n.id)
  return {
    ...index,
    updatedAt: now(),
    novels: exists
      ? index.novels.map((x) => (x.id === n.id ? summary : x))
      : [...index.novels, summary],
  }
}

export function indexRemove(index: NovelIndex, id: string): NovelIndex {
  return { ...index, updatedAt: now(), novels: index.novels.filter((x) => x.id !== id) }
}

export function emptyIndex(): NovelIndex {
  return { schemaVersion: 1, updatedAt: now(), novels: [] }
}
