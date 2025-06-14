import React, { useState } from 'react'
export default function PasswordModal({
  onSubmit,
  error,
}: {
  onSubmit: (pw: string) => void
  error?: string
}) {
  const [pw, setPw] = useState('')
  const [localError, setLocalError] = useState('')
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#0008',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: '#fff',
          padding: 32,
          borderRadius: 12,
          minWidth: 320,
        }}
      >
        <h2>전자서명 비밀번호 입력</h2>
        <div style={{ fontSize: 15, color: '#555', marginBottom: 10 }}>
          이 비밀번호는 <b>회원가입 마지막 단계(OTP 인증)</b>에서 입력한
          비밀번호입니다.
          <br />
          <b>전자서명, 파일 복호화</b> 등 중요한 작업에 사용되니 정확히 입력해
          주세요.
          <br />
          <span style={{ color: '#d32f2f', fontWeight: 500 }}>
            로그인/회원가입 비밀번호와 다를 수 있습니다.
          </span>
        </div>
        <input
          type="password"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value)
            setLocalError('')
            // 디버깅: 입력값 실시간 출력 (개발용, 배포 시 삭제)
            console.log('[DEBUG] PasswordModal input:', e.target.value)
          }}
          style={{
            width: '100%',
            padding: 10,
            marginBottom: 12,
            borderRadius: 6,
            border: '1px solid #ccc',
          }}
          placeholder="OTP 인증/회원가입 시 입력한 비밀번호 (파일 복호화에도 사용)"
        />
        {(localError || error) && (
          <div style={{ color: 'red', marginBottom: 8 }}>
            {localError || error || '비밀번호가 올바르지 않습니다.'}
          </div>
        )}
        <button
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 6,
            background: '#1976d2',
            color: '#fff',
            border: 'none',
          }}
          onClick={() => {
            if (!pw || pw.length < 6) {
              setLocalError('비밀번호를 올바르게 입력하세요.')
              // 디버깅: 비밀번호 길이 체크 실패
              console.log(
                '[DEBUG] PasswordModal submit: too short or empty',
                pw
              )
              return
            }
            // 디버깅: 제출 시 비밀번호 값
            console.log('[DEBUG] PasswordModal submit:', pw)
            onSubmit(pw)
          }}
        >
          확인
        </button>
      </div>
    </div>
  )
}
