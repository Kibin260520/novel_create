import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { UiIcon } from '@/components/icons/UiIcon'
import { useSettings } from '@/store/SettingsContext'
import { useData } from '@/store/DataContext'
import { useToast } from '@/components/common/Toast'
import { ghTest } from '@/lib/github'
import { REPO_DATA_DIR, INDEX_FILE } from '@/lib/paths'

const PAT_URL = 'https://github.com/settings/personal-access-tokens/new'

export function SettingsPage() {
  const { settings, ghConfig, canWrite, logout } = useSettings()
  const { refresh, syncing, source, index } = useData()
  const toast = useToast()
  const navigate = useNavigate()

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const runTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await ghTest(ghConfig)
      setTestResult(r)
      if (r.ok) toast.success(r.message)
      else toast.error(r.message)
    } finally {
      setTesting(false)
    }
  }

  return (
    <>
      <Breadcrumbs items={[{ label: '首页', to: '/' }, { label: '设置' }]} />

      <div className="page-head">
        <div className="page-title">
          <div className="icon-tile is-lg" style={{ ['--card-color' as string]: '#6366f1' }}>
            <UiIcon name="settings" size={26} />
          </div>
          <div>
            <h1>设置</h1>
            <div className="page-sub">当前连接的仓库与数据操作</div>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            <UiIcon name="arrowLeft" size={16} /> 返回
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="card glass" style={{ cursor: 'default', gap: 'var(--sp-2)' }}>
          <h2>当前连接</h2>

          <div className="settings-section">
            <h3>仓库</h3>
            <div className="settings-desc">
              数据以 JSON 文件存放在仓库的 <code>{REPO_DATA_DIR}/</code> 目录。
            </div>
            <div className="kv-list">
              <div className="kv">
                <span className="muted">用户名</span>
                <strong>{settings.owner || '—'}</strong>
              </div>
              <div className="kv">
                <span className="muted">仓库</span>
                <strong>{settings.repo || '—'}</strong>
              </div>
              <div className="kv">
                <span className="muted">分支</span>
                <strong>{settings.branch || 'main'}</strong>
              </div>
              <div className="kv">
                <span className="muted">Token</span>
                <strong>{settings.token ? '••••••••（仅本次会话）' : '—'}</strong>
              </div>
            </div>

            <div className="notice is-info" style={{ marginTop: 'var(--sp-4)' }}>
              <UiIcon name="lock" size={18} />
              <div>
                凭据只保存在<strong>本机浏览器的本次会话</strong>里：刷新页面不丢，
                关掉标签页或点右上角「退出登录」即失效，不会上传到任何服务器。
              </div>
            </div>

            <div className="row gap-2 wrap" style={{ marginTop: 'var(--sp-4)' }}>
              <button className="btn" onClick={runTest} disabled={testing}>
                {testing ? (
                  <UiIcon name="loader" size={16} className="spin" />
                ) : (
                  <UiIcon name="link" size={16} />
                )}
                检查连接
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  logout()
                  toast.info('已退出登录')
                  navigate('/login', { replace: true })
                }}
              >
                <UiIcon name="logout" size={16} /> 退出登录 / 更换仓库
              </button>
            </div>

            {testResult && (
              <div
                className={`notice ${testResult.ok ? 'is-success' : ''}`}
                style={{ marginTop: 'var(--sp-4)' }}
              >
                <UiIcon name={testResult.ok ? 'check' : 'alert'} size={18} />
                <div>{testResult.message}</div>
              </div>
            )}
          </div>

          <div className="settings-section">
            <h3>数据</h3>
            <div className="settings-desc">
              当前状态：
              {syncing
                ? '正在提交…'
                : canWrite
                  ? '已连接仓库，改动会自动提交'
                  : '未连接仓库'}
              {source &&
                ` · 数据来源：${
                  source === 'raw'
                    ? 'GitHub 实时数据'
                    : source === 'cache'
                      ? '本机缓存'
                      : '项目内置副本'
                }`}
              {index && ` · ${index.novels.length} 本小说`}
            </div>
            <button
              className="btn"
              onClick={() =>
                void refresh(true).then((ok) =>
                  ok
                    ? toast.success('已从远端同步最新数据')
                    : toast.info('远端暂时不可达，当前显示的是本机已有数据')
                )
              }
            >
              <UiIcon name="refresh" size={16} /> 从远端重新拉取
            </button>
          </div>
        </div>

        <div className="card glass" style={{ cursor: 'default' }}>
          <h2>如何创建 Token</h2>
          <ol
            style={{
              paddingLeft: 20,
              margin: 0,
              lineHeight: 2,
              color: 'var(--text-2)',
              fontSize: 14,
            }}
          >
            <li>
              打开 GitHub 的{' '}
              <a
                href={PAT_URL}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent-strong)', textDecoration: 'underline' }}
              >
                Fine-grained tokens 创建页
              </a>
            </li>
            <li>
              <strong>Repository access</strong> 选「Only select repositories」，只勾选这一个小说仓库
            </li>
            <li>
              <strong>Permissions → Repository permissions</strong> 里找到 <code>Contents</code>，
              设为 <strong>Read and write</strong>
            </li>
            <li>
              <strong>Expiration</strong> 按需设置（建议 90 天，更安全）
            </li>
            <li>
              点 <strong>Generate token</strong>，复制以 <code>github_pat_</code> 开头的那串字符
            </li>
            <li>退出登录后，在登录页粘贴即可</li>
          </ol>

          <div className="divider" />

          <h3>关于权限</h3>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.8, marginTop: 6 }}>
            只需要 <code>Contents</code> 一项读写权限即可。不要使用权限过大的 Classic Token，
            也不要给这个 Token 勾选除该仓库以外的任何访问权。
            登录时会自动校验仓库可达、写权限正常，以及{' '}
            <code>{REPO_DATA_DIR}/{INDEX_FILE}</code> 是否存在。
          </p>
        </div>
      </div>
    </>
  )
}
