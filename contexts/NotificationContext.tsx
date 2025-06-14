'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'

interface Notification {
  id: string
  message: string
  timestamp: string
  contractId?: string
  recipientEmail?: string
  read: boolean
  type?: 'system' | 'message'
  senderEmail?: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
)

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const refreshNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/notifications', {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(
        (data.notifications || []).filter((n: Notification) => !n.read).length
      )
    } catch {
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    async function safeRefresh() {
      if (ignore) return
      await refreshNotifications()
    }
    safeRefresh()
    const interval = setInterval(safeRefresh, 10000)
    return () => {
      ignore = true
      clearInterval(interval)
    }
  }, [refreshNotifications])

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, refreshNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationContext() {
  const ctx = useContext(NotificationContext)
  if (!ctx)
    throw new Error(
      'useNotificationContext must be used within a NotificationProvider'
    )
  return ctx
}
