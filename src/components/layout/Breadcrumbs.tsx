import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { UiIcon } from '@/components/icons/UiIcon'

export interface Crumb {
  label: string
  to?: string
  icon?: ReactNode
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumbs" aria-label="导航路径">
      {items.map((c, i) => {
        const last = i === items.length - 1
        return (
          <span key={`${c.label}-${i}`} className="row gap-1" style={{ display: 'inline-flex' }}>
            {i > 0 && (
              <span className="sep">
                <UiIcon name="chevronRight" size={13} />
              </span>
            )}
            {c.to && !last ? (
              <Link to={c.to} className="row gap-1">
                {c.icon}
                {c.label}
              </Link>
            ) : (
              <span className="current row gap-1">
                {c.icon}
                {c.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
