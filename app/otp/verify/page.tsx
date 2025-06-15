'use client'
export const dynamic = 'force-dynamic'

import React, {
  useState,
  KeyboardEvent,
  useRef,
  useEffect,
  Suspense,
} from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { savePrivateKey } from '../../../utils/indexedDB'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { encryptLocal } from '../../../utils/crypto'
import { authFetch } from '../../../utils/authFetch'

function validateOtp(otp: string) {
  return /^\d{6}$/.test(otp)
}

function OtpVerifyPageInner() {
  const [otpCode, setOtpCode] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState<{ otp?: boolean; pw?: boolean }>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showBackupAlert, setShowBackupAlert] = useState(false)
  const [redirectTo, setRedirectTo] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') // 'register' or 'login'
  const otpInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const isRegister = mode === 'register'
  const isValid = validateOtp(otpCode) && (!isRegister || password.length >= 6)

  useEffect(() => {
    if (otpInputRef.current) {
      otpInputRef.current.focus()
    }
  }, [])

  async function handleOtpVerify(e?: React.FormEvent | KeyboardEvent) {
    if (e) e.preventDefault()
    if (!isValid) {
      setError('입력값을 다시 확인하세요.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const response = await authFetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: otpCode }),
        credentials: 'include',
      })
      // console.log('RAW response:', response)
      let data
      try {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          data = await response.json()
        } else {
          data = { message: await response.text() }
        }
        // console.log('Parsed data:', data)
      } catch (parseErr) {
        // console.error('응답 파싱 실패:', parseErr, response)
        setError('응답 파싱 실패: ' + parseErr)
        setLoading(false)
        return
      }
      if (data.redirectTo) {
        // OTP 인증 성공 시 서버에서 받은 개인키 저장 (회원가입일 때만)
        if (isRegister) {
          try {
            if (!data.userId) throw new Error('userId 없음')
            if (!data.privateKey)
              throw new Error('서버에서 개인키를 받지 못했습니다.')
            await savePrivateKey(data.userId, data.privateKey, password)
            localStorage.setItem('userId', await encryptLocal(data.userId))
            if (data.email)
              localStorage.setItem('email', await encryptLocal(data.email))
            // === 공개키 비교 디버깅 코드 및 alert 후 리다이렉트 ===
            if (data.publicKey) {
              try {
                const forge = (await import('node-forge')).default
                const privateKey = forge.pki.privateKeyFromPem(data.privateKey)
                const publicKeyFromPrivate = forge.pki.setRsaPublicKey(
                  privateKey.n,
                  privateKey.e
                )
                const publicKeyPemFromPrivate =
                  forge.pki.publicKeyToPem(publicKeyFromPrivate)
                const dbPublicKey = data.publicKey
                const isMatch = publicKeyPemFromPrivate === dbPublicKey
                setRedirectTo(data.redirectTo)
                setShowBackupAlert(true)
                setLoading(false)
                return // 모달 확인 시 이동
              } catch (e) {
                // console.error('[DEBUG] 공개키 비교 중 오류:', e)
                setLoading(false)
                return
              }
            }
            // publicKey가 없으면 바로 setLoading(false)
            setLoading(false)
            return
            // ===
          } catch (err) {
            setError(
              '개인키 저장 오류: ' +
                (err instanceof Error ? err.message : String(err))
            )
            setLoading(false)
            return
          }
        } else {
          // 로그인 모드: 안내 메시지 먼저 띄우고, 확인 시 이동
          try {
            if (data.userId) {
              localStorage.setItem('userId', await encryptLocal(data.userId))
              // 비밀번호 입력 프롬프트 및 개인키 복호화 코드 제거
            }
          } catch (e) {
            // 무시: 개인키가 없거나 복호화 실패
          }
          setRedirectTo(data.redirectTo)
          setShowBackupAlert(true)
          setLoading(false)
          return
        }
        router.push(data.redirectTo)
        return
      } else {
        setError(data.message || 'OTP 인증 실패')
        setLoading(false)
      }
    } catch (err) {
      setError('인증 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="card">
      {loading && <LoadingSpinner />}
      <h1>OTP 인증</h1>
      <p style={{ marginBottom: isRegister ? 0 : 10 }}>
        📱 Google Authenticator 등에서 OTP 코드를 입력하세요.{' '}
        {isRegister && (
          <span style={{ color: '#1a237e', fontSize: 15, fontWeight: 500 }}>
            <b>
              아래 비밀번호는 전자서명 및 파일 복호화, 개인키 복구 등에
              사용됩니다.
            </b>
            <br />
            <span style={{ color: '#d32f2f', fontWeight: 500 }}>
              로그인/회원가입 비밀번호와 다를 수 있으니 반드시 기억해 주세요.
            </span>
          </span>
        )}
      </p>
      <form onSubmit={handleOtpVerify} autoComplete="off">
        <input
          ref={otpInputRef}
          value={otpCode}
          onChange={(e) => {
            setOtpCode(e.target.value)
            setTouched((t) => ({ ...t, otp: true }))
            setError('')
          }}
          placeholder="OTP 코드 입력 (6자리 숫자)"
          style={{
            marginTop: 10,
            borderColor:
              touched.otp && !validateOtp(otpCode) ? 'red' : undefined,
          }}
        />
        {touched.otp && !validateOtp(otpCode) && (
          <div style={{ color: 'red', fontSize: 13 }}>
            6자리 숫자를 입력하세요.
          </div>
        )}
        {isRegister && (
          <>
            <div style={{ height: 12 }} />
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setTouched((t) => ({ ...t, pw: true }))
                setError('')
              }}
              placeholder="전자서명용 비밀번호 (6자리 이상)"
              style={{
                marginTop: 0,
                borderColor:
                  touched.pw && password.length < 6 ? 'red' : undefined,
              }}
            />
            {touched.pw && password.length < 6 && (
              <div style={{ color: 'red', fontSize: 13 }}>
                6자리 이상 비밀번호를 입력하세요.
              </div>
            )}
          </>
        )}
        <button
          type="submit"
          disabled={!isValid}
          style={{ width: '100%', marginTop: 12 }}
        >
          OTP 인증
        </button>
      </form>
      {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
      {mode === 'login' && <></>}
      {/* 안내 모달 */}
      {showBackupAlert && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 8,
              padding: 32,
              boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
              minWidth: 320,
              textAlign: 'center',
            }}
          >
           <div style={{ fontSize: 22, marginBottom: 16 }}>🔒</div>
            <div style={{ fontSize: 17, marginBottom: 24 }}>
              {isRegister
                ? '프로필에서 개인키 백업 후 서비스를 이용해주세요.'
                : '프로필에서 개인키 복구 후 서비스를 이용해주세요.'}
            </div>
            <button
              style={{
                background: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                padding: '10px 24px',
                fontSize: 16,
                cursor: 'pointer',
              }}
              onClick={() => {
                setShowBackupAlert(false)
                if (redirectTo) router.push(redirectTo)
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OtpVerifyPage() {
  return (
    <Suspense>
      <OtpVerifyPageInner />
    </Suspense>
  )
}
