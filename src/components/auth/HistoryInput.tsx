import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { UiIcon } from '@/components/icons/UiIcon'

/** 一条可选的登录历史 */
export interface LoginSuggestion {
  /** 唯一键，用于 aria 与 React key */
  key: string
  /** 主文本（用户名或仓库名） */
  label: string
  /** 右侧辅助说明，如「3 个仓库」「main 分支」 */
  hint?: string
  owner: string
  repo: string
  branch: string
}

interface Props {
  value: string
  placeholder: string
  suggestions: LoginSuggestion[]
  onChange: (value: string) => void
  /** 选中某条历史 */
  onPick: (s: LoginSuggestion) => void
  /** 传入时才显示行尾的删除按钮 */
  onRemove?: (s: LoginSuggestion) => void
}

/**
 * 带历史候选的文本输入框。
 *
 * 行为对齐浏览器原生的输入建议：聚焦即展开、输入即过滤、
 * ↑↓ 移动高亮、Enter 选中、Esc 关闭、点空白处收起。
 *
 * 两个容易踩的点都在这里处理掉了：
 * 1. 候选项用 `onMouseDown` 阻止默认行为，否则 input 先失焦、
 *    blur 触发收起，click 根本到不了候选项上；
 * 2. 高亮索引可能因为过滤而越界，渲染前夹一次，避免 undefined 取值。
 */
export function HistoryInput({
  value,
  placeholder,
  suggestions,
  onChange,
  onPick,
  onRemove,
}: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const hasOptions = suggestions.length > 0
  const showList = open && hasOptions
  const activeIndex = Math.min(active, Math.max(0, suggestions.length - 1))

  // 点击外部收起
  useEffect(() => {
    if (!showList) return
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [showList])

  const pick = (s: LoginSuggestion) => {
    onPick(s)
    setOpen(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!showList) {
      // 没展开时，↓ 用来唤出候选
      if (e.key === 'ArrowDown' && hasOptions) {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter') {
      // 有候选时 Enter 是「选中」，不能让它把表单提交出去
      const s = suggestions[activeIndex]
      if (s) {
        e.preventDefault()
        pick(s)
      }
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div
      ref={boxRef}
      className={`combo${showList ? ' is-open' : ''}${hasOptions ? ' has-toggle' : ''}`}
    >
      <input
        className="input"
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList ? `${listId}-${activeIndex}` : undefined}
        onChange={(e) => {
          onChange(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {hasOptions && (
        <button
          type="button"
          className="combo-toggle"
          tabIndex={-1}
          aria-label={showList ? '收起历史记录' : '展开历史记录'}
          // 别让按钮抢走 input 的焦点，否则下拉刚开就因 blur 关掉
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen((v) => !v)}
        >
          <UiIcon name="chevronDown" size={14} />
        </button>
      )}

      {showList && (
        <div className="combo-pop" role="listbox" id={listId} aria-label="最近使用过的仓库">
          <div className="combo-head">最近登录</div>
          {suggestions.map((s, i) => (
            <div
              key={s.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={`combo-item${i === activeIndex ? ' is-active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(s)}
            >
              <span className="combo-label">{s.label}</span>
              {s.hint && <span className="combo-hint">{s.hint}</span>}
              {onRemove && (
                <button
                  type="button"
                  className="combo-del"
                  tabIndex={-1}
                  aria-label={`删除 ${s.label} 这条记录`}
                  title="从历史里删除"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(s)
                  }}
                >
                  <UiIcon name="close" size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
