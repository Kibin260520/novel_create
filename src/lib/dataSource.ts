/**
 * 数据读取策略：优先 raw.githubusercontent.com（始终最新），
 * 失败则回退到打包进 public/data 的本地副本（离线 / 开发可用）。
 */
import type { GitHubConfig } from '@/types/github'
import type { Novel, NovelIndex, Module, Entry, FieldDef } from '@/types/data'
import { DATA_DIR, REPO_DATA_DIR } from './paths'

export type SourceKind = 'raw' | 'bundled'

export interface FetchResult<T> {
  data: T
  source: SourceKind
}

const BASE = import.meta.env.BASE_URL || '/'

function bundledUrl(path: string): string {
  return `${BASE}${DATA_DIR}/${path}`.replace(/([^:])\/\//g, '$1/')
}

function rawUrl(cfg: GitHubConfig, path: string, bust = false): string {
  const branch = cfg.branch || 'main'
  const url = `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${branch}/${REPO_DATA_DIR}/${path}`
  return bust ? `${url}?t=${Date.now()}` : url
}

async function tryFetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  return JSON.parse(text) as T
}

async function load<T>(
  cfg: GitHubConfig | null,
  path: string,
  bust: boolean
): Promise<FetchResult<T>> {
  const canRaw = !!(cfg && cfg.owner && cfg.repo)
  if (canRaw) {
    try {
      return { data: await tryFetchJson<T>(rawUrl(cfg!, path, bust)), source: 'raw' }
    } catch {
      // 静默回退
    }
  }
  return { data: await tryFetchJson<T>(bundledUrl(path)), source: 'bundled' }
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

/* ---------------------- 对外接口 ---------------------- */

export async function fetchIndex(
  cfg: GitHubConfig | null,
  bust = false
): Promise<FetchResult<NovelIndex>> {
  const r = await load<Partial<NovelIndex>>(cfg, 'index.json', bust)
  return { data: normalizeIndex(r.data), source: r.source }
}

export async function fetchNovel(
  cfg: GitHubConfig | null,
  file: string,
  fallbackId = '',
  bust = false
): Promise<FetchResult<Novel>> {
  const r = await load<Partial<Novel>>(cfg, file, bust)
  return { data: normalizeNovel(r.data, fallbackId), source: r.source }
}

/** 序列化：保持缩进，便于 git diff 阅读 */
export function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n'
}
