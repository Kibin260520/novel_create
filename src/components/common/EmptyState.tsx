import type { ReactNode } from 'react'
import { UiIcon, type UiIconName } from '@/components/icons/UiIcon'

interface Props {
  icon?: UiIconName
  title: string
  desc?: ReactNode
  action?: ReactNode
}

export function EmptyState({ icon = 'inbox', title, desc, action }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <UiIcon name={icon} size={34} strokeWidth={1.6} />
      </div>
      <h3>{title}</h3>
      {desc && <div style={{ maxWidth: 420 }}>{desc}</div>}
      {action}
    </div>
  )
}
