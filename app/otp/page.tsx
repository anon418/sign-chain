// OtpVerifyPage.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const OtpVerifyPage = () => {
  const [qrCode, setQrCode] = useState<string>('')
  const [message, setMessage] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const router = useRouter()

  useEffect(() => {
    const fetchQrCode = async () => {
      try {
        const res = await fetch('/api/otp/setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        const data = await res.json()
        if (res.ok) {
          setQrCode(data.qrCodeUrl)
        } else {
          setMessage(`❌ ${data.message || 'QR 코드 생성 실패'}`)
        }
      } catch (err) {
        setMessage('⚠️ 서버 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchQrCode()
  }, [router])

  return (
    <div style={{ padding: 40, maxWidth: 500, margin: 'auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        OTP 설정
      </h1>

      {loading ? (
        <p>QR 코드를 불러오는 중...</p>
      ) : qrCode ? (
        <>
          <p style={{ marginBottom: 10 }}>
            📱 아래 QR 코드를 Google Authenticator 등으로 스캔하세요.
          </p>
          <img
            src={qrCode}
            alt="OTP QR Code"
            style={{ border: '1px solid #ccc', padding: 10 }}
          />
          <button
            onClick={() => router.push('/otp/verify')}
            style={{
              marginTop: 20,
              padding: '10px 15px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
            }}
          >
            OTP 코드 입력
          </button>
        </>
      ) : (
        <p style={{ color: 'red' }}>{message}</p>
      )}
    </div>
  )
}

export default OtpVerifyPage
