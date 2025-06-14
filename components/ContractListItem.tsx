import React, { useState } from 'react'
import { FaTrashAlt, FaSearch, FaDownload } from 'react-icons/fa'
import { useRouter } from 'next/navigation'
import { downloadContractFile } from './ContractDownloadHandler'

interface Contract {
  _id: string
  title: string
  status: string
  createdAt: string
  filePath?: string
  senderEmail?: string
  recipientEmail?: string
  filename?: string
  signature?: {
    signatureImageDigital?: string
  }
}

interface ContractListItemProps {
  contract: Contract
  type: 'sent' | 'received'
  onPreview?: (contract: Contract) => void
  onSign?: (contract: Contract) => void
  onDelete?: (id: string) => void
}

const statusColor = (status: string) => {
  switch (status) {
    case 'uploaded':
      return '#ff9800' // 주황
    case 'signed':
      return '#4caf50' // 초록
    case 'expired':
      return '#888888' // 회색
    case 'rejected':
      return '#b71c1c' // 진빨강
    default:
      return '#888'
  }
}

const statusBg = (status: string) => {
  switch (status) {
    case 'uploaded':
      return '#fff7e6'
    case 'signed':
      return '#e6f9ed'
    case 'expired':
      return '#f4f4f4' // 연한 회색
    case 'rejected':
      return '#ffebee'
    default:
      return '#f4f4f4'
  }
}

