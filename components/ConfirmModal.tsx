import React from 'react'

interface ConfirmModalProps {
  message: string
  onConfirm: () => void
  onCancel?: () => void
  integrityMsg?: string
  children?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
}

export default function ConfirmModal({
  message,
  onConfirm,
  onCancel,
  integrityMsg = '',
  children,
  confirmLabel = '확인',
  cancelLabel = '취소',
}: ConfirmModalProps) {
  // console.log('ConfirmModal 렌더링됨, message:', message)

  return (
    <div
      className="confirm-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#0008',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          padding: 32,
          minWidth: 320,
          boxShadow: '0 2px 16px #0003',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: 18 }}>
          <b>{message}</b>
          {children}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 10,
            justifyContent: 'center',
          }}
        >
          <button
            onClick={onConfirm}
            style={{
              background: '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 18px',
              fontWeight: 500,
            }}
          >
            {confirmLabel}
          </button>
        </div>
        {integrityMsg && (
          <div
            style={{
              color: integrityMsg.includes('완료') ? 'green' : 'red',
              fontWeight: 600,
            }}
          >
            {integrityMsg}
          </div>
        )}
      </div>
    </div>
  )
}
