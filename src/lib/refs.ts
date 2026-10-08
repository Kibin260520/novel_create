/**
 * 引用（关联关系）解析工具。
 *
 * 设计要点：
 * - 引用值只存**条目 id**（`string` 或 `string[]`），不存名字。
 *   这样改名后关联不会断，也不会出现两处名字不一致。
 * - 旧数据里这些字段可能是随手写的纯文本（如「青云宗（外门 → 内门）」），
 *   解析不出来就原样当文本显示，不丢内容、不报错。
 */

import { valueToText } from './format'
import type { Entry, Module, Novel } from '@/types/data'

/** 条目的显示名：优先用常见主字段，兜底用第一个填了内容的字段 */
export function entryName(module: Module | undefined, entry: Entry | undefined): string {
  if (!entry) return ''
  const v = entry.values
  const preferred = ['name', 'title', 'event', 'label', 'idea']
  for (const k of preferred) {
    const text = valueToText(v[k]).trim()
    if (text) return text
  }
  for (const f of [...(module?.fields ?? [])].sort((a, b) => a.order - b.order)) {
    if (f.type === 'ref') continue
    const text = valueToText(v[f.key]).trim()
    if (text) return text
  }
  return entry.id
}

/** 把引用字段的值统一成 id 数组 */
export function refIdsOf(value: unknown): string[] {
  if (value == null) return []
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  const s = String(value).trim()
  return s ? [s] : []
}

export function findModule(novel: Novel | undefined, moduleId: string): Module | undefined {
  return novel?.modules.find((m) => m.id === moduleId)
}

export interface ResolvedRef {
  moduleId: string
  entryId: string
  moduleName: string
  label: string
}

/**
 * 把一个引用值解析成可展示的引用。
 * 找不到对应条目时返回 null —— 调用方据此退回「当纯文本显示」。
 */
export function resolveRef(
  novel: Novel | undefined,
  moduleId: string | undefined,
  entryId: string
): ResolvedRef | null {
  if (!novel || !moduleId) return null
  const mod = findModule(novel, moduleId)
  const entry = mod?.entries.find((e) => e.id === entryId)
  if (!mod || !entry) return null
  return {
    moduleId: mod.id,
    entryId: entry.id,
    moduleName: mod.name,
    label: entryName(mod, entry),
  }
}

/** 字段值的完整展示文本（引用字段解析成名字，其余走 valueToText） */
export function displayValue(
  novel: Novel | undefined,
  field: { key: string; type: string; refModuleId?: string },
  value: unknown
): string {
  if (field.type !== 'ref') return valueToText(value)
  const parts = refIdsOf(value).map(
    (id) => resolveRef(novel, field.refModuleId, id)?.label ?? id
  )
  return parts.join('、')
}

export interface Backlink {
  moduleId: string
  moduleName: string
  entryId: string
  entryLabel: string
  /** 通过哪个字段引用的 */
  fieldLabel: string
}

/**
 * 反向索引：扫描整本小说，找出所有引用了「目标条目」的条目。
 * 数据量是「一本小说的全部条目」，量级很小，直接扫即可。
 */
export function collectBacklinks(
  novel: Novel | undefined,
  targetModuleId: string,
  targetEntryId: string
): Backlink[] {
  if (!novel) return []
  const out: Backlink[] = []
  for (const mod of novel.modules) {
    const refFields = mod.fields.filter((f) => f.type === 'ref' && f.refModuleId === targetModuleId)
    if (!refFields.length) continue
    for (const entry of mod.entries) {
      for (const f of refFields) {
        if (refIdsOf(entry.values[f.key]).includes(targetEntryId)) {
          out.push({
            moduleId: mod.id,
            moduleName: mod.name,
            entryId: entry.id,
            entryLabel: entryName(mod, entry),
            fieldLabel: f.label,
          })
          break // 同一个条目通过多个字段引用，只列一次
        }
      }
    }
  }
  return out
}

/**
 * 旧文本转引用时的候选推荐。
 * 场景：字段以前是纯文本，值写着「青云宗（外门 → 内门）」，
 * 现在改成引用字段后，把目标模块里名字出现在这段文本中的条目推荐出来。
 */
export function guessRefMatches(
  novel: Novel | undefined,
  targetModuleId: string | undefined,
  text: string
): ResolvedRef[] {
  const mod = findModule(novel, targetModuleId ?? '')
  const hay = text.trim()
  if (!mod || !hay) return []
  return mod.entries
    .map((e) => ({ entry: e, label: entryName(mod, e) }))
    .filter((x) => x.label.length >= 2 && hay.includes(x.label))
    .map((x) => ({
      moduleId: mod.id,
      entryId: x.entry.id,
      moduleName: mod.name,
      label: x.label,
    }))
}
