// components/Navbar.tsx
'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import Notifications from './Notifications'
import { FaBell, FaRegEnvelope, FaUserCircle } from 'react-icons/fa'
import { BsPersonCircle } from 'react-icons/bs'
import { deletePrivateKey, exportPrivateKey } from '../utils/indexedDB'
import { useRouter } from 'next/navigation'
import ConfirmModal from './ConfirmModal'
import styles from '../styles/Clickable.module.css'
import { decryptLocal } from '../utils/crypto'

// Dummy user info fetch (replace with actual user fetch logic)
function useUser() {
  const [user, setUser] = useState<{
    username: string
    profilePicture?: string
    email?: string
  } | null>(null)
  useEffect(() => {
    function fetchUser() {
      fetch('/api/user/me')
        .then((res) => res.json())
        .then((data) => setUser(data))
        .catch(() => setUser(null))
    }
    fetchUser()
    // Listen for custom event to refresh user info
    const handler = () => fetchUser()
    window.addEventListener('user-profile-updated', handler)
    return () => {
      window.removeEventListener('user-profile-updated', handler)
    }
  }, [])
  return user
}

export default function Navbar({
  onMessageAction,
}: {
  onMessageAction?: (contractId?: string) => void
}) {
  const [showNotifications, setShowNotifications] = useState<
    'system' | 'message' | null
  >(null)
  const [unreadSystem, setUnreadSystem] = useState(0)
  const [unreadMessage, setUnreadMessage] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalMsg, setModalMsg] = useState('')
  const [pendingContractId, setPendingContractId] = useState<string | null>(
    null
  )
  const [modalType, setModalType] = useState<'system' | 'message' | null>(null)
  const user = useUser()
  const router = useRouter()
  const bellRef = useRef<HTMLDivElement>(null)
  const envelopeRef = useRef<HTMLDivElement>(null)
  const [showErrorModal, setShowErrorModal] = useState(false)

  // Fetch unread notification counts by type
  useEffect(() => {
    let ignore = false
    async function fetchUnread() {
      try {
        const res = await fetch('/api/auth/notifications')
        const data = await res.json()
        const system = (data.notifications || []).filter(
          (n: any) => n.type === 'system' && !n.read
        ).length
        const message = (data.notifications || []).filter(
          (n: any) => n.type === 'message' && !n.read
        ).length
        if (!ignore) {
          setUnreadSystem(system)
          setUnreadMessage(message)
        }
      } catch {
        if (!ignore) {
          setUnreadSystem(0)
          setUnreadMessage(0)
        }
      }
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => {
      ignore = true
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (showModal) return
      if (document.querySelector('.confirm-modal-backdrop')) return
      if (
        showNotifications === 'system' &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(null)
      }
      if (
        showNotifications === 'message' &&
        envelopeRef.current &&
        !envelopeRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(null)
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showNotifications, showModal])

  const handleShowModal = (
    title: string,
    msg: string,
    contractId: string | null,
    type: 'system' | 'message'
  ) => {
    setModalTitle(title)
    setModalMsg(msg)
    setPendingContractId(contractId)
    setModalType(type)
    setShowModal(true)
  }

  const handleModalConfirm = async () => {
    setShowModal(false)
    if (modalType === 'message' && pendingContractId) {
      try {
        await fetch(`/api/contract/${pendingContractId}`)
        await fetch('/api/contract/receive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractId: pendingContractId }),
        })
        if (onMessageAction) onMessageAction(pendingContractId)
      } catch {}
    }
    setPendingContractId(null)
    setModalTitle('')
    setModalMsg('')
    setModalType(null)
  }

  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        background: '#f0f4ff',
        borderBottom: '1px solid #e0e7ef',
        position: 'relative',
        zIndex: 100,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 20 }}>
        <Link href="/">SignChain</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        {/* 종 아이콘 (system) */}
        <div
          ref={bellRef}
          className={styles.clickable}
          style={{ position: 'relative', marginRight: 4 }}
          onClick={() =>
            setShowNotifications(
              showNotifications === 'system' ? null : 'system'
            )
          }
        >
          <span
            className={styles.clickable}
            aria-label="시스템 알림"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ')
                setShowNotifications(
                  showNotifications === 'system' ? null : 'system'
                )
            }}
            title="시스템 알림"
          >
            <FaBell style={{ color: '#222', fontSize: 22 }} />
            {unreadSystem > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  background: '#0074ff',
                  color: '#fff',
                  borderRadius: '50%',
                  minWidth: 22,
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15,
                  fontWeight: 500,
                  boxShadow: '0 1px 4px #0002',
                  border: '2px solid #fff',
                  zIndex: 2,
                }}
              >
                {unreadSystem}
              </span>
            )}
          </span>
          {showNotifications === 'system' && (
            <div style={{ position: 'absolute', right: 0, top: 40 }}>
              <Notifications
                type="system"
                userEmail={user?.email}
                visible={showNotifications === 'system'}
              />
            </div>
          )}
        </div>
        {/* 봉투 아이콘 (message) */}
        <div
          ref={envelopeRef}
          className={styles.clickable}
          style={{ position: 'relative', marginRight: 8 }}
          onClick={() =>
            setShowNotifications(
              showNotifications === 'message' ? null : 'message'
            )
          }
        >
          <span
            className={styles.clickable}
            aria-label="수신 알림"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ')
                setShowNotifications(
                  showNotifications === 'message' ? null : 'message'
                )
            }}
            title="수신 알림"
          >
            <FaRegEnvelope style={{ color: '#222', fontSize: 22 }} />
            {unreadMessage > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  background: '#0074ff',
                  color: '#fff',
                  borderRadius: '50%',
                  minWidth: 22,
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15,
                  fontWeight: 500,
                  boxShadow: '0 1px 4px #0002',
                  border: '2px solid #fff',
                  zIndex: 2,
                }}
              >
                {unreadMessage}
              </span>
            )}
          </span>
          {showNotifications === 'message' && (
            <div style={{ position: 'absolute', right: 0, top: 40 }}>
              <Notifications
                type="message"
                userEmail={user?.email}
                visible={showNotifications === 'message'}
              />
            </div>
          )}
        </div>
        <Link
          href="/introduction"
          className={styles.clickable}
          style={{ fontWeight: 500 }}
        >
          프로젝트 소개
        </Link>
        {/* 프로필 사진+아이디 */}
        {user && (
          <>
            <div
              className={styles.clickable}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginRight: 8,
              }}
              onClick={() => router.push('/profile')}
              tabIndex={0}
              aria-label="프로필 관리로 이동"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') router.push('/profile')
              }}
            >
              <FaUserCircle
                size={32}
                color="#b0b8c1"
                style={{
                  border: '2px solid #003cff',
                  borderRadius: '50%',
                  background: '#e0e4ea',
                }}
              />
              <span style={{ fontWeight: 600, color: '#003cff' }}>
                {user.username}
              </span>
            </div>
            <button
              className={styles.clickable}
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' })
                window.location.href = '/'
              }}
              style={{
                fontWeight: 500,
                color: '#ff3b3b',
                background: 'none',
                border: 'none',
                fontSize: '1rem',
              }}
            >
              로그아웃
            </button>
            <button
              className={styles.clickable}
              onClick={async () => {
                if (
                  !window.confirm(
                    '정말로 회원탈퇴 하시겠습니까? 모든 데이터가 삭제됩니다.'
                  )
                )
                  return
                try {
                  const res = await fetch('/api/user/delete', {
                    method: 'DELETE',
                  })
                  if (res.ok) {
                    const encryptedUserId = localStorage.getItem('userId')
                    const userId = encryptedUserId
                      ? await decryptLocal(encryptedUserId)
                      : ''
                    if (userId) {
                      await deletePrivateKey(userId)
                    }
                    let dbsToDelete = 0
                    let dbsDeleted = 0
                    const onAllDeleted = () => {
                      localStorage.clear()
                      sessionStorage.clear()
                      window.location.href = '/'
                    }
                    if (window.indexedDB) {
                      dbsToDelete = 2
                      const req1 =
                        window.indexedDB.deleteDatabase('signchain-key')
                      req1.onsuccess =
                        req1.onerror =
                        req1.onblocked =
                          () => {
                            dbsDeleted++
                            if (dbsDeleted === dbsToDelete) onAllDeleted()
                          }
                      const req2 =
                        window.indexedDB.deleteDatabase('signchain-token')
                      req2.onsuccess =
                        req2.onerror =
                        req2.onblocked =
                          () => {
                            dbsDeleted++
                            if (dbsDeleted === dbsToDelete) onAllDeleted()
                          }
                    } else {
                      onAllDeleted()
                    }
                  } else {
                    setShowErrorModal(true)
                  }
                } catch {
                  setShowErrorModal(true)
                }
              }}
              style={{
                fontWeight: 500,
                color: '#888',
                background: 'none',
                border: 'none',
                fontSize: '1rem',
                marginLeft: 8,
              }}
            >
              회원탈퇴
            </button>
          </>
        )}
      </div>
      {showModal && (
        <ConfirmModal
          message={(modalTitle ? modalTitle + '\n' : '') + (modalMsg || '')}
          onConfirm={handleModalConfirm}
          onCancel={() => setShowModal(false)}
          integrityMsg=""
        />
      )}
      {showErrorModal && (
        <ConfirmModal
          message="회원탈퇴에 실패했습니다. 다시 시도해주세요."
          onConfirm={() => setShowErrorModal(false)}
          onCancel={() => setShowErrorModal(false)}
          integrityMsg=""
        />
      )}
    </nav>
  )
}
