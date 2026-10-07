import type { ReactNode } from 'react'
import { Modal } from './Modal'
import { UiIcon } from '@/components/icons/UiIcon'

interface Props {
  open: boolean
  title?: string
  message: ReactNode
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title = '确认操作',
  message,
  confirmText = '确认',
  cancelText = '取消',
  danger,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal
      open={open}
      title={
        <span className="row gap-2">
          <UiIcon name="alert" size={18} />
          {title}
        </span>
      }
      onClose={onCancel}
      footer={
        <>
          <span className="grow" />
          <button className="btn btn-ghost" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <div style={{ color: 'var(--text-2)', lineHeight: 1.7, paddingBottom: 6 }}>{message}</div>
    </Modal>
  )
}