const ContractListItem: React.FC<ContractListItemProps> = ({
  contract,
  type,
  onPreview,
  onSign,
  onDelete,
}) => {
  const router = useRouter()
  const [showPreview, setShowPreview] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showPasswordBox, setShowPasswordBox] = useState(false)
  const [password, setPassword] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const passwordInputRef = React.useRef<HTMLInputElement>(null)

  const doDownload = async () => {
    console.log('[DEBUG][ContractListItem] doDownload 함수 진입')
    console.log('[DEBUG][ContractListItem] contract:', contract)
    console.log('[DEBUG][ContractListItem] password:', password)
    setDownloading(true)
    setDownloadError('')
    try {
      await downloadContractFile(contract._id, contract.title, password)
      setShowPasswordBox(false)
      setPassword('')
    } catch (err: any) {
      setDownloadError(err.message || '다운로드 실패')
      console.error('[DEBUG][ContractListItem] 다운로드 에러:', err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <li
      key={contract._id}
      style={{
        padding: '16px 20px',
        borderBottom: '1px solid #eee',
        color: contract.status === 'signed' ? '#4caf50' : 'black',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 8,
        marginBottom: 12,
        background: '#fff',
        position: 'relative',
        boxShadow: '0 2px 8px #0001',
        transition: 'box-shadow 0.2s',
      }}
      onMouseOver={(e) =>
        (e.currentTarget.style.boxShadow = '0 4px 16px #1976d233')
      }
      onMouseOut={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px #0001')}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <span
          style={{
            fontWeight: 700,
            fontSize: 16,
            maxWidth: '100%',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            color: '#222',
            cursor:
              type === 'received' && contract.status === 'uploaded'
                ? 'pointer'
                : 'default',
            textDecoration:
              type === 'received' && contract.status === 'uploaded'
                ? 'underline'
                : 'none',
            transition: 'text-decoration 0.15s',
          }}
          title={contract.title}
          onClick={
            type === 'received' && contract.status === 'uploaded' && onSign
              ? () => onSign(contract)
              : undefined
          }
          onMouseOver={
            type === 'received' && contract.status === 'uploaded'
              ? (e) => (e.currentTarget.style.textDecoration = 'underline')
              : undefined
          }
          onMouseOut={
            type === 'received' && contract.status === 'uploaded'
              ? (e) => (e.currentTarget.style.textDecoration = 'none')
              : undefined
          }
        >
          {(() => {
            const base = (contract.title ?? '').replace(/\.[^/.]+$/, '')
            return base.length > 14 ? base.slice(0, 14) + '...' : base
          })()}
        </span>
        <span
          style={{
            fontSize: 13,
            color: statusColor(contract.status),
            background: statusBg(contract.status),
            borderRadius: 6,
            padding: '2px 10px',
            fontWeight: 600,
            marginLeft: 10,
            minWidth: 60,
            textAlign: 'center',
            textTransform: 'capitalize',
          }}
          title={contract.status}
        >
          {contract.status}
        </span>
      </div>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>
        {type === 'sent'
          ? `수신자: ${contract.recipientEmail || '-'}`
          : `송신자: ${contract.senderEmail || '-'}`}
      </div>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>
        업로드: {new Date(contract.createdAt).toLocaleString()}
      </div>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>
        파일명: {contract.filename || contract.title}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 20,
          display: 'flex',
          gap: 8,
        }}
      >
        <button
          title="미리보기"
          onClick={() => onPreview?.(contract)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 4,
            color: '#1976d2',
            opacity: 0.7,
            transition: 'opacity 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '0.7')}
        >
          <FaSearch className="clickable" size={16} />
        </button>
        <button
          title="다운로드"
          onClick={() => setShowPasswordBox(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor:
              type === 'received' && contract.status !== 'signed'
                ? 'not-allowed'
                : 'pointer',
            padding: 4,
            borderRadius: 4,
            color: '#1976d2',
            opacity:
              type === 'received' && contract.status !== 'signed' ? 0.3 : 0.7,
            transition: 'opacity 0.2s',
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseOver={
            type === 'received' && contract.status !== 'signed'
              ? undefined
              : (e) => (e.currentTarget.style.opacity = '1')
          }
          onMouseOut={
            type === 'received' && contract.status !== 'signed'
              ? undefined
              : (e) => (e.currentTarget.style.opacity = '0.7')
          }
          disabled={type === 'received' && contract.status !== 'signed'}
        >
          <FaDownload size={15} />
        </button>
        <button
          title="삭제"
          onClick={() => setShowDeleteConfirm(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 4,
            color: '#ff5252',
            opacity: 0.7,
            transition: 'opacity 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '0.7')}
        >
          <FaTrashAlt className="clickable" size={16} />
        </button>
      </div>
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
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
              borderRadius: 16,
              boxShadow: '0 4px 32px #0003',
              padding: '40px 32px',
              minWidth: 320,
              maxWidth: '90vw',
              textAlign: 'center',
              fontSize: 18,
              color: '#222',
              fontWeight: 500,
              border: '2px solid #1976d2',
              letterSpacing: 0.5,
            }}
          >
            <div style={{ marginBottom: 18, fontSize: 20, fontWeight: 700 }}>
              계약서 삭제
            </div>
            <div style={{ marginBottom: 24 }}>
              정말로 이 계약서를 삭제하시겠습니까?
              <br />
              삭제된 계약서는 복구할 수 없습니다.
            </div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button
                onClick={async () => {
                  await fetch(`/api/contract/${contract._id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'rejected' }),
                  })
                  setShowDeleteConfirm(false)
                }}
                style={{
                  background: '#d32f2f',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                삭제
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  background: '#eee',
                  color: '#1976d2',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
      {showPasswordBox && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
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
              borderRadius: 16,
              boxShadow: '0 4px 32px #0003',
              padding: '40px 32px',
              minWidth: 320,
              maxWidth: '90vw',
              textAlign: 'center',
              fontSize: 18,
              color: '#222',
              fontWeight: 500,
              border: '2px solid #1976d2',
              letterSpacing: 0.5,
            }}
          >
            <div style={{ marginBottom: 18, fontSize: 20, fontWeight: 700 }}>
              계약서 복호화를 위한 비밀번호 입력
            </div>
            <input
              ref={passwordInputRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              style={{
                width: '90%',
                padding: '10px 12px',
                fontSize: 17,
                borderRadius: 8,
                border: '1px solid #bbb',
                marginBottom: 16,
                outline: 'none',
                letterSpacing: 1,
              }}
              autoFocus
              autoComplete="current-password"
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  doDownload()
                }
              }}
              disabled={downloading}
            />
            <div style={{ color: '#d32f2f', minHeight: 24, marginBottom: 8 }}>
              {downloadError ||
                (downloading === false && password && password.length < 6
                  ? '비밀번호가 올바르지 않습니다.'
                  : '')}
            </div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button
                onClick={doDownload}
                style={{
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: downloading ? 'not-allowed' : 'pointer',
                  opacity: downloading ? 0.6 : 1,
                }}
                disabled={downloading}
              >
                확인
              </button>
              <button
                onClick={() => {
                  setShowPasswordBox(false)
                  setPassword('')
                  setDownloadError('')
                }}
                style={{
                  background: '#eee',
                  color: '#1976d2',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: downloading ? 'not-allowed' : 'pointer',
                  opacity: downloading ? 0.6 : 1,
                }}
                disabled={downloading}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  )
}

export default ContractListItem
