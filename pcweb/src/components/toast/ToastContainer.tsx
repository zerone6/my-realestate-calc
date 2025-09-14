import React from 'react'
import { useToast } from './ToastContext'

const typeStyles: Record<string, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-blue-600',
  warning: 'bg-yellow-600 text-black'
}

export const ToastContainer: React.FC = () => {
  const { items, remove } = useToast()
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2 w-72">
      {items.map(t => (
        <div
          key={t.id}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className={`text-white rounded shadow px-4 py-3 text-sm flex items-start ${typeStyles[t.type] || 'bg-gray-800'}`}
        >
          <div className="flex-1 pr-2 whitespace-pre-line">{t.message}</div>
          <button className="opacity-70 hover:opacity-100" onClick={() => remove(t.id)}>×</button>
        </div>
      ))}
    </div>
  )
}
