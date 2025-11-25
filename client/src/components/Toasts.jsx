import React, { useEffect, useState } from 'react'

export default function Toasts() {
  const [items, setItems] = useState([])

  useEffect(() => {
    const onToast = (e) => {
      const { message, type = 'info', duration = 3000 } = e.detail || {}
      const id = Math.random().toString(36).slice(2)
      setItems(prev => [...prev, { id, message, type }])
      setTimeout(() => {
        setItems(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
    window.addEventListener('app:toast', onToast)
    return () => window.removeEventListener('app:toast', onToast)
  }, [])

  return (
    <div className="fixed z-[9999] top-4 right-4 space-y-2">
      {items.map(t => (
        <div key={t.id} className={`min-w-[240px] max-w-[360px] px-4 py-3 rounded-lg shadow-lg text-white ${
          t.type === 'error' ? 'bg-red-600' : t.type === 'success' ? 'bg-emerald-600' : t.type === 'warning' ? 'bg-amber-600' : 'bg-gray-900'
        }`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
