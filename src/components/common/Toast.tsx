import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type ToastKind = 'success' | 'error' | 'info' | 'loading'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

interface ToastApi {
  toast: (message: string, kind?: ToastKind) => number
  success: (message: string) => number
  error: (message: string) => number
  info: (message: string) => number
  loading: (message: string) => number
  dismiss: (id: number) => void
  update: (id: number, message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = ++seq.current
      setItems((list) => [...list, { id, kind, message }])
      const ttl = kind === 'loading' ? 0 : kind === 'error' ? 5200 : 2600
      if (ttl > 0) {
        window.setTimeout(() => dismiss(id), ttl)
      }
      return id
    },
    [dismiss]
  )

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      success: (m) => toast(m, 'success'),
      error: (m) => toast(m, 'error'),
      info: (m) => toast(m, 'info'),
      loading: (m) => toast(m, 'loading'),
      dismiss,
      update: (id, message, kind = 'info') => {
        setItems((list) => list.map((t) => (t.id === id ? { ...t, message, kind } : t)))
        const ttl = kind === 'loading' ? 0 : kind === 'error' ? 5200 : 2600
        if (ttl > 0) window.setTimeout(() => dismiss(id), ttl)
      },
    }),
    [toast, dismiss]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast is-${t.kind}`} onClick={() => dismiss(t.id)}>
            <span className="toast-dot" />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast 必须在 ToastProvider 内使用')
  return ctx
}
