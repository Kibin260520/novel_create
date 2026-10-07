import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { UiIcon } from '@/components/icons/UiIcon'
import { useSettings } from '@/store/SettingsContext'
import { useData } from '@/store/DataContext'
import { useToast } from '@/components/common/Toast'
import { ghTest } from '@/lib/github'
import { REPO_DATA_DIR } from '@/lib/paths'

const PAT_URL = 'https://github.com/settings/personal-access-tokens/new'

export function SettingsPage() {
  const { settings, update, ghConfig, isConfigured, canWrite } = useSettings()
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
      if (r.ok) {
        toast.success(r.message)
        // 连接成功后直接从远端拉一次最新数据
        await refresh(true)
      } else {
        toast.error(r.message)
      }
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
            <div className="page-sub">连接你的 GitHub 仓库，让网页里的改动直接变成 commit</div>
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
          <h2>GitHub 仓库</h2>

          <div className="settings-section">
            <h3>仓库信息</h3>
            <div className="settings-desc">
              数据以 JSON 文件存放在仓库的 <code>{REPO_DATA_DIR}/</code> 目录。
            </div>
            <div className="form-grid">
              <div className="field">
                <label className="field-label">用户名 / 组织名（owner）</label>
                <input
                  className="input"
                  value={settings.owner}
                  placeholder="例如：xuexian"
                  spellCheck={false}
                  onChange={(e) => update({ owner: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field-label">仓库名（repo）</label>
                <input
                  className="input"
                  value={settings.repo}
                  placeholder="例如：novel_collection"
                  spellCheck={false}
                  onChange={(e) => update({ repo: e.target.value })}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">分支（branch）</label>
              <input
                className="input"
                style={{ maxWidth: 240 }}
                value={settings.branch}
                placeholder="main"
                spellCheck={false}
                onChange={(e) => update({ branch: e.target.value })}
              />
            </div>
          </div>

          <div className="settings-section">
            <h3>访问 Token</h3>
            <div className="settings-desc">
              没有 Token 也能用，改动会先存在本机浏览器；填了 Token 才会提交到仓库。
            </div>

            <div className="field">
              <label className="field-label">
                <UiIcon name="key" size={14} /> Personal Access Token
              </label>
              <input
                className="input"
                type="password"
                value={settings.token}
                placeholder="github_pat_… 或 ghp_…"
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => update({ token: e.target.value })}
              />
              <label className="row gap-1" style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6 }}>
                <input
                  type="checkbox"
                  checked={settings.rememberToken}
                  onChange={(e) => update({ rememberToken: e.target.checked })}
                />
                记住 Token（关闭则仅在本次会话有效）
              </label>
            </div>

            <div className="notice" style={{ marginTop: 4 }}>
              <UiIcon name="alert" size={18} />
              <div>
                Token 会以明文保存在<strong>本机浏览器</strong>里，不会上传到任何服务器。
                请<strong>不要在公用电脑上勾选「记住」</strong>；建议使用有效期较短的 Token，
                一旦怀疑泄露，立刻到 GitHub 撤销。
              </div>
            </div>

            <div className="row gap-2 wrap" style={{ marginTop: 'var(--sp-4)' }}>
              <button className="btn" onClick={runTest} disabled={testing || !isConfigured}>
                {testing ? <UiIcon name="loader" size={16} className="spin" /> : <UiIcon name="link" size={16} />}
                测试连接
              </button>
              <a className="btn btn-ghost" href={PAT_URL} target="_blank" rel="noreferrer">
                <UiIcon name="external" size={16} /> 去创建 Token
              </a>
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
                  : isConfigured
                    ? '已配置仓库，但缺少 Token —— 改动仅存本机'
                    : '未配置仓库 —— 改动仅存本机'}
              {source && ` · 数据来源：${source === 'raw' ? 'GitHub 实时数据' : '项目内置副本'}`}
              {index && ` · ${index.novels.length} 本小说`}
            </div>
            <button
              className="btn"
              onClick={() => void refresh(true).then(() => toast.success('已从远端重新拉取数据'))}
            >
              <UiIcon name="refresh" size={16} /> 从远端重新拉取
            </button>
            <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
              未配置 Token 时，网页里的改动只保存在本机浏览器，不会被远端覆盖；
              点上面的按钮会用远端数据覆盖本机改动，请谨慎。
            </p>
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
            <li>粘贴到左边「Personal Access Token」输入框</li>
          </ol>

          <div className="divider" />

          <h3>关于权限</h3>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.8, marginTop: 6 }}>
            只需要 <code>Contents</code> 一项读写权限即可。不要使用权限过大的 Classic Token，
            也不要给这个 Token 勾选除该仓库以外的任何访问权。
          </p>
        </div>
      </div>
    </>
  )
}
