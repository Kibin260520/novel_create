import { useEffect, useRef, useState } from 'react'
import { UiIcon } from '@/components/icons/UiIcon'
import { KEYS, readSessionJSON, removeSessionKey, writeSessionJSON } from '@/lib/storage'
import type { SourceKind } from '@/lib/dataSource'

interface Props {
  /** 当前数据来源。只有 cache / bundled（都没走到远端）时才需要提醒 */
  source: SourceKind | null
  /** 决定文案：书架清单还是单本小说 */
  scope?: 'index' | 'novel'
  busy?: boolean
  onRefresh: () => void
}

/**
 * 顶部「数据可能不是最新」横幅。
 *
 * 仿 GitHub / Notion / Ant Design Alert(banner) 的做法：不常驻，
 * 只在**确实没拿到远端数据**（source 是 cache 或 bundled）时出现，
 * 数据追上远端后自己消失。所以它不会变成一块永远挂在那儿的装饰。
 *
 * 关掉只在本次会话生效（sessionStorage）：下次打开页面如果数据还是旧的，
 * 仍然要提醒 —— 这种提示不该被永久静音。
 */
export function StaleBanner({ source, scope = 'index', busy = false, onRefresh }: Props) {
  const stale = source === 'cache' || source === 'bundled'
  const [dismissed, setDismissed] = useState(() => !!readSessionJSON(KEYS.staleDismissed, false))
  /**
   * 延迟一点再露面：打开页面时先读本机缓存（source=cache），远端往往紧接着就回来了。
   * 立刻渲染会闪一下又消失，比不提示还难受。
   */
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!stale) {
      setArmed(false)
      return
    }
    const t = window.setTimeout(() => setArmed(true), 700)
    return () => window.clearTimeout(t)
  }, [stale])

  // 数据已经追上远端：顺手把「本次已忽略」清掉，
  // 否则下次再落后时这条提示就再也不出现了。
  // 注意必须先「见过落后」再清 —— 页面刚打开时 source 还是 null，
  // 那时候清会把刚关掉的标记误删，等于关不掉。
  const seenStale = useRef(false)
  useEffect(() => {
    if (stale) {
      seenStale.current = true
      return
    }
    if (seenStale.current && dismissed) {
      removeSessionKey(KEYS.staleDismissed)
      setDismissed(false)
    }
  }, [stale, dismissed])

  if (!stale || !armed || dismissed || !source) return null

  const where = scope === 'novel' ? '这本书' : '书架'
  const from = source === 'bundled' ? '项目内置副本' : '本机缓存'

  return (
    <div className="stale-banner" role="status" aria-live="polite">
      <span className="stale-icon">
        <UiIcon name="cloudOff" size={17} />
      </span>

      <div className="stale-text">
        <strong>
          {where}现在显示的是{from}
        </strong>
        <span>可能不是仓库里的最新内容。刚在别的设备上改过？拉一次就好。</span>
      </div>

      <button className="stale-action" type="button" onClick={onRefresh} disabled={busy}>
        <UiIcon
          name={busy ? 'loader' : 'refresh'}
          size={15}
          className={busy ? 'spin' : undefined}
        />
        {busy ? '拉取中…' : '立即刷新'}
      </button>

      <button
        className="stale-close"
        type="button"
        title="本次会话不再提示"
        aria-label="本次会话不再提示"
        onClick={() => {
          writeSessionJSON(KEYS.staleDismissed, true)
          setDismissed(true)
        }}
      >
        <UiIcon name="close" size={14} />
      </button>
    </div>
  )
}
