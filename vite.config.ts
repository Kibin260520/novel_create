import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// 部署到 GitHub Pages 项目站点时使用子路径 /novel_collection/
// 本地开发用根路径，方便直接访问 http://localhost:5173/
// 注意：vite preview 的 command 是 serve，必须靠 isPreview 单独判断，
// 否则预览出来的生产包会因 base 不一致而全部 404。
const SITE_BASE = '/novel_collection/'

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? SITE_BASE : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
}))
