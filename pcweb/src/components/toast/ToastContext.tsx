import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  ttl: number
  createdAt: number
}

interface ToastContextValue {
  push: (type: ToastType, message: string, ttlMs?: number) => void
  remove: (id: string) => void
  items: ToastItem[]
}

const ToastContext = createContext<ToastContextValue | null>(null)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([])

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(t => t.id !== id))
  }, [])

  const push = useCallback((type: ToastType, message: string, ttlMs = 4000) => {
    const id = Math.random().toString(36).slice(2)
    const createdAt = Date.now()
    const item: ToastItem = { id, type, message, ttl: ttlMs, createdAt }
    setItems(prev => [...prev, item])
    // auto remove
    setTimeout(() => remove(id), ttlMs)
  }, [remove])

  const value = useMemo(() => ({ push, remove, items }), [push, remove, items])
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
