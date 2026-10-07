/**
 * 新建小说时预置的默认模块。
 * 用户可以随时用「+」新增模块，也可以删除这些预置模块。
 */
import type { Module, FieldDef } from '@/types/data'
import { newModuleId } from './id'

interface FieldTpl {
  key: string
  label: string
  type: FieldDef['type']
  required?: boolean
  options?: string[]
  placeholder?: string
}

interface ModuleTpl {
  name: string
  entryLabel: string
  icon: string
  color: string
  description: string
  fields: FieldTpl[]
}

export const DEFAULT_MODULE_TEMPLATES: ModuleTpl[] = [
  {
    name: '设定',
    entryLabel: '设定',
    icon: 'book',
    color: '#6366f1',
    description: '世界规则、力量体系、背景设定',
    fields: [
      { key: 'name', label: '名称', type: 'text', required: true, placeholder: '如：灵气修炼体系' },
      {
        key: 'category',
        label: '类别',
        type: 'select',
        options: ['世界观', '力量体系', '规则', '背景', '其他'],
      },
      { key: 'detail', label: '详情', type: 'textarea', placeholder: '展开描述这条设定…' },
    ],
  },
  {
    name: '势力',
    entryLabel: '势力',
    icon: 'shield',
    color: '#e5484d',
    description: '门派、组织、国家、阵营',
    fields: [
      { key: 'name', label: '名称', type: 'text', required: true, placeholder: '如：青云宗' },
      {
        key: 'type',
        label: '类型',
        type: 'select',
        options: ['宗门', '家族', '王朝', '组织', '异族', '其他'],
      },
      { key: 'leader', label: '首领', type: 'text' },
      { key: 'stance', label: '立场', type: 'text', placeholder: '如：正道 / 中立 / 魔道' },
      { key: 'intro', label: '简介', type: 'textarea' },
    ],
  },
  {
    name: '灵感',
    entryLabel: '灵感',
    icon: 'sparkles',
    color: '#f5a524',
    description: '零散的点子、桥段、画面',
    fields: [
      { key: 'idea', label: '灵感内容', type: 'textarea', required: true, placeholder: '随手记下的一个念头…' },
      { key: 'source', label: '来源', type: 'text', placeholder: '梦 / 读书 / 音乐 / 生活' },
      { key: 'tags', label: '关键词', type: 'tags' },
    ],
  },
  {
    name: '技能名',
    entryLabel: '技能',
    icon: 'sword',
    color: '#10a37f',
    description: '功法、招式、术法名称',
    fields: [
      { key: 'name', label: '名称', type: 'text', required: true, placeholder: '如：寒江独钓' },
      {
        key: 'category',
        label: '类别',
        type: 'select',
        options: ['攻击', '防御', '身法', '辅助', '禁忌', '被动'],
      },
      {
        key: 'rank',
        label: '品阶',
        type: 'select',
        options: ['凡阶', '灵阶', '玄阶', '天阶', '神阶'],
      },
      { key: 'effect', label: '效果', type: 'textarea' },
    ],
  },
  {
    name: '角色',
    entryLabel: '角色',
    icon: 'user',
    color: '#8b5cf6',
    description: '主角、配角、反派',
    fields: [
      { key: 'name', label: '姓名', type: 'text', required: true, placeholder: '如：林砚' },
      { key: 'alias', label: '别称', type: 'text', placeholder: '道号 / 外号' },
      { key: 'gender', label: '性别', type: 'select', options: ['男', '女', '其他'] },
      { key: 'faction', label: '所属势力', type: 'text' },
      { key: 'rank', label: '境界 / 等级', type: 'text' },
      { key: 'intro', label: '简介', type: 'textarea' },
    ],
  },
  {
    name: '情节',
    entryLabel: '情节',
    icon: 'book-open',
    color: '#b06cf0',
    description: '剧情节点、转折、伏笔',
    fields: [
      { key: 'title', label: '标题', type: 'text', required: true },
      {
        key: 'stage',
        label: '阶段',
        type: 'select',
        options: ['开端', '发展', '转折', '高潮', '结局', '伏笔'],
      },
      { key: 'outline', label: '概要', type: 'textarea' },
    ],
  },
  {
    name: '地点',
    entryLabel: '地点',
    icon: 'map',
    color: '#0ea5e9',
    description: '地理、城市、秘境',
    fields: [
      { key: 'name', label: '名称', type: 'text', required: true },
      {
        key: 'type',
        label: '类型',
        type: 'select',
        options: ['城池', '山川', '秘境', '遗迹', '异界', '其他'],
      },
      { key: 'owner', label: '归属', type: 'text' },
      { key: 'desc', label: '描述', type: 'textarea' },
    ],
  },
  {
    name: '道具',
    entryLabel: '道具',
    icon: 'package',
    color: '#f97316',
    description: '法宝、兵器、丹药、信物',
    fields: [
      { key: 'name', label: '名称', type: 'text', required: true },
      {
        key: 'category',
        label: '类别',
        type: 'select',
        options: ['兵器', '法宝', '丹药', '信物', '材料', '其他'],
      },
      { key: 'rank', label: '品阶', type: 'select', options: ['凡品', '灵品', '玄品', '天品', '神品'] },
      { key: 'note', label: '说明', type: 'textarea' },
    ],
  },
  {
    name: '时间线',
    entryLabel: '事件',
    icon: 'clock',
    color: '#64748b',
    description: '大事记、历史年表',
    fields: [
      { key: 'event', label: '事件', type: 'text', required: true },
      { key: 'time', label: '时间点', type: 'text', placeholder: '如：青冥历 328 年' },
      { key: 'cast', label: '关联角色', type: 'text' },
      { key: 'brief', label: '简述', type: 'textarea' },
    ],
  },
]

/** 生成一套全新的默认模块（带新 id） */
export function createDefaultModules(): Module[] {
  return DEFAULT_MODULE_TEMPLATES.map((tpl, i) => ({
    id: newModuleId(),
    name: tpl.name,
    entryLabel: tpl.entryLabel,
    description: tpl.description,
    icon: { type: 'builtin' as const, name: tpl.icon },
    color: tpl.color,
    fields: tpl.fields.map((f, fi) => ({ ...f, order: fi }) as FieldDef),
    entries: [],
    order: i,
  }))
}

/** 一个空模块（用户手动新增模块时的起点） */
export function createEmptyModule(name = '新模块'): Module {
  return {
    id: newModuleId(),
    name,
    entryLabel: name,
    description: '',
    icon: { type: 'builtin', name: 'layers' },
    color: '#6366f1',
    fields: [
      { key: 'name', label: '名称', type: 'text', required: true, order: 0 },
      { key: 'note', label: '说明', type: 'textarea', order: 1 },
    ],
    entries: [],
    order: 0,
  }
}
