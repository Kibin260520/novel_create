import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useSettings } from '@/store/SettingsContext'
import { useData } from '@/store/DataContext'
import { UiIcon } from '@/components/icons/UiIcon'

export function AppShell() {
  const { theme, toggleTheme } = useSettings()
  const { syncing, canWrite, isConfigured } = useData()
  const navigate = useNavigate()

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand" title="回到首页">
          <span className="brand-mark">
            <UiIcon name="layers" size={18} />
          </span>
          <span>小说资料库</span>
        </Link>

        <div className="header-actions">
          <span
            className="chip is-plain"
            title={
              canWrite
                ? '已连接仓库，改动会自动提交到 GitHub'
                : isConfigured
                  ? '已配置仓库但缺少 Token，改动仅保存在本机'
                  : '未配置仓库，改动仅保存在本机'
            }
            style={{ cursor: 'default' }}
          >
            <UiIcon
              name={syncing ? 'loader' : canWrite ? 'cloud' : 'cloudOff'}
              size={14}
              className={syncing ? 'spin' : undefined}
            />
            {syncing ? '提交中…' : canWrite ? '已连接仓库' : '仅本机'}
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
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
