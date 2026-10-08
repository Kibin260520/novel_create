import { UiIcon } from '@/components/icons/UiIcon'
import { entryName, findModule, guessRefMatches, refIdsOf, resolveRef } from '@/lib/refs'
import { valueToText } from '@/lib/format'
import type { FieldDef, Novel } from '@/types/data'

interface Props {
  field: FieldDef
  value: unknown
  onChange: (v: unknown) => void
  /** 用于解析被引用的条目，必须传当前所在的小说 */
  novel?: Novel
}

/**
 * 引用字段的输入控件。
 *
 * 三种情况都要照顾到：
 * 1) 已正常引用 → 显示为带删除的标签
 * 2) 旧数据是纯文本（如「青云宗（外门 → 内门）」）→ 显示为「待匹配」，
 *    并在目标模块里找名字对得上的条目，给一键转成引用
 * 3) 还没配置引用模块 / 模块被删了 → 提示并退回纯文本输入，不让人卡住
 */
export function RefFieldInput({ field, value, onChange, novel }: Props) {
  const target = findModule(novel, field.refModuleId ?? '')
  const label = target?.entryLabel || target?.name || '条目'

  if (!field.refModuleId || !target) {
    return (
      <div className="stack gap-2">
        <div className="notice is-info">
          <UiIcon name="info" size={18} />
          <div>
            这个「引用」字段还没有指定要引用哪个模块
            {field.refModuleId ? '（原来引用的模块可能已被删除）' : ''}，
            请到模块的「编辑」里选一个模块。
          </div>
        </div>
        <input
          className="input"
          value={valueToText(value)}
          placeholder="也可以先当普通文本填写"
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    )
  }

  const resolved = refIdsOf(value).map((id) => ({ id, ref: resolveRef(novel, field.refModuleId, id) }))
  const picked = resolved.filter((x) => x.ref!).map((x) => x.id)
  const legacy = resolved.filter((x) => !x.ref)
  const available = target.entries.filter((e) => !picked.includes(e.id))

  const setIds = (ids: string[]) => onChange(field.multiple ? ids : (ids[0] ?? ''))

  return (
    <div className="stack gap-2">
      {picked.length > 0 && (
        <div className="row gap-2 wrap">
          {picked.map((id) => {
            const ref = resolveRef(novel, field.refModuleId, id)!
            return (
              <span className="ref-chip" key={id}>
                <UiIcon name="link" size={13} />
                <span>{ref.label}</span>
                <button
                  type="button"
                  className="ref-chip-x"
                  title="取消这条引用"
                  onClick={() => setIds(picked.filter((x) => x !== id))}
                >
                  <UiIcon name="close" size={13} />
                </button>
              </span>
            )
          })}
        </div>
      )}

      {legacy.map(({ id }) => {
        const guesses = guessRefMatches(novel, field.refModuleId, id)
        return (
          <div className="ref-legacy" key={id}>
            <div className="row gap-2 wrap">
              <UiIcon name="alert" size={15} />
              <span>
                旧文本：<strong>{id}</strong>
              </span>
            </div>
            <div className="row gap-2 wrap" style={{ marginTop: 6 }}>
              {guesses.length > 0 ? (
                <>
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    匹配到：
                  </span>
                  {guesses.map((g) => (
                    <button
                      type="button"
                      key={g.entryId}
                      className="btn btn-sm"
                      onClick={() => setIds([...picked, g.entryId])}
                    >
                      <UiIcon name="link" size={13} /> 转为引用「{g.label}」
                    </button>
                  ))}
                </>
              ) : (
                <span className="muted" style={{ fontSize: 12.5 }}>
                  在「{target.name}」里没找到名字能对上的条目，可以直接保留为文本，或手动选一个。
                </span>
              )}
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  if (field.multiple) setIds(resolved.filter((x) => x.id !== id).map((x) => x.id))
                  else onChange('')
                }}
              >
                清除
              </button>
            </div>
          </div>
        )
      })}

      {(field.multiple || picked.length === 0) && (
        <select
          className="select"
          value=""
          onChange={(e) => e.target.value && setIds([...picked, e.target.value])}
        >
          <option value="">— 选择{label} —</option>
          {available.map((e) => (
            <option key={e.id} value={e.id}>
              {entryName(target, e)}
            </option>
          ))}
        </select>
      )}

      {target.entries.length === 0 && (
        <span className="field-hint">
          「{target.name}」里还没有{label}，先去那边添加，这里才能引用。
        </span>
      )}
      {field.multiple && picked.length > 1 && (
        <span className="field-hint">已引用 {picked.length} 条，可继续添加或点标签上的 × 取消。</span>
      )}
    </div>
  )
}
