import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import NotificationList from './NotificationList'
import ConfirmModal from './ConfirmModal'
import NotificationStepSign from './NotificationStepSign'
import sha256 from 'crypto-js/sha256'
import encHex from 'crypto-js/enc-hex'
import QrModal from './QrModal'
import { safeDecryptEmailNode } from './NotificationList'
import { useNotificationContext } from '../contexts/NotificationContext'

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

interface NotificationsProps {
  userEmail?: string
  type?: 'system' | 'message'
  onMessageAction?: (contractId: string) => void
  visible?: boolean
}

function Notifications({
  userEmail,
  type,
  onMessageAction,
  visible = true,
}: NotificationsProps) {
  const { notifications, loading, refreshNotifications } =
    useNotificationContext()
  const [localNotifications, setLocalNotifications] = useState<Notification[]>(
    []
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pendingNotification, setPendingNotification] =
    useState<Notification | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [step, setStep] = useState<
    'idle' | 'sign' | 'hand' | 'validating' | 'done'
  >('idle')
  const [signStatus, setSignStatus] = useState('')
  const [handStatus, setHandStatus] = useState('')
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const sigCanvasRef = useRef<any>(null)
  const [contractId, setContractId] = useState<string | null>(null)
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrVerified, setQrVerified] = useState(false)
  const router = useRouter()
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmMsg, setConfirmMsg] = useState('')
  const [confirmContractId, setConfirmContractId] = useState<string | null>(
    null
  )
  const [showExpireModal, setShowExpireModal] = useState(false)
  const [showRenewModal, setShowRenewModal] = useState(false)

  React.useEffect(() => {
    setLocalNotifications(notifications)
  }, [notifications])

  const handleNotificationClick = (notification: Notification) => {
    if (
      notification.message?.includes('만료') ||
      notification.message?.includes('거부')
    ) {
      setShowExpireModal(true)
      return
    }
    setSelectedId((notification as any)._id)
    setPendingNotification(notification)
    const cid =
      notification.contractId ||
      notification.message.match(/contractId:([\w\d]+)/)?.[1] ||
      (notification as any)._id ||
      null
    setContractId(cid)
    if (notification.type === 'message') {
      const fileName = notification.message.split(' 계약서가 도착')[0] || ''
      const senderEmail = notification.senderEmail
        ? safeDecryptEmailNode(notification.senderEmail)
        : ''
      setConfirmMsg(
        `${senderEmail} 님에게 ${fileName} 계약서가 도착했습니다. 계약서를 수신하시겠습니까?`
      )
      setConfirmContractId(cid)
      setShowConfirmModal(true)
    }
  }

  const handleQrSuccess = () => {
    setShowQrModal(false)
    setQrVerified(true)
    setStep('sign')
  }

  const handleQrCancel = () => {
    setShowQrModal(false)
    setStep('idle')
  }

  const handleSign = async () => {
    setSignStatus('전자서명 중...')
    try {
      if (!contractId || !userEmail) throw new Error('필수 정보 없음')
      const res = await fetch(`/api/contract/${contractId}`)
      const contract = await res.json()
      if (!res.ok) throw new Error(contract.message || '계약서 조회 실패')
      if (contract.expiryDate && new Date(contract.expiryDate) < new Date()) {
        setSignStatus('계약 유효기간이 만료되었습니다.')
        setTimeout(() => setSignStatus(''), 1500)
        setStep('idle')
        return
      }
      const signRes = await fetch('/api/digital-sign/digital-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          hash: contract.fileHash,
          contractId,
        }),
      })
      const signData = await signRes.json()
      if (!signRes.ok) throw new Error(signData.message || '전자서명 실패')
      setSignStatus('전자서명 완료!')
      setStep('hand')
    } catch (e) {
      setSignStatus(
        '전자서명 실패: ' + (e instanceof Error ? e.message : String(e))
      )
      setStep('idle')
    }
  }

  const handleHandSign = async () => {
    setHandStatus('손글씨 서명 처리 중...')
    try {
      if (!contractId) throw new Error('contractId 없음')
      const sigData = sigCanvasRef.current
        ?.getTrimmedCanvas()
        ?.toDataURL('image/png')
      if (!sigData) throw new Error('서명 데이터 없음')
      const hash = sha256(sigData).toString(encHex)
      const res = await fetch(`/api/contract/${contractId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureImage: sigData,
          signatureImageHash: hash,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || '손글씨 서명 실패')
      if (data.expiryDate && new Date(data.expiryDate) < new Date()) {
        setHandStatus('계약 유효기간이 만료되었습니다.')
        setTimeout(() => setHandStatus(''), 1500)
        setStep('idle')
        return
      }
      setHandStatus('서명이 성공적으로 완료되었습니다')
      setStep('done')
    } catch (e) {
      setHandStatus(
        '손글씨 서명 실패: ' + (e instanceof Error ? e.message : String(e))
      )
      setStep('idle')
    }
  }

  const clearSig = () => sigCanvasRef.current?.clear()

  const handleConfirm = async () => {
    setShowConfirmModal(false)
    if (confirmContractId) {
      await fetch(`/api/contract/${confirmContractId}`)
      await fetch('/api/contract/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId: confirmContractId, received: true }),
      })
      if (onMessageAction) {
        onMessageAction(confirmContractId)
        setTimeout(() => onMessageAction(confirmContractId), 500)
      }
    }
    setConfirmContractId(null)
    setConfirmMsg('')
  }

  const handleReject = async () => {
    setShowConfirmModal(false)
    if (confirmContractId) {
      await fetch('/api/contract/receive', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId: confirmContractId, rejected: true }),
      })
      if (onMessageAction) {
        onMessageAction(confirmContractId)
        setTimeout(() => onMessageAction(confirmContractId), 500)
      }
    }
    setConfirmContractId(null)
    setConfirmMsg('')
  }

  return (
    <div style={{ display: visible ? undefined : 'none' }}>
      <NotificationList
        notifications={localNotifications
          .filter((n) => !type || n.type === type)
          .filter((n) =>
            filter === 'all' ? true : filter === 'unread' ? !n.read : n.read
          )}
        loading={loading}
        selectedId={selectedId}
        onNotificationClick={handleNotificationClick}
        filter={filter}
        setFilter={setFilter}
        onRead={(id) => {
          setLocalNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
          )
        }}
        onDelete={(id) => {
          setLocalNotifications((prev) => prev.filter((n) => n.id !== id))
        }}
      />
      {showQrModal && (
        <QrModal
          onQrSuccess={handleQrSuccess}
          qrVerified={qrVerified}
          contractId={contractId || ''}
          qrCode={pendingNotification?.contractId || ''}
        />
      )}
      {step !== 'idle' && (
        <NotificationStepSign
          step={step}
          signStatus={signStatus}
          handStatus={handStatus}
          onSign={handleSign}
          onHandSign={handleHandSign}
          sigCanvasRef={sigCanvasRef}
          clearSig={clearSig}
          isValid={isValid}
          onClose={() => {
            setStep('idle')
            setSignStatus('')
            setHandStatus('')
            setIsValid(null)
          }}
        />
      )}
      {showConfirmModal &&
        (() => {
          return (
            <ConfirmModal
              message={confirmMsg}
              onConfirm={handleConfirm}
              onCancel={handleReject}
              integrityMsg=""
            />
          )
        })()}
      {showExpireModal && (
        <ConfirmModal
          message="계약서가 만료/거부되었습니다. 만료일 연장/재계약 하시겠습니까?"
          onConfirm={() => {
            setShowExpireModal(false)
            setShowRenewModal(true)
          }}
          onCancel={() => {
            setShowExpireModal(false)
            router.push('/contract')
          }}
        />
      )}
    </div>
  )
}

export default Notifications
