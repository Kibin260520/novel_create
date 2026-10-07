import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/common/EmptyState'
import { UiIcon } from '@/components/icons/UiIcon'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <>
      <EmptyState
        icon="alert"
        title="页面不存在"
        desc="链接可能已经失效，或者这本小说 / 模块已被删除。"
        action={
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            <UiIcon name="arrowLeft" size={16} /> 回到首页
          </button>
        }
      />
    </>
  )
}
