'use client'

import { useState, ChangeEvent, FormEvent, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '../../components/LoadingSpinner'
import '../../components/LoadingSpinner.css'
import ConfirmModal from '../../components/ConfirmModal'

function validateEmail(email: string) {
  return /^[\w-.]+@[\w-]+\.[a-zA-Z]{2,}$/.test(email)
}
function validatePassword(pw: string) {
  return pw.length >= 8 && /[!@#$%^&*]/.test(pw)
}
function validateUsername(username: string) {
  return username.length >= 3 && /^[a-zA-Z0-9]+$/.test(username)
}

const RegisterPage = () => {
  const router = useRouter()
  const [form, setForm] = useState<{
    username: string
    email: string
    password: string
  }>({
    username: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [touched, setTouched] = useState<{ [k: string]: boolean }>({})
  const [loading, setLoading] = useState(false)
  const [showCertModal, setShowCertModal] = useState(false)

  const isValid =
    validateUsername(form.username) &&
    validateEmail(form.email) &&
    validatePassword(form.password)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
    setTouched({ ...touched, [e.target.name]: true })
    setError('')
  }

  const handleSubmit = async (e?: FormEvent | KeyboardEvent) => {
    if (e) e.preventDefault()
    if (!isValid) {
      setError('입력값을 다시 확인하세요.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) {
        if (data.message?.includes('인증서가 만료')) {
          setShowCertModal(true)
        } else {
          setError(data.message || '회원가입 실패')
        }
      } else {
        if (data.redirectTo && data.redirectTo.startsWith('/otp/setup')) {
          router.push(data.redirectTo)
        }
        setSuccess(data.message || '회원가입 성공')
      }
    } catch (error) {
      setError('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  return (
    <div
      className="card"
      style={{ maxWidth: 400, margin: 'auto', padding: 32 }}
    >
      <h1 style={{ marginBottom: 24 }}>회원가입</h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        <input
          type="text"
          name="username"
          placeholder="아이디"
          value={form.username}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          style={{
            marginBottom: 6,
            borderColor:
              touched.username && !validateUsername(form.username)
                ? 'red'
                : undefined,
          }}
        />
        {touched.username && !validateUsername(form.username) && (
          <div style={{ color: 'red', fontSize: 13, marginBottom: 8 }}>
            아이디는 3자 이상, 영문/숫자만 가능합니다.
          </div>
        )}
        <input
          type="email"
          name="email"
          placeholder="이메일"
          value={form.email}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          style={{
            marginBottom: 6,
            borderColor:
              touched.email && !validateEmail(form.email) ? 'red' : undefined,
          }}
        />
        {touched.email && !validateEmail(form.email) && (
          <div style={{ color: 'red', fontSize: 13, marginBottom: 8 }}>
            이메일 형식이 올바르지 않습니다.
          </div>
        )}
        <input
          type="password"
          name="password"
          placeholder="비밀번호 (8자 이상, 특수문자 포함)"
          value={form.password}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          style={{
            marginBottom: 6,
            borderColor:
              touched.password && !validatePassword(form.password)
                ? 'red'
                : undefined,
          }}
        />
        {touched.password && !validatePassword(form.password) && (
          <div style={{ color: 'red', fontSize: 13, marginBottom: 8 }}>
            비밀번호는 8자 이상, 특수문자 포함이어야 합니다.
          </div>
        )}
        <button
          type="submit"
          disabled={!isValid}
          style={{
            width: '100%',
            marginTop: 16,
            marginBottom: 8,
            padding: '12px 0',
            fontSize: 17,
          }}
        >
          회원가입
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: 18 }}>{error}</p>}
      {success && <p style={{ color: 'green', marginTop: 18 }}>{success}</p>}
      {loading && <LoadingSpinner />}
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
      <div
        style={{
          marginTop: 32,
          color: '#555',
          fontSize: 15,
          textAlign: 'center',
        }}
      >
        이미 계정이 있으신가요?{' '}
        <a
          href="/login"
          style={{ color: '#2483bf', textDecoration: 'underline' }}
        >
          로그인
        </a>{' '}
        하거나
        <br />
        회원가입을 진행해주세요.
      </div>
    </div>
  )
}

export default RegisterPage
