import React, { RefObject } from 'react'
import SignatureCanvas from 'react-signature-canvas'

interface NotificationStepSignProps {
  step: 'sign' | 'hand' | 'validating' | 'done'
  signStatus: string
  handStatus: string
  onSign: () => void
  onHandSign: () => void
  sigCanvasRef: RefObject<any>
  clearSig: () => void
  isValid: boolean | null
  onClose: () => void
}

const NotificationStepSign: React.FC<NotificationStepSignProps> = ({
  step,
  signStatus,
  handStatus,
  onSign,
  onHandSign,
  sigCanvasRef,
  clearSig,
  isValid,
  onClose,
}) => {
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
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 48,
          minWidth: 480,
          boxShadow: '0 4px 32px #0002',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {step === 'sign' && (
          <>
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
              전자서명
            </div>
            <div style={{ marginBottom: 24, fontSize: 18 }}>
              개인키로 전자서명을 진행합니다.
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
              onClick={onSign}
            >
              전자서명
            </button>
            {signStatus && (
              <div
                style={{
                  marginTop: 12,
                  color: signStatus.includes('완료') ? 'green' : '#888',
                }}
                aria-live="polite"
              >
                {signStatus}
              </div>
            )}
          </>
        )}
        {step === 'hand' && (
          <>
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
              손글씨 서명
            </div>
            <div style={{ marginBottom: 24, fontSize: 18 }}>
              아래에 손글씨로 서명해 주세요.
            </div>
            <div
              style={{
                margin: '0 auto 16px',
                background: '#f4f4f4',
                borderRadius: 8,
                border: '1px solid #eee',
                width: 320,
                height: 120,
              }}
            >
              <SignatureCanvas
                ref={sigCanvasRef}
                penColor="#1976d2"
                backgroundColor="#f4f4f4"
                canvasProps={{
                  width: 320,
                  height: 120,
                  style: { borderRadius: 8 },
                }}
              />
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
              onClick={onHandSign}
            >
              손글씨 서명 제출
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
                marginLeft: 8,
              }}
              onClick={clearSig}
            >
              지우기
            </button>
            {handStatus && (
              <div
                style={{
                  marginTop: 10,
                  color: handStatus.includes('완료') ? 'green' : '#888',
                }}
              >
                {handStatus}
              </div>
            )}
          </>
        )}
        {step === 'validating' && (
          <div style={{ fontSize: 22, color: '#0074ff', fontWeight: 600 }}>
            계약 유효기간 체크 중...
          </div>
        )}
        {step === 'done' && (
          <div style={{ fontSize: 26, color: '#009e3c', fontWeight: 700 }}>
            서명이 성공적으로 완료되었습니다!
          </div>
        )}
        <button style={{ marginTop: 20 }} onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  )
}

export default NotificationStepSign
