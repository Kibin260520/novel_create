import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { HomePage } from '@/pages/HomePage'
import { NovelPage } from '@/pages/NovelPage'
import { ModulePage } from '@/pages/ModulePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

/**
 * 使用 HashRouter：GitHub Pages 是纯静态托管，刷新深层路径会 404，
 * Hash 方案零配置即可正常刷新与分享链接。
 *
 * 路由分两层：
 * - /login 独立在外（全屏登录页，不套用站点外壳）
 * - 其余全部受 RequireAuth 保护：未登录一律跳登录页
 */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="novel/:novelId" element={<NovelPage />} />
            <Route path="novel/:novelId/module/:moduleId" element={<ModulePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  )
}
