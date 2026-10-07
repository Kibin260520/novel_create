import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App'
import { ToastProvider } from '@/components/common/Toast'
import { SettingsProvider } from '@/store/SettingsContext'
import { DataProvider } from '@/store/DataContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <SettingsProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </SettingsProvider>
    </ToastProvider>
  </StrictMode>
)
