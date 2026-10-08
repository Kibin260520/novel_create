import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { UiIcon } from '@/components/icons/UiIcon'
import { useSettings, type AppSettings } from '@/store/SettingsContext'
import { useToast } from '@/components/common/Toast'
import { REPO_DATA_DIR, INDEX_FILE } from '@/lib/paths'

const PAT_URL = 'https://github.com/settings/personal-access-tokens/new'

/**
 * 登录页。
 *
 * 说明：站点是纯静态托管，没有后端，所以这里的「登录」不是服务端鉴权，
 * 而是「用 GitHub API 校验这组凭据能不能操作你的仓库」。
 * 校验通过 = 有读权限 + 有 Contents 写权限 + 仓库里确实有数据目录。
 */
export function LoginPage() {
  const { settings, login, verifying, isAuthenticated, theme, toggleTheme } = useSettings()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  /** 登录成功后要回到的页面 */
  const from = (location.state as { from?: string } | null)?.from || '/'

  const [form, setForm] = useState<AppSettings>({
    owner: settings.owner,
    repo: settings.repo,
    branch: settings.branch || 'main',
    token: '',
  })
  const [error, setError] = useState('')

  // 已登录（含刷新后仍在会话内）就直接放行
  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, from, navigate])

  const set = (patch: Partial<AppSettings>) => setForm((f) => ({ ...f, ...patch }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.owner.trim() || !form.repo.trim()) {
      setError('请填写用户名（owner）与仓库名（repo）')
      return
    }
    if (!form.token.trim()) {
      setError('请填写 Personal Access Token')
      return
    }

    const r = await login(form)
    if (!r.ok) {
      setError(r.message)
      return
    }
    toast.success(r.message)
    navigate(from, { replace: true })
  }

  return (
    <div className="auth-page">
      <form className="card glass auth-card" onSubmit={submit}>
        <div className="auth-head">
          <span className="auth-mark">
            <UiIcon name="layers" size={20} />
          </span>
          <div>
            <h1>小说资料库</h1>
            <p className="auth-sub">先连接你的 GitHub 仓库，才能进入并保存改动</p>
          </div>
        </div>

        <div className="auth-fields">
          <div className="field">
            <label className="field-label">用户名 / 组织名（owner）</label>
            <input
              className="input"
              value={form.owner}
              placeholder="例如：Kibin260520"
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => set({ owner: e.target.value })}
            />
          </div>

          <div className="field">
            <label className="field-label">仓库名（repo）</label>
            <input
              className="input"
              value={form.repo}
              placeholder="例如：novel_create"
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => set({ repo: e.target.value })}
            />
          </div>

          <div className="field">
            <label className="field-label">分支（branch）</label>
            <input
              className="input"
              value={form.branch}
              placeholder="main"
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => set({ branch: e.target.value })}
            />
          </div>

          <div className="field">
            <label className="field-label">
              <UiIcon name="key" size={14} /> Personal Access Token
            </label>
            <input
              className="input"
              type="password"
              value={form.token}
              placeholder="github_pat_… 或 ghp_…"
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => set({ token: e.target.value })}
            />
            <div className="field-hint">
              <UiIcon name="lock" size={12} /> 只保存在本机浏览器，关掉标签页即失效，不会上传
            </div>
          </div>
        </div>

        {error && (
          <div className="notice">
            <UiIcon name="alert" size={18} />
            <div>{error}</div>
          </div>
        )}

        <button className="btn btn-primary auth-submit" type="submit" disabled={verifying}>
          {verifying ? (
            <>
              <UiIcon name="loader" size={16} className="spin" /> 正在校验仓库…
            </>
          ) : (
            <>
              <UiIcon name="link" size={16} /> 登录并进入
            </>
          )}
        </button>

        <div className="auth-foot">
          <a href={PAT_URL} target="_blank" rel="noreferrer">
            <UiIcon name="external" size={13} /> 去创建 Token
          </a>
          <span className="muted">权限只需 Contents: Read and write</span>
        </div>

        <details className="auth-help">
          <summary>怎么创建 Token？</summary>
          <ol>
            <li>打开上面的「去创建 Token」，选 Fine-grained token</li>
            <li>
              <strong>Repository access</strong> 选 Only select repositories，只勾这一个小说仓库
            </li>
            <li>
              <strong>Permissions → Contents</strong> 设为 <strong>Read and write</strong>
            </li>
            <li>设置过期时间（建议 90 天），生成后复制 github_pat_ 开头的那串</li>
          </ol>
          <p className="muted">
            数据存在仓库的 <code>{REPO_DATA_DIR}/{INDEX_FILE}</code> 与{' '}
            <code>{REPO_DATA_DIR}/novels/</code> 下，登录时会自动校验。
          </p>
        </details>
      </form>

      <button
        className="btn btn-icon btn-ghost auth-theme"
        type="button"
        onClick={toggleTheme}
        title={theme === 'light' ? '切换到暗色' : '切换到亮色'}
      >
        <UiIcon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
      </button>
    </div>
  )
}
