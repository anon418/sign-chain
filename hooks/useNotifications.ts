import { useState, useEffect } from 'react'

export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const refreshNotifications = async () => {
    const res = await fetch('/api/auth/notifications', {
      credentials: 'include',
    })
    if (res.ok) {
      const data = await res.json()
      setNotifications(data.notifications)
      setUnreadCount(
        (data.notifications || []).filter((n: any) => !n.read).length
      )
    }
  }

  useEffect(() => {
    let ignore = false
    async function safeRefresh() {
      try {
        await refreshNotifications()
      } catch {
        if (!ignore) {
          setNotifications([])
          setUnreadCount(0)
        }
      }
    }
    safeRefresh()
    const interval = setInterval(safeRefresh, 30000)
    return () => {
      ignore = true
      clearInterval(interval)
    }
  }, [])

  // console.log('notifications:', notifications)
  // console.log('unreadCount:', unreadCount)

  return {
    notifications,
    unreadCount,
    setNotifications,
    setUnreadCount,
    refreshNotifications,
  }
}
