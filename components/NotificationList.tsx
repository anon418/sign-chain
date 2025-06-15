import React, { useState, useEffect } from 'react'
import { decryptEmailNode } from '../utils/crypto'
import { FaTrashAlt } from 'react-icons/fa'

export function safeDecryptEmailNode(val: string | undefined) {
  if (!val || typeof val !== 'string' || !val.includes(':')) return val || ''
  try {
    return decryptEmailNode(val)
  } catch (e) {
    return ''
  }
}

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

interface NotificationListProps {
  notifications: Notification[]
  loading: boolean
  selectedId: string | null
  onNotificationClick: (notification: Notification) => void
  filter: 'all' | 'unread' | 'read'
  setFilter: (filter: 'all' | 'unread' | 'read') => void
  onRead?: (id: string) => void
  onDelete?: (id: string) => void
}

const NotificationList: React.FC<NotificationListProps> = ({
  notifications: propNotifications,
  loading,
  selectedId,
  onNotificationClick,
  filter,
  setFilter,
  onRead,
  onDelete,
}) => {
  // 개별 읽음 처리 함수
  const markAsRead = async (id: string, notification: Notification) => {
    if (!notification.read) {
      try {
        await fetch('/api/auth/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        })
        if (onRead) onRead(id)
      } catch {}
    } else {
      // 이미 읽음이어도 서버에 한 번 더 PATCH (DB와 동기화)
      try {
        await fetch('/api/auth/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        })
        if (onRead) onRead(id)
      } catch {}
    }
    setTimeout(() => {
      onNotificationClick({ ...notification, read: true })
    }, 0)
  }
  // 개별 삭제 처리 함수
  const deleteNotification = async (id: string) => {
    try {
      await fetch('/api/auth/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (onDelete) onDelete(id)
    } catch {}
  }
  // 읽지 않은 알림 개수
  const unreadCount = propNotifications.filter((n) => !n.read).length
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  return (
    <div style={{ minWidth: 340 }}>
      {loading ? (
        <div style={{ color: '#888', padding: 16 }}>불러오는 중...</div>
      ) : propNotifications.length === 0 ? (
        <div style={{ color: '#888', padding: 16 }}>알림이 없습니다.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {propNotifications
            .filter((n) => !hiddenIds.includes(n.id))
            .map((n) => {
              // 시스템 알림(로그인/회원가입)은 메시지 전체 그대로 보여주고, ...처리 없이 줄바꿈 허용, 왼쪽 정렬, 수직 가운데
              if (n.type === 'system') {
                return (
                  <li
                    key={n.id}
                    onClick={async (e) => {
                      e.stopPropagation()
                      try {
                        await fetch('/api/auth/notifications', {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: n.id }),
                        })
                        setHiddenIds((ids) => [...ids, n.id])
                      } catch {}
                    }}
                    style={{
                      background: n.read ? '#f7f7f7' : '#e3f0ff',
                      color: '#1976d2',
                      fontWeight: n.read ? 400 : 600,
                      borderLeft: n.read
                        ? '4px solid #ccc'
                        : '4px solid #1976d2',
                      padding: '0 16px',
                      marginBottom: 16,
                      borderRadius: 16,
                      cursor: 'pointer',
                      boxShadow:
                        selectedId === n.id
                          ? '0 2px 8px #1976d233'
                          : '0 1px 2px #0001',
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      position: 'relative',
                      transition: 'background 0.2s, color 0.2s',
                      opacity: 1,
                      minWidth: 340,
                      fontFamily: 'inherit',
                      fontSize: 17,
                      height: 60,
                      overflow: 'hidden',
                      textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        wordBreak: 'break-all',
                        verticalAlign: 'middle',
                        whiteSpace: 'pre-line',
                        fontWeight: n.read ? 400 : 600,
                        textAlign: 'left',
                        display: 'block',
                        height: '100%',
                        lineHeight: '60px',
                      }}
                      title={n.message}
                    >
                      {n.message}
                    </span>
                  </li>
                )
              }
              // 계약서 알림(수신 알림)만 파싱
              const isContractMsg =
                n.type === 'message' &&
                n.message.includes('계약서가 도착했습니다.')
              if (isContractMsg) {
                const match = n.message.match(
                  /^(.+?)(\.[\w\d]+)? 계약서가 도착했습니다\.$/
                )
                const fileTitle = match ? match[1] : n.message
                const fileExt = match && match[2] ? match[2] : ''
                const suffix = '계약서가 도착했습니다.'
                const maxTitleLength = 10
                let displayTitle = fileTitle
                let showEllipsis = false
                if (fileTitle.length >= maxTitleLength) {
                  displayTitle = fileTitle.slice(0, maxTitleLength) + '...'
                  showEllipsis = true
                }
                return (
                  <li
                    key={n.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onNotificationClick(n)
                    }}
                    style={{
                      background: n.read ? '#f7f7f7' : '#e3f0ff',
                      color: '#1976d2',
                      fontWeight: n.read ? 400 : 600,
                      borderLeft: n.read
                        ? '4px solid #ccc'
                        : '4px solid #1976d2',
                      padding: '0 16px',
                      marginBottom: 16,
                      borderRadius: 16,
                      cursor: 'pointer',
                      boxShadow:
                        selectedId === n.id
                          ? '0 2px 8px #1976d233'
                          : '0 1px 2px #0001',
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      position: 'relative',
                      transition: 'background 0.2s, color 0.2s',
                      opacity: 1,
                      minWidth: 340,
                      fontFamily: 'inherit',
                      fontSize: 17,
                      height: 60,
                      overflow: 'hidden',
                      textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        height: '100%',
                        textAlign: 'left',
                        lineHeight: '60px',
                      }}
                    >
                      <span
                        style={{
                          overflow: showEllipsis ? 'hidden' : 'visible',
                          textOverflow: showEllipsis ? 'ellipsis' : 'clip',
                          whiteSpace: 'nowrap',
                          maxWidth: showEllipsis ? 180 : 'none',
                          display: 'inline-block',
                          verticalAlign: 'middle',
                        }}
                        title={fileTitle}
                      >
                        {displayTitle}
                      </span>
                      <span style={{ flexShrink: 0, marginLeft: 2 }}>
                        {fileExt} {suffix}
                      </span>
                    </span>
                  </li>
                )
              }
              // 그 외 알림도 왼쪽 정렬, 수직 가운데
              return (
                <li
                  key={n.id}
                  onClick={async (e) => {
                    e.stopPropagation()
                    try {
                      await fetch('/api/auth/notifications', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: n.id }),
                      })
                      setHiddenIds((ids) => [...ids, n.id])
                    } catch {}
                  }}
                  style={{
                    background: n.read ? '#f7f7f7' : '#e3f0ff',
                    color: n.read ? '#888' : '#1976d2',
                    fontWeight: n.read ? 400 : 600,
                    borderLeft: n.read ? '4px solid #ccc' : '4px solid #1976d2',
                    padding: '0 16px',
                    marginBottom: 16,
                    borderRadius: 16,
                    cursor: 'pointer',
                    boxShadow:
                      selectedId === n.id
                        ? '0 2px 8px #1976d233'
                        : '0 1px 2px #0001',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    position: 'relative',
                    transition: 'background 0.2s, color 0.2s',
                    opacity: 1,
                    minWidth: 340,
                    fontFamily: 'inherit',
                    fontSize: 17,
                    height: 60,
                    overflow: 'hidden',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      height: '100%',
                      textAlign: 'left',
                      lineHeight: '60px',
                    }}
                    title={n.message}
                  >
                    {n.message}
                  </span>
                </li>
              )
            })}
        </ul>
      )}
    </div>
  )
}

export default NotificationList

