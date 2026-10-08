import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

/**
 * 网格拖拽排序容器。
 *
 * 用指针事件手写，不引第三方库：
 * - 拖动中的卡片用 transform 跟着指针走；
 * - 其余卡片用 FLIP 平滑让位（Web Animations API，只动合成层，不触发重排动画）；
 * - 拖到视口上下边缘会自动滚动，方便把卡片挪到屏幕外；
 * - **松手才提交一次**，拖动过程中只改本地顺序，不会产生一串 commit。
 *
 * 一个坑值得记一笔：算「插到第几个」时必须用**去掉动画位移后的布局位置**。
 * 卡片正在播 FLIP 动画时 getBoundingClientRect 拿到的是动画中的位置，
 * 直接拿来比较会让插入点在动画期间来回抖。所以统一减去当前生效的 transform。
 */

/** 超过这个位移才认为是在拖，而不是手抖点了一下 */
const DRAG_THRESHOLD = 5
/** 让位动画时长 */
const FLIP_MS = 220
/** 距离视口上下边缘多少像素开始自动滚动 */
const EDGE = 96
/** 自动滚动单帧最大位移 */
const EDGE_MAX_STEP = 28

/** 读元素当前生效的位移（transform 矩阵里的 e / f），用于从 rect 反推布局位置 */
function currentTranslate(el: HTMLElement): { x: number; y: number } {
  const t = getComputedStyle(el).transform
  if (!t || t === 'none') return { x: 0, y: 0 }
  const m = t.match(/matrix(3d)?\(([^)]+)\)/)
  if (!m) return { x: 0, y: 0 }
  const n = m[2].split(',').map(Number)
  return m[1] ? { x: n[12], y: n[13] } : { x: n[4], y: n[5] }
}

export interface SortableHandleProps {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
}

export interface SortableItemCtx {
  index: number
  total: number
  isDragging: boolean
  handleProps: SortableHandleProps
  moveUp: () => void
  moveDown: () => void
}

interface Props {
  /** 当前的 id 顺序（来自数据） */
  ids: string[]
  /** 拖拽结束 / 点击上移下移时回调，参数是最终顺序 */
  onReorder: (nextIds: string[]) => void
  /** 关闭时只是普通网格，不响应拖动 */
  enabled: boolean
  className?: string
  renderItem: (id: string, ctx: SortableItemCtx) => ReactNode
  /** 网格末尾不参与排序的内容，例如「＋」新增卡片 */
  footer?: ReactNode
}

