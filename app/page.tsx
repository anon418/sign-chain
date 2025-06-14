'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { reportWebVitals } from '../utils/reportWebVitals'

function LoginPrompt() {
  return (
    <div>
      <h2>로그인이 필요합니다</h2>
      <p>계속하려면 로그인하세요.</p>
      {/* 로그인 폼이나 버튼 추가 */}
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  return (
    <div
      style={{
        padding: 40,
        textAlign: 'center',
        maxWidth: 400,
        margin: '0 auto',
        fontFamily: 'inherit',
      }}
    >
      <h1
        style={{
          color: '#222',
          fontWeight: 700,
          fontSize: 28,
          marginBottom: 32,
        }}
      >
        전자계약 서비스
      </h1>
      <div style={{ fontSize: 16, color: '#222', marginBottom: 32 }}>
        서비스 이용을 위해 로그인 또는 회원가입이 필요합니다.
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 32,
          marginBottom: 40,
        }}
      >
        <button
          className="btn-primary"
          onClick={() => router.push('/register')}
        >
          회원가입
        </button>
        <button className="btn-primary" onClick={() => router.push('/login')}>
          로그인
        </button>
      </div>
    </div>
  )
}

reportWebVitals(console.log)
