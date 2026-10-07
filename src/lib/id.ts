import { nanoid } from 'nanoid'

/** 生成实体 ID，带语义前缀，便于阅读 git diff */
export function makeId(prefix: string): string {
  return `${prefix}_${nanoid(10)}`
}

export const newNovelId = () => makeId('novel')
export const newModuleId = () => makeId('mod')
export const newEntryId = () => makeId('ent')
export const newFieldKey = () => makeId('f')