export function SortableGrid({
  ids,
  onReorder,
  enabled,
  className = 'grid',
  renderItem,
  footer,
}: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [order, setOrder] = useState<string[]>(ids)
  const [dragId, setDragId] = useState<string | null>(null)

  const orderRef = useRef(order)
  orderRef.current = order

  const drag = useRef<{
    id: string
    startX: number
    startY: number
    /** 起拖时卡片的布局位置，用于换算位移 */
    baseLeft: number
    baseTop: number
    el: HTMLElement
    moved: boolean
  } | null>(null)
  const pointer = useRef({ x: 0, y: 0 })
  /** 上一次记录的各卡片布局位置，FLIP 用 */
  const rects = useRef(new Map<string, { left: number; top: number }>())
  const rafId = useRef(0)
  const detach = useRef<(() => void) | null>(null)

  // 不在拖动时，顺序始终以数据为准（提交回滚、别处新增条目都能正确反映）
  useEffect(() => {
    if (!dragId) setOrder(ids)
  }, [ids, dragId])

  const itemEls = useCallback(
    () => Array.from(gridRef.current?.querySelectorAll<HTMLElement>('[data-sort-id]') ?? []),
    []
  )

  /** 元素当前的布局矩形：剔除我们为做动画而加的位移 */
  const layoutRect = (el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const t = currentTranslate(el)
    return {
      left: r.left - t.x,
      top: r.top - t.y,
      right: r.right - t.x,
      bottom: r.bottom - t.y,
    }
  }

  /**
   * 把卡片钉在指针下面。
   * 用 offsetLeft / offsetTop 的差值算位移，而不是 rect：布局位置是 transform 无关的，
   * 卡片被换到别的格子后这一差值自动把它拉回指针处，不会跳。
   */
  const pinToPointer = useCallback(() => {
    const d = drag.current
    if (!d) return
    const tx = d.baseLeft + (pointer.current.x - d.startX) - d.el.offsetLeft
    const ty = d.baseTop + (pointer.current.y - d.startY) - d.el.offsetTop
    d.el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`
  }, [])

  /** 根据指针位置算出该插到第几个（按阅读顺序：先比行、再比列） */
  const updateTarget = useCallback(() => {
    const d = drag.current
    if (!d) return
    const { x, y } = pointer.current
    const others = orderRef.current.filter((id) => id !== d.id)
    const elById = new Map(itemEls().map((el) => [el.dataset.sortId as string, el]))

    let at = others.length
    for (let i = 0; i < others.length; i++) {
      const el = elById.get(others[i])
      if (!el) continue
      const r = layoutRect(el)
      if (y < r.top) {
        at = i
        break
      }
      if (y > r.bottom) continue
      if (x < r.left + (r.right - r.left) / 2) {
        at = i
        break
      }
    }

    const next = [...others.slice(0, at), d.id, ...others.slice(at)]
    if (next.join('\u0000') === orderRef.current.join('\u0000')) return
    orderRef.current = next
    setOrder(next)
  }, [itemEls])

  const startDrag = (e: ReactPointerEvent<HTMLElement>, id: string) => {
    if (!enabled) return
    // 鼠标只认左键；触摸 / 笔不区分按键
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const el = e.currentTarget.closest<HTMLElement>('[data-sort-id]')
    if (!el) return

    // 阻止拖动时选中文字、也阻止浏览器把它当成滚动手势
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* 某些环境不支持，忽略即可：下面用的是 window 监听 */
    }

    drag.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      baseLeft: el.offsetLeft,
      baseTop: el.offsetTop,
      el,
      moved: false,
    }
    pointer.current = { x: e.clientX, y: e.clientY }
    rects.current.clear()

    const onMove = (ev: PointerEvent) => {
      const d = drag.current
      if (!d) return
      pointer.current = { x: ev.clientX, y: ev.clientY }

      if (!d.moved) {
        const far =
          Math.abs(ev.clientX - d.startX) > DRAG_THRESHOLD ||
          Math.abs(ev.clientY - d.startY) > DRAG_THRESHOLD
        if (!far) return
        d.moved = true
        setDragId(id)
        document.body.classList.add('nc-dragging')
        rafId.current = requestAnimationFrame(autoScroll)
      }
      pinToPointer()
      updateTarget()
    }

    const autoScroll = () => {
      if (!drag.current) {
        rafId.current = 0
        return
      }
      const y = pointer.current.y
      const vh = window.innerHeight
      let dy = 0
      if (y < EDGE) dy = -Math.min(EDGE_MAX_STEP, Math.ceil((EDGE - y) / 3))
      else if (y > vh - EDGE) dy = Math.min(EDGE_MAX_STEP, Math.ceil((y - (vh - EDGE)) / 3))
      if (dy) {
        window.scrollBy(0, dy)
        // 页面滚了，指针下的卡片变了，插入点要重算
        updateTarget()
      }
      rafId.current = requestAnimationFrame(autoScroll)
    }

    const finish = () => {
      const d = drag.current
      drag.current = null
      detach.current?.()
      detach.current = null
      if (rafId.current) cancelAnimationFrame(rafId.current)
      rafId.current = 0
      document.body.classList.remove('nc-dragging')
      rects.current.clear()
      if (d) {
        d.el.style.transform = ''
        // 只有真的拖动过才提交，单纯按一下手柄不产生改动
        if (d.moved) onReorder(orderRef.current)
      }
      setDragId(null)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    detach.current = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
  }

  // 组件卸载（例如切换模块）时兜底清理
  useEffect(() => () => detach.current?.(), [])

  /** 上移 / 下移一步：点击是一次明确操作，直接提交 */
  const shift = (id: string, delta: number) => {
    const list = [...orderRef.current]
    const i = list.indexOf(id)
    const j = i + delta
    if (i < 0 || j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    orderRef.current = list
    setOrder(list)
    onReorder(list)
  }

  // 让位动画：拖动期间卡片换位后，把每一张从旧位置平滑滑到新位置
  useLayoutEffect(() => {
    if (!dragId) return
    const d = drag.current
    const els = itemEls()
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const measured = new Map<string, { left: number; top: number }>()
    for (const el of els) {
      const id = el.dataset.sortId as string
      const r = el.getBoundingClientRect()
      const t = currentTranslate(el)
      measured.set(id, { left: r.left - t.x, top: r.top - t.y })
    }

    for (const [id, pos] of measured) {
      if (id === d?.id) continue
      const prev = rects.current.get(id)
      if (!prev) continue
      const dx = prev.left - pos.left
      const dy = prev.top - pos.top
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue
      const el = els.find((x) => x.dataset.sortId === id)
      if (!el?.animate) continue
      el.animate(
        [{ transform: `translate3d(${dx}px, ${dy}px, 0)` }, { transform: 'none' }],
        { duration: reduced ? 1 : FLIP_MS, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' }
      )
    }
    rects.current = measured

    // 被拖的卡片刚被换到别的格子，重新钉回指针下面，否则会闪一下
    pinToPointer()
  }, [order, dragId, itemEls, pinToPointer])

  return (
    <div
      ref={gridRef}
      className={`${className} sortable-grid${dragId ? ' is-sorting' : ''}`}
    >
      {order.map((id, index) => (
        <div
          key={id}
          data-sort-id={id}
          className={`sortable-item${id === dragId ? ' is-dragging' : ''}`}
        >
          {renderItem(id, {
            index,
            total: order.length,
            isDragging: id === dragId,
            handleProps: { onPointerDown: (e) => startDrag(e, id) },
            moveUp: () => shift(id, -1),
            moveDown: () => shift(id, 1),
          })}
        </div>
      ))}
      {footer}
    </div>
  )
}
