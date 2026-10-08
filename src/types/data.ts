/**
 * 核心数据模型
 * 三级实体：Novel（小说）→ Module（模块）→ Entry（条目）
 * 采用「元数据驱动」：模块自带字段说明书 fields，条目按说明书填 values。
 */

/** 字段控件类型 */
export type FieldType =
  | 'text' // 单行文本
  | 'textarea' // 多行文本
  | 'number' // 数字
  | 'select' // 下拉单选
  | 'tags' // 标签组
  | 'date' // 日期
  | 'url' // 链接
  | 'image' // 图片地址
  | 'ref' // 引用：指向同一本小说里另一个模块的条目

/** 字段定义（模块的「字段说明书」） */
export interface FieldDef {
  /** 稳定标识，存储用。创建后不要随意修改 */
  key: string
  /** 展示名，如「阵营」 */
  label: string
  type: FieldType
  required?: boolean
  /** type = select 时的候选值 */
  options?: string[]
  placeholder?: string
  order: number
  /**
   * type = 'ref' 时：被引用的模块 id（必须是同一本小说内的模块）。
   * 引用值存在 values[key] 里，单值为条目 id 字符串，多值为条目 id 数组。
   */
  refModuleId?: string
  /** type = 'ref' 时：是否允许引用多个条目 */
  multiple?: boolean
}

/** 图标引用：内置图标 或 用户自定义 SVG */
export interface IconRef {
  type: 'builtin' | 'svg'
  /** type = builtin 时，对应内置图标键名 */
  name?: string
  /** type = svg 时，存放清洗后的 SVG 字符串 */
  svg?: string
}

/** 条目（如一个角色、一个势力） */
export interface Entry {
  id: string
  createdAt: string
  updatedAt: string
  /** 键 = FieldDef.key */
  values: Record<string, unknown>
  /** 自由备注 / 描述 */
  notes?: string
  tags?: string[]
  order: number
}

/** 模块（如「角色」「势力」） */
export interface Module {
  id: string
  name: string
  description?: string
  icon: IconRef
  /** 模块主题色 */
  color?: string
  /** 该模块条目的称呼，如「角色」「势力」 */
  entryLabel?: string
  /** 条目字段定义，可自定义增删 */
  fields: FieldDef[]
  entries: Entry[]
  order: number
}

/** 小说 */
export interface Novel {
  id: string
  schemaVersion: number
  title: string
  author?: string
  cover?: string
  tags?: string[]
  summary?: string
  createdAt: string
  updatedAt: string
  modules: Module[]
}

/** 首页清单中的小说摘要 */
export interface NovelSummary {
  id: string
  title: string
  author?: string
  cover?: string
  summary?: string
  tags?: string[]
  /** 相对 data/ 的路径，如 novels/novel-demo-1.json */
  file: string
}

/** data/index.json */
export interface NovelIndex {
  schemaVersion: number
  updatedAt: string
  novels: NovelSummary[]
}

/** 新建 / 编辑用的输入类型 */
export type NovelDraft = Pick<Novel, 'title'> &
  Partial<Pick<Novel, 'author' | 'summary' | 'cover' | 'tags'>>

export type ModuleDraft = Pick<Module, 'name'> &
  Partial<Pick<Module, 'description' | 'icon' | 'color' | 'entryLabel' | 'fields'>>

export type EntryDraft = Partial<Pick<Entry, 'notes' | 'tags'>> & {
  values?: Record<string, unknown>
}
