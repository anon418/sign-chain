import React, { useState } from 'react'
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
  const [localContracts, setLocalContracts] = useState(contracts)
  const [isDeletingIds, setIsDeletingIds] = useState<string[]>([])

  React.useEffect(() => {
    setLocalContracts(contracts)
  }, [contracts])

  const handleDelete = async (id: string) => {
    setIsDeletingIds((prev) => [...prev, id])
    setTimeout(async () => {
      await fetch('/api/contract/receive', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId: id, deletedBy: userId }),
      })
      setLocalContracts((prev) => prev.filter((c) => c._id !== id))
      setIsDeletingIds((prev) => prev.filter((delId) => delId !== id))
      if (refreshContracts) refreshContracts()
    }, 300)
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
            localContracts.filter(
              (c) => c.uploaderId === userId && c.status !== 'expired'
            ).length === 0 ? (
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
              localContracts
                .filter(
                  (c) => c.uploaderId === userId && c.status !== 'expired'
                )
                .map((c) => (
                  <li
                    key={c._id}
                    style={{
                      opacity: isDeletingIds.includes(c._id) ? 0 : 1,
                      height: isDeletingIds.includes(c._id) ? 0 : undefined,
                      transition: 'opacity 0.3s, height 0.3s',
                      overflow: 'hidden',
                      paddingLeft: 20,
                      paddingTop: 24,
                      paddingBottom: 24,
                      color: '#888',
                      fontSize: 16,
                      textAlign: 'center',
                    }}
                  >
                    <ContractListItem
                      contract={c}
                      type="sent"
                      onPreview={() => setSelected(c)}
                      onDelete={handleDelete}
                    />
                  </li>
                ))
            )
          ) : localContracts.filter(
              (c) =>
                c.recipientId === userId &&
                c.status !== 'rejected' &&
                c.status !== 'expired'
            ).length === 0 ? (
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
            localContracts
              .filter(
                (c) =>
                  c.recipientId === userId &&
                  c.status !== 'rejected' &&
                  c.status !== 'expired'
              )
              .map((c) => (
                <li
                  key={c._id}
                  style={{
                    opacity: isDeletingIds.includes(c._id) ? 0 : 1,
                    height: isDeletingIds.includes(c._id) ? 0 : undefined,
                    transition: 'opacity 0.3s, height 0.3s',
                    overflow: 'hidden',
                    paddingLeft: 20,
                    paddingTop: 24,
                    paddingBottom: 24,
                    color: '#888',
                    fontSize: 16,
                    textAlign: 'center',
                  }}
                >
                  <ContractListItem
                    contract={c}
                    type="received"
                    onPreview={() => setSelected(c)}
                    onSign={() => setSignTarget(c)}
                    onDelete={handleDelete}
                  />
                </li>
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
    </div>
  )
}

