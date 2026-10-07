import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { HomePage } from '@/pages/HomePage'
import { NovelPage } from '@/pages/NovelPage'
import { ModulePage } from '@/pages/ModulePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

/**
 * 使用 HashRouter：GitHub Pages 是纯静态托管，刷新深层路径会 404，
 * Hash 方案零配置即可正常刷新与分享链接。
 */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="novel/:novelId" element={<NovelPage />} />
          <Route path="novel/:novelId/module/:moduleId" element={<ModulePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
