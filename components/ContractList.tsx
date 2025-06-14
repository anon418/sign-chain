import React, { useState } from 'react'
import { FaTrashAlt, FaSearch } from 'react-icons/fa'
import dynamic from 'next/dynamic'
import ContractSignFlow from './ContractSignFlow'
import ContractListItem from './ContractListItem'

interface Contract {
  _id: string
  title: string
  status: string
  createdAt: string
  signed: boolean
  recipientEmail?: string
  uploaderId: string
  recipientId: string
  signature?: any // 실제로는 ISignatureInfo
  deletedBy?: string[]
  received?: boolean
  filePath?: string
  expirationDate?: string
  senderEmail?: string
  qrCode?: string
}

interface ContractListProps {
  contracts: Contract[]
  userId: string
  refreshContracts?: () => void
}

const ContractPreviewModal = dynamic(() => import('./ContractPreviewModal'), {
  ssr: false,
})

export default function ContractList({
  contracts,
  userId,
  refreshContracts,
}: ContractListProps) {
  const [selected, setSelected] = useState<Contract | null>(null)
  const [boxType, setBoxType] = useState<'sent' | 'received'>('sent')
  const [signTarget, setSignTarget] = useState<Contract | null>(null)
  const [showDeleteBox, setShowDeleteBox] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const sent = contracts.filter(
    (c) => c.uploaderId === userId && c.status !== 'expired'
  )
  const received = contracts.filter(
    (c) =>
      c.recipientId === userId &&
      c.status !== 'rejected' &&
      c.status !== 'expired'
  )

  React.useEffect(() => {
    if (!refreshContracts) return
    const interval = setInterval(() => {
      refreshContracts()
    }, 10000)
    return () => clearInterval(interval)
  }, [refreshContracts])

  const handleDeleteClick = (id: string) => {
    setPendingDeleteId(id)
    setShowDeleteBox(true)
  }

  const handleDeleteConfirm = async () => {
    if (pendingDeleteId) {
      await fetch(`/api/contract/${pendingDeleteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletedBy: userId }),
      })
      if (refreshContracts) refreshContracts()
    }
    setShowDeleteBox(false)
    setPendingDeleteId(null)
  }

  const handleDeleteCancel = () => {
    setShowDeleteBox(false)
    setPendingDeleteId(null)
  }

  return (
    <div style={{ marginTop: 30 }}>
      <div style={{ margin: '0 0 16px 0', textAlign: 'right' }}>
        <select
          value={boxType}
          onChange={(e) => setBoxType(e.target.value as 'sent' | 'received')}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            border: '1px solid #ccc',
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          <option value="sent">송신함</option>
          <option value="received">수신함</option>
        </select>
      </div>
      <div
        style={{
          maxWidth: 600,
          margin: '0 auto',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 16px #0001',
          padding: 0,
        }}
      >
        <ul
          style={{
            listStyle: 'none',
            padding: '8px 0',
            minHeight: 120,
            maxHeight: 350,
            overflowY: 'auto',
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            background: '#fff',
            margin: 0,
          }}
        >
          {boxType === 'sent' ? (
            sent.length === 0 ? (
              <li
                style={{
                  paddingLeft: 20,
                  paddingTop: 24,
                  paddingBottom: 24,
                  color: '#888',
                  fontSize: 16,
                  textAlign: 'center',
                }}
              >
                보낸 계약서가 없습니다.
              </li>
            ) : (
              sent.map((c) => (
                <ContractListItem
                  key={c._id}
                  contract={c}
                  type="sent"
                  onPreview={() => setSelected(c)}
                  onDelete={handleDeleteClick}
                />
              ))
            )
          ) : received.length === 0 ? (
            <li
              style={{
                paddingLeft: 20,
                paddingTop: 24,
                paddingBottom: 24,
                color: '#888',
                fontSize: 16,
                textAlign: 'center',
              }}
            >
              받은 계약서가 없습니다.
            </li>
          ) : (
            received.map((c) => (
              <ContractListItem
                key={c._id}
                contract={c}
                type="received"
                onPreview={() => setSelected(c)}
                onSign={() => setSignTarget(c)}
                onDelete={handleDeleteClick}
              />
            ))
          )}
        </ul>
      </div>
      {/* 미리보기 모달 */}
      {selected && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.25)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 32,
              minWidth: 480,
              boxShadow: '0 4px 24px #0002',
              textAlign: 'center',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ContractPreviewModal
              contract={selected}
              onClose={() => {
                setSelected(null)
                if (refreshContracts) refreshContracts()
              }}
              type={boxType}
            />
          </div>
        </div>
      )}
      {/* 서명 플로우 모달 */}
      {signTarget && (
        <ContractSignFlow
          contract={signTarget}
          onComplete={() => {
            setSignTarget(null)
            if (refreshContracts) refreshContracts()
          }}
          onClose={() => setSignTarget(null)}
        />
      )}
      {/* 삭제 확인 모달 */}
      {showDeleteBox && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.35)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 32,
              minWidth: 320,
              boxShadow: '0 4px 24px #0002',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 16 }}>
              정말 삭제하시겠습니까?
            </div>
            <button
              style={{
                background: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '8px 24px',
                fontWeight: 600,
                fontSize: 16,
                cursor: 'pointer',
                marginRight: 8,
              }}
              onClick={handleDeleteConfirm}
            >
              확인
            </button>
            <button
              style={{
                background: '#eee',
                color: '#333',
                border: 'none',
                borderRadius: 6,
                padding: '8px 24px',
                fontWeight: 500,
                fontSize: 16,
                cursor: 'pointer',
              }}
              onClick={handleDeleteCancel}
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
