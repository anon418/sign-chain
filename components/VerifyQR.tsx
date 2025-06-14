import React, { useState } from 'react'
// @ts-ignore: Importing qr-scanner for browser use
import QrScanner from 'qr-scanner'
import axios from 'axios'

const VerifyQR: React.FC<{
  contractId: string
  onSuccess?: (qrData?: string) => void
}> = ({ contractId, onSuccess }) => {
  const [message, setMessage] = useState('')
  const [scannedData, setScannedData] = useState<string | null>(null)

  // 이미지 업로드 QR 인식만 지원
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      QrScanner.scanImage(file, { returnDetailedScanResult: true })
        .then((result: { data: string }) => {
          setScannedData(result.data)
          setMessage('QR 코드가 인식되었습니다. 아래 확인 버튼을 눌러주세요.')
          console.log('[QR 인식 성공]', result.data)
        })
        .catch((err) => {
          setMessage('QR 이미지 인식 실패')
          console.log('[QR 인식 실패]', err)
        })
    }
  }

  const handleConfirm = async () => {
    if (!scannedData || !scannedData.trim()) {
      setMessage(
        'QR 코드가 인식되지 않았습니다. 이미지를 다시 업로드해 주세요.'
      )
      console.log('[QR 확인 실패] 스캔 데이터 없음')
      return
    }
    try {
      console.log(
        '[QR 확인 요청] contractId:',
        contractId,
        'qrCode:',
        scannedData.trim()
      )
      const res = await axios.post('/api/Qr/verify-qr', {
        contractId,
        qrCode: scannedData.trim(),
      })
      console.log('[QR 확인 응답]', res.data)
      if (res.data.success) {
        setMessage('인증 성공! 서명 단계로 이동합니다...')
        if (onSuccess) onSuccess(scannedData)
      } else {
        setMessage(
          res.data.message || 'QR 코드 인증 실패: 올바른 QR 코드가 아닙니다.'
        )
        console.log('[QR 인증 실패]', res.data)
      }
    } catch (e: any) {
      setMessage(e?.response?.data?.message || 'QR 코드 인증 실패: 서버 오류')
      console.log('[QR 인증 예외]', e)
    }
  }

  return (
    <div
      style={{
        minWidth: 320,
        maxWidth: 400,
        margin: '0 auto',
        padding: 32,
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 2px 16px #e3e8f7',
        border: '1px solid #e3e8f7',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#1a237e',
          marginBottom: 18,
          textAlign: 'center',
        }}
      >
        QR 코드 업로드
      </h2>
      <div style={{ marginBottom: 18 }}>
        <input type="file" accept="image/*" onChange={handleFileChange} />
      </div>
      <div
        style={{
          fontSize: 14,
          color: '#1a237e',
          marginBottom: 24,
          fontWeight: 500,
        }}
      >
        QR 이미지 파일을 업로드하세요.
        <br />
        <span style={{ color: '#3b5cff', fontWeight: 600 }}>
          (화면 캡처/저장 후 업로드 가능)
        </span>
      </div>
      {message && (
        <p
          style={{
            margin: '24px 0 0 0',
            fontSize: 16,
            color: '#3b5cff',
            fontWeight: 600,
          }}
        >
          {message}
        </p>
      )}
      {scannedData && (
        <button
          className="clickable"
          style={{
            marginTop: 20,
            padding: '12px 32px',
            fontSize: 17,
            background: '#1a237e',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            boxShadow: '0 1px 4px #e3e8f7',
          }}
          onClick={handleConfirm}
        >
          확인
        </button>
      )}
    </div>
  )
}

export default VerifyQR
