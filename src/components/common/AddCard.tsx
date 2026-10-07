import { UiIcon } from '@/components/icons/UiIcon'

interface Props {
  label: string
  onClick: () => void
  hint?: string
}

/** 网格里的「+」新增卡片 */
export function AddCard({ label, onClick, hint }: Props) {
  return (
    <button className="card glass add-card" onClick={onClick} type="button">
      <span className="plus-ring">
        <UiIcon name="plus" size={22} />
      </span>
      <span className="add-label">{label}</span>
      {hint && <span style={{ fontSize: 12, opacity: 0.8 }}>{hint}</span>}
    </button>
  )
}
