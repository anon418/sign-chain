'use client'

import { useState, FormEvent, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '../../components/LoadingSpinner'
import '../../components/LoadingSpinner.css'
import ConfirmModal from '../../components/ConfirmModal'
import { encryptLocal, decryptLocal } from '../../utils/crypto'

function validateEmail(email: string) {
  return /^[\w-.]+@[\w-]+\.[a-zA-Z]{2,}$/.test(email)
}
function validatePassword(pw: string) {
  return pw.length >= 8 && /[!@#$%^&*]/.test(pw)
}

const LoginPage = () => {
  const [email, setEmail] = useState<string>('')
  const [password, setLocalPassword] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [touched, setTouched] = useState<{
    email?: boolean
    password?: boolean
  }>({})
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showCertModal, setShowCertModal] = useState(false)

  const isValid = validateEmail(email) && validatePassword(password)

  const handleLogin = async (e?: FormEvent | KeyboardEvent) => {
    if (e) e.preventDefault()
    if (!isValid) {
      setError('입력값을 다시 확인하세요.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (!response.ok) {
        if (data.message?.includes('인증서가 만료')) {
          setShowCertModal(true)
        } else {
          setError(data.message || '로그인 실패')
        }
      } else {
        localStorage.setItem('email', await encryptLocal(email))
        if (data.userId) {
          localStorage.setItem('userId', await encryptLocal(data.userId))
        }
        if (data.redirectTo) {
          if (data.redirectTo.startsWith('/otp/verify')) {
            window.location.href = data.redirectTo
          } else {
            setError('잘못된 인증 흐름입니다. 다시 시도해 주세요.')
          }
        }
      }
    } catch (error) {
      setError('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin(e)
    }
  }

  return (
    <div
      className="card"
      style={{ maxWidth: 400, margin: 'auto', padding: 32 }}
    >
      <h1 style={{ marginBottom: 24 }}>로그인</h1>
      {error && <p style={{ color: 'red', marginBottom: 16 }}>{error}</p>}
      {loading && <LoadingSpinner />}
      <form
        onSubmit={handleLogin}
        style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        <input
          type="email"
          name="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setTouched((t) => ({ ...t, email: true }))
            setError('')
          }}
          onKeyDown={handleKeyDown}
          style={{
            padding: 10,
            borderRadius: 4,
            marginBottom: 6,
            border:
              touched.email && !validateEmail(email)
                ? '1.5px solid red'
                : '1px solid #ddd',
          }}
        />
        {touched.email && !validateEmail(email) && (
          <div style={{ color: 'red', fontSize: 13, marginBottom: 8 }}>
            이메일 형식이 올바르지 않습니다.
          </div>
        )}
        <input
          type="password"
          name="password"
          placeholder="비밀번호 (8자 이상, 특수문자 포함)"
          value={password}
          onChange={(e) => {
            setLocalPassword(e.target.value)
            setTouched((t) => ({ ...t, password: true }))
            setError('')
          }}
          onKeyDown={handleKeyDown}
          style={{
            padding: 10,
            borderRadius: 4,
            marginBottom: 6,
            border:
              touched.password && !validatePassword(password)
                ? '1.5px solid red'
                : '1px solid #ddd',
          }}
        />
        {touched.password && !validatePassword(password) && (
          <div style={{ color: 'red', fontSize: 13, marginBottom: 8 }}>
            비밀번호는 8자 이상, 특수문자 포함이어야 합니다.
          </div>
        )}
        <button
          type="submit"
          style={{
            padding: '12px 0',
            borderRadius: 4,
            backgroundColor: isValid ? '#2483bf' : '#b3c6ff',
            color: 'white',
            border: 'none',
            cursor: isValid ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            marginTop: 16,
            fontSize: 17,
          }}
          disabled={!isValid}
        >
          로그인
        </button>
      </form>
      <div
        style={{
          marginTop: 32,
          color: '#555',
          fontSize: 15,
          textAlign: 'center',
        }}
      >
        계정이 없으신가요?{' '}
        <a
          href="/register"
          style={{ color: '#003cff', textDecoration: 'underline' }}
        >
          회원가입
        </a>{' '}
        하거나 로그인해주세요.
      </div>
      {showCertModal && (
        <ConfirmModal
          message="인증서가 만료되었습니다. 재발급이 필요합니다."
          onConfirm={() => {
            setShowCertModal(false)
            router.push('/register')
          }}
          onCancel={() => {
            setShowCertModal(false)
            router.push('/register')
          }}
          confirmLabel="확인"
          cancelLabel="닫기"
        />
      )}
    </div>
  )
}

export default LoginPage
