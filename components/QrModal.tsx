import React, { useEffect } from 'react'
import VerifyQR from './VerifyQR'
import { QRCodeCanvas } from 'qrcode.react'

interface QrModalProps {
  onQrSuccess: () => void
  qrVerified: boolean
  qrCode: string
  contractId: string
}

export default function QrModal({
  onQrSuccess,
  qrVerified,
  qrCode,
  contractId,
}: QrModalProps) {
  useEffect(() => {
    console.log('[QrModal] contractId:', contractId)
    console.log('[QrModal] qrCode:', qrCode)
    if (!qrCode) {
      console.warn(
        '[QrModal] qrCode가 빈 값입니다. 상위 컴포넌트에서 contracts, signContractId, foundContract, foundContract.signature.qrCode를 콘솔로 찍어 원인을 추적하세요.'
      )
    }
  }, [contractId, qrCode])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#0008',
        zIndex: 2100,
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
          boxShadow: '0 2px 24px #0003',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <h2 style={{ fontSize: 28, marginBottom: 24 }}>QR 코드 인증</h2>
        <div style={{ marginBottom: 32 }}>
          <QRCodeCanvas value={qrCode || 'no-qr'} size={180} />
        </div>
        <VerifyQR contractId={contractId} onSuccess={onQrSuccess} />
        {qrVerified && (
          <div style={{ color: 'green', marginTop: 24, fontSize: 20 }}>
            인증 성공! 서명 단계로 이동합니다...
          </div>
        )}
      </div>
    </div>
  )
}
