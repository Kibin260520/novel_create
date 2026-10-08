import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useSettings } from '@/store/SettingsContext'
import { useData } from '@/store/DataContext'
import { useToast } from '@/components/common/Toast'
import { UiIcon } from '@/components/icons/UiIcon'

export function AppShell() {
  const { theme, toggleTheme, settings, logout } = useSettings()
  const { syncing } = useData()
  const toast = useToast()
  const navigate = useNavigate()

  const doLogout = () => {
    logout()
    toast.info('已退出登录，凭据已从本机清除')
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand" title="回到首页">
          <span className="brand-mark">
            <UiIcon name="layers" size={18} />
          </span>
          <span className="brand-name">小说灵感创作记录库</span>
        </Link>

        <div className="header-actions">
          <span
            className="chip is-plain"
            title={`已连接 ${settings.owner}/${settings.repo}@${settings.branch}，改动会提交到该仓库`}
            style={{ cursor: 'default', maxWidth: 260 }}
          >
            <UiIcon
              name={syncing ? 'loader' : 'cloud'}
              size={14}
              className={syncing ? 'spin' : undefined}
            />
            <span className="clamp-1">
              {syncing ? '提交中…' : `${settings.owner}/${settings.repo}`}
            </span>
          </span>

          <button
            className="btn btn-icon btn-ghost"
            onClick={toggleTheme}
            title={theme === 'light' ? '切换到暗色' : '切换到亮色'}
          >
            <UiIcon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
          </button>

          <button
            className="btn btn-icon btn-ghost"
            onClick={() => navigate('/settings')}
            title="设置"
          >
            <UiIcon name="settings" size={18} />
          </button>

          <button className="btn btn-icon btn-ghost" onClick={doLogout} title="退出登录">
            <UiIcon name="logout" size={18} />
          </button>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
