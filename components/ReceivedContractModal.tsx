import React, { useEffect, useState } from 'react'
import { safeDecryptEmailNode } from './NotificationList'

interface SignatureInfo {
  signed: boolean
  signer?: string
  signatureImageDigital?: string
}

interface Contract {
  _id: string
  title: string
  senderEmail: string
  recipientEmail: string
  filename: string
  status: string
  createdAt: string
  updatedAt: string
  filePath: string
  expirationDate: string
  signature?: SignatureInfo
  received: boolean
}

interface Log {
  _id: string
  contractId: string
  encapsulation: string
  tag: string
  hash: string
  previousHash?: string
  filename: string
  createdAt: string
}

export default function ReceivedContractModal({
  contract,
  show,
  onClose,
}: {
  contract: Contract
  show: boolean
  onClose: () => void
}) {
  const [logs, setLogs] = useState<Log[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  useEffect(() => {
    if (!show || !contract) return
    setLogsLoading(true)
    fetch(`/api/logs/${contract._id}`)
      .then((res) => res.json())
      .then((data) => setLogs(data.logs || []))
      .finally(() => setLogsLoading(false))
  }, [show, contract])

  if (!show || !contract) return null

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 32,
          minWidth: 400,
          maxWidth: 600,
          width: '95vw',
          boxShadow: '0 4px 24px #0002',
          textAlign: 'left',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
          {contract.title}
        </div>
        <div style={{ fontSize: 14, color: '#1976d2', marginBottom: 4 }}>
          보낸 사람: {safeDecryptEmailNode(contract.senderEmail)}
        </div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
          수신자: {safeDecryptEmailNode(contract.recipientEmail)}
        </div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
          업로드: {new Date(contract.createdAt).toLocaleString()}
        </div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
          최종 처리: {new Date(contract.updatedAt).toLocaleString()}
        </div>
        <div
          style={{
            fontSize: 13,
            color:
              contract.status === 'signed'
                ? 'green'
                : contract.status === 'rejected'
                ? '#ff5252'
                : '#888',
            marginBottom: 8,
          }}
          aria-label={`상태: ${contract.status}`}
        >
          상태: {contract.status}
        </div>
        {contract.status === 'rejected' && (
          <div
            style={{ color: '#ff5252', fontWeight: 500, marginBottom: 8 }}
            aria-live="polite"
          >
            계약서가 거부/반려되었습니다.
          </div>
        )}
        <a
          href={contract.filePath}
          download
          style={{
            color: '#1976d2',
            fontWeight: 500,
            textDecoration: 'underline',
            fontSize: 15,
          }}
        >
          계약서 다운로드
        </a>
        {contract.signature?.signatureImageDigital && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>손글씨 서명</div>
            <img
              src={contract.signature.signatureImageDigital}
              alt="손글씨 서명"
              style={{ width: 180, border: '1px solid #eee', borderRadius: 6 }}
            />
          </div>
        )}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>진행 이력</div>
          {logsLoading ? (
            <div style={{ color: '#888' }}>이력 불러오는 중...</div>
          ) : logs.length === 0 ? (
            <div style={{ color: '#888' }}>이력이 없습니다.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {logs.map((log) => (
                <li key={log._id} style={{ marginBottom: 8, fontSize: 14 }}>
                  <span style={{ fontWeight: 500 }}>{log.encapsulation}</span> -{' '}
                  {log.tag}{' '}
                  <span style={{ color: '#888' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button style={{ marginTop: 24 }} onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  )
}
