import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSettings } from '@/store/SettingsContext'

/**
 * 路由守卫（严格模式）：
 * 本会话没有通过登录校验，任何受保护页面都直接跳转到登录页，
 * 并记住原本要去的地址，登录成功后原路返回。
 */
export function RequireAuth() {
  const { isAuthenticated } = useSettings()
  const location = useLocation()

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }
  return <Outlet />
}
