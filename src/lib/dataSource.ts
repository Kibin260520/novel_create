/**
 * 数据读取策略：stale-while-revalidate（先用旧数据渲染，再后台刷新）。
 *
 * 站点是纯静态的，数据只有两个来源：
 *  - 「本地副本」：`public/data/` 被打包进构建产物，随网站一起下载，毫秒级可得；
 *  - 「远端」：raw.githubusercontent.com，永远最新，但国内经常连不上
 *    ——实测要 20 秒以上才失败。
 *
 * 旧策略是「先远端、失败再回落本地」，于是首屏要干等远端超时后才出内容，
 * 在国内基本等于不可用。现在倒过来：**先用本地副本立刻渲染，后台再拉远端覆盖**。
 *
 * 这里有一条不能破的规矩：**只往「更新」的方向走**。
 * 远端拿不到就保留本地数据，绝不因为远端不可达而把数据换成更旧的副本，
 * 否则就会出现「刚提交的内容一刷新又不见了」——那正是登录门槛想消灭的问题。
 */
import type { GitHubConfig } from '@/types/github'
import type { Novel, NovelIndex, Module, Entry, FieldDef } from '@/types/data'
import { DATA_DIR, REPO_DATA_DIR } from './paths'

export type SourceKind = 'raw' | 'bundled' | 'cache'

/** 远端拉取的超时上限。后台刷新不阻塞渲染，超时只是放弃这次刷新。 */
const RAW_TIMEOUT_MS = 20000

const BASE = import.meta.env.BASE_URL || '/'

function bundledUrl(path: string): string {
  return `${BASE}${DATA_DIR}/${path}`.replace(/([^:])\/\//g, '$1/')
}

function rawUrl(cfg: GitHubConfig, path: string, bust = false): string {
  const branch = cfg.branch || 'main'
  const url = `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${branch}/${REPO_DATA_DIR}/${path}`
  return bust ? `${url}?t=${Date.now()}` : url
}

async function tryFetchJson<T>(url: string, timeoutMs = 0): Promise<T> {
  const ctrl = timeoutMs > 0 ? new AbortController() : null
  const timer = ctrl ? window.setTimeout(() => ctrl.abort(), timeoutMs) : undefined
  try {
    const res = await fetch(url, { cache: 'no-cache', signal: ctrl?.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    return JSON.parse(text) as T
  } finally {
    if (timer !== undefined) window.clearTimeout(timer)
  }
}

/* ---------------------- 归一化（容错旧数据 / 手写 JSON） ---------------------- */

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

function normField(f: Partial<FieldDef>, i: number): FieldDef {
  return {
    key: f.key || `field_${i}`,
    label: f.label || f.key || `字段 ${i + 1}`,
    type: (f.type as FieldDef['type']) || 'text',
    required: !!f.required,
    options: asArray<string>(f.options),
    placeholder: f.placeholder,
    order: typeof f.order === 'number' ? f.order : i,
    // 引用字段的配置必须原样保留。少了这两项，数据从远端读回来时
    // 关联关系会被静默抹掉（缓存路径不归一化，所以只在真实加载时暴露）。
    refModuleId: f.refModuleId,
    multiple: f.multiple ? true : undefined,
  }
}

function normEntry(e: Partial<Entry>, i: number): Entry {
  return {
    id: e.id || `ent_${i}`,
    createdAt: e.createdAt || new Date().toISOString(),
    updatedAt: e.updatedAt || e.createdAt || new Date().toISOString(),
    values: (e.values as Record<string, unknown>) || {},
    notes: e.notes || '',
    tags: asArray<string>(e.tags),
    order: typeof e.order === 'number' ? e.order : i,
  }
}

function normModule(m: Partial<Module>, i: number): Module {
  return {
    id: m.id || `mod_${i}`,
    name: m.name || `模块 ${i + 1}`,
    description: m.description || '',
    icon: m.icon && m.icon.type ? m.icon : { type: 'builtin', name: 'layers' },
    color: m.color || '#6366f1',
    entryLabel: m.entryLabel || m.name || '条目',
    fields: asArray<Partial<FieldDef>>(m.fields)
      .map(normField)
      .sort((a, b) => a.order - b.order),
    entries: asArray<Partial<Entry>>(m.entries)
      .map(normEntry)
      .sort((a, b) => a.order - b.order),
    order: typeof m.order === 'number' ? m.order : i,
  }
}

export function normalizeNovel(raw: Partial<Novel>, fallbackId = ''): Novel {
  const now = new Date().toISOString()
  return {
    id: raw.id || fallbackId || 'novel_unknown',
    schemaVersion: raw.schemaVersion ?? 1,
    title: raw.title || '未命名小说',
    author: raw.author || '',
    cover: raw.cover || '',
    tags: asArray<string>(raw.tags),
    summary: raw.summary || '',
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
    modules: asArray<Partial<Module>>(raw.modules)
      .map(normModule)
      .sort((a, b) => a.order - b.order),
  }
}

export function normalizeIndex(raw: Partial<NovelIndex>): NovelIndex {
  return {
    schemaVersion: raw.schemaVersion ?? 1,
    updatedAt: raw.updatedAt || new Date().toISOString(),
    novels: asArray<NovelIndex['novels'][number]>(raw.novels).map((n) => ({
      id: n.id,
      title: n.title || '未命名小说',
      author: n.author || '',
      cover: n.cover || '',
      summary: n.summary || '',
      tags: asArray<string>(n.tags),
      file: n.file || `novels/${n.id}.json`,
    })),
  }
}

/* ---------------------- 本地副本（打包进产物，瞬时可得） ---------------------- */

/**
 * 读打包副本。**读不到就返回 null，不抛错** —— 调用方需要区分
 * 「本地没有」与「本地有但是空的」，前者要去等远端。
 */
async function readBundled<T>(path: string): Promise<T | null> {
  try {
    return await tryFetchJson<T>(bundledUrl(path))
  } catch {
    return null
  }
}

export async function readBundledIndex(): Promise<NovelIndex | null> {
  const raw = await readBundled<Partial<NovelIndex>>('index.json')
  return raw ? normalizeIndex(raw) : null
}

export async function readBundledNovel(file: string, fallbackId = ''): Promise<Novel | null> {
  const raw = await readBundled<Partial<Novel>>(file)
  return raw ? normalizeNovel(raw, fallbackId) : null
}

/* ---------------------- 远端（最新，但可能不可达） ---------------------- */

export async function readRawIndex(cfg: GitHubConfig, bust = false): Promise<NovelIndex> {
  const raw = await tryFetchJson<Partial<NovelIndex>>(
    rawUrl(cfg, 'index.json', bust),
    RAW_TIMEOUT_MS
  )
  return normalizeIndex(raw)
}

export async function readRawNovel(
  cfg: GitHubConfig,
  file: string,
  fallbackId = '',
  bust = false
): Promise<Novel> {
  const raw = await tryFetchJson<Partial<Novel>>(
    rawUrl(cfg, file, bust),
    RAW_TIMEOUT_MS
  )
  return normalizeNovel(raw, fallbackId)
}

/** 序列化：保持缩进，便于 git diff 阅读 */
export function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n'
}
