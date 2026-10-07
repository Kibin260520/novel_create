import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { UiIcon } from '@/components/icons/UiIcon'

interface Props {
  open: boolean
  title?: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
  /** 点遮罩是否关闭，默认 true */
  closeOnBackdrop?: boolean
}

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide,
  closeOnBackdrop = true,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`modal${wide ? ' is-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {(title || subtitle) && (
          <div className="modal-head">
            <div>
              {title && <h2>{title}</h2>}
              {subtitle && <div className="modal-sub">{subtitle}</div>}
            </div>
            <button className="btn btn-icon btn-ghost" onClick={onClose} aria-label="关闭">
              <UiIcon name="close" size={18} />
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
