import React, { useState, useEffect } from 'react'
import { FaUserCircle } from 'react-icons/fa'

export default function ProfileEdit() {
  const [email, setEmail] = useState<string>('-')
  const [username, setUsername] = useState<string>('-')
  const [profileMsg, setProfileMsg] = useState<string>('')
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    async function fetchUser() {
      setProfileLoading(true)
      try {
        const res = await fetch('/api/user/me')
        const data = await res.json()
        setEmail(data.email || '-')
        setUsername(data.username || '-')
      } catch {
        setProfileMsg('사용자 정보를 불러오지 못했습니다.')
        setEmail('-')
        setUsername('-')
      }
      setProfileLoading(false)
    }
    fetchUser()
  }, [])

  return (
    <div
      style={{
        maxWidth: 400,
        margin: '60px auto',
        padding: 32,
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 2px 16px #e3e8f7',
        border: '1px solid #e3e8f7',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <FaUserCircle
        size={96}
        style={{
          color: '#b0c7f7',
          border: '4px solid #2086c4',
          borderRadius: '50%',
          background: '#eaf1ff',
          marginBottom: 18,
        }}
      />
      {profileLoading ? (
        <div style={{ color: '#2086c4', fontWeight: 500, marginBottom: 12 }}>
          불러오는 중...
        </div>
      ) : profileMsg ? (
        <div style={{ color: '#d32f2f', fontWeight: 500, marginBottom: 12 }}>
          {profileMsg}
        </div>
      ) : null}
      <div
        style={{
          width: '100%',
          textAlign: 'center',
          color: '#888',
          fontWeight: 600,
          fontSize: 15,
          marginBottom: 2,
        }}
      >
        이메일
      </div>
      <div
        style={{
          width: '100%',
          textAlign: 'center',
          color: '#222',
          fontWeight: 600,
          fontSize: 18,
          marginBottom: 10,
        }}
      >
        {email}
      </div>
      <div
        style={{
          width: '100%',
          textAlign: 'center',
          color: '#888',
          fontWeight: 600,
          fontSize: 15,
          marginBottom: 2,
        }}
      >
        아이디
      </div>
      <div
        style={{
          width: '100%',
          textAlign: 'center',
          color: '#222',
          fontWeight: 600,
          fontSize: 18,
        }}
      >
        {username}
      </div>
    </div>
  )
}
