import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { UiIcon } from '@/components/icons/UiIcon'
import { HistoryInput, type LoginSuggestion } from '@/components/auth/HistoryInput'
import { useSettings, type AppSettings } from '@/store/SettingsContext'
import { useToast } from '@/components/common/Toast'
import {
  forgetLogin,
  readLoginHistory,
  type LoginIdentity,
} from '@/lib/loginHistory'
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

  /** 成功登录过的 owner / repo / branch（不含 Token） */
  const [history, setHistory] = useState<LoginIdentity[]>(readLoginHistory)

  const [form, setForm] = useState<AppSettings>(() => {
    const preset: AppSettings = {
      owner: settings.owner.trim(),
      repo: settings.repo.trim(),
      branch: settings.branch || 'main',
      token: '',
    }
    // 会话已过期 / 主动登出后，直接带上最近一次成功连接的那一组，只需要再补 Token
    if (preset.owner) return preset
    const last = history[0]
    return last
      ? { owner: last.owner, repo: last.repo, branch: last.branch || 'main', token: '' }
      : preset
  })
  const [error, setError] = useState('')

  // 已登录（含刷新后仍在会话内）就直接放行
  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, from, navigate])

  const set = (patch: Partial<AppSettings>) => setForm((f) => ({ ...f, ...patch }))

  /** owner 候选：按用户名去重，顺便标出它下面记了几本仓库 */
  const ownerOptions = useMemo<LoginSuggestion[]>(() => {
    const q = form.owner.trim().toLowerCase()
    const counted = new Map<string, { label: string; count: number }>()
    for (const h of history) {
      const key = h.owner.toLowerCase()
      if (q && !key.includes(q)) continue
      const hit = counted.get(key)
      if (hit) hit.count += 1
      else counted.set(key, { label: h.owner, count: 1 })
    }
    return [...counted.entries()].map(([key, v]) => ({
      key: `owner:${key}`,
      label: v.label,
      hint: v.count > 1 ? `${v.count} 个仓库` : undefined,
      owner: v.label,
      repo: '',
      branch: '',
    }))
  }, [history, form.owner])

  /** repo 候选：优先只列当前 owner 下的仓库；owner 没填时列出全部 */
  const repoOptions = useMemo<LoginSuggestion[]>(() => {
    const owner = form.owner.trim().toLowerCase()
    const q = form.repo.trim().toLowerCase()
    return history
      .filter(
        (h) =>
          (!owner || h.owner.toLowerCase() === owner) &&
          (!q || h.repo.toLowerCase().includes(q))
      )
      .map((h) => ({
        key: `repo:${h.owner}/${h.repo}`.toLowerCase(),
        label: h.repo,
        hint: owner ? `${h.branch || 'main'} 分支` : `${h.owner}/${h.repo}`,
        owner: h.owner,
        repo: h.repo,
        branch: h.branch || 'main',
      }))
  }, [history, form.owner, form.repo])

  const pickOwner = (s: LoginSuggestion) => {
    const same = history.filter((h) => h.owner.toLowerCase() === s.owner.toLowerCase())
    // 这个用户名下只有一条记录时，仓库和分支一起带出来，少点两次
    if (same.length === 1) {
      set({ owner: same[0].owner, repo: same[0].repo, branch: same[0].branch || 'main' })
    } else {
      set({ owner: s.owner })
    }
  }

  const pickRepo = (s: LoginSuggestion) => {
    set({ owner: s.owner, repo: s.repo, branch: s.branch || 'main' })
  }

  const removeHistory = (s: LoginSuggestion) => {
    setHistory(forgetLogin(s.owner, s.repo))
  }

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
            <h1>小说灵感创作记录库</h1>
            <p className="auth-sub">先连接你的 GitHub 仓库，才能进入并保存改动</p>
          </div>
        </div>

        <div className="auth-fields">
          <div className="field">
            <label className="field-label">用户名 / 组织名（owner）</label>
            <HistoryInput
              value={form.owner}
              placeholder="例如：Kibin260520"
              suggestions={ownerOptions}
              onChange={(v) => set({ owner: v })}
              onPick={pickOwner}
            />
            {history.length === 0 && (
              <div className="field-hint">
                <UiIcon name="info" size={12} /> 登录成功后会记住，下次点一下就能直接选
              </div>
            )}
          </div>

          <div className="field">
            <label className="field-label">仓库名（repo）</label>
            <HistoryInput
              value={form.repo}
              placeholder="例如：novel_create"
              suggestions={repoOptions}
              onChange={(v) => set({ repo: v })}
              onPick={pickRepo}
              onRemove={removeHistory}
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

        <div className="auth-note">
          <UiIcon name="info" size={12} />
          <span>
            用户名和仓库名只记在这台设备的浏览器里，换手机或换浏览器要重新填一次；Token 任何时候都不会被记住。
          </span>
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
