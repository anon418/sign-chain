'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OtpSetupPage() {
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
    <div
      className="card"
      style={{
        minHeight: 420,
        maxWidth: 400,
        margin: '60px auto',
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 2px 16px #e3e8f7',
        border: '1px solid #e3e8f7',
      }}
    >
      <h1
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: '#1a237e',
          marginBottom: 18,
          textAlign: 'center',
        }}
      >
        OTP 설정
      </h1>
      {loading ? (
        <p style={{ color: '#1a237e', textAlign: 'center', fontWeight: 500 }}>
          QR 코드를 불러오는 중...
        </p>
      ) : qrCode ? (
        <>
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <span style={{ color: '#38a1e6', fontWeight: 700, fontSize: 17 }}>
              Google Authenticator 등으로
            </span>
            <br />
            <span style={{ color: '#38a1e6', fontWeight: 700, fontSize: 16 }}>
              아래 QR 코드를 스캔하세요.
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 18,
            }}
          >
            <img
              src={qrCode}
              alt="OTP QR Code"
              style={{
                width: 180,
                height: 180,
                border: '2.5px solid #3b5cff',
                borderRadius: 12,
                background: '#eaf1ff',
                padding: 8,
                boxShadow: '0 2px 8px #e3e8f7',
              }}
            />
          </div>
          <button
            onClick={() => router.push('/otp/verify?mode=register')}
            style={{
              width: '100%',
              padding: '12px 0',
              borderRadius: 6,
              background: '#38a1e6',
              color: '#fff',
              fontWeight: 700,
              fontSize: 17,
              border: 'none',
              marginTop: 8,
              marginBottom: 4,
              boxShadow: '0 1px 4px #e3e8f7',
              transition: 'background 0.18s',
              cursor: 'pointer',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#2386c8')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#38a1e6')}
          >
            OTP 코드 입력
          </button>
        </>
      ) : (
        <div style={{ color: '#d32f2f', marginTop: 24, textAlign: 'center' }}>
          <p>
            {message ||
              '이미 인증된 계정입니다. 로그인 후 OTP 인증을 진행하세요.'}
          </p>
          <div
            style={{
              marginTop: 24,
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
            }}
          >
            <button
              onClick={() => router.push('/login')}
              style={{
                background: '#1a237e',
                color: '#fff',
                borderRadius: 6,
                padding: '8px 24px',
                fontWeight: 600,
                border: 'none',
                fontSize: 16,
              }}
            >
              로그인
            </button>
            <button
              onClick={() => router.push('/register')}
              style={{
                background: '#bdbdbd',
                color: '#fff',
                borderRadius: 6,
                padding: '8px 24px',
                fontWeight: 600,
                border: 'none',
                fontSize: 16,
              }}
            >
              회원가입
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
