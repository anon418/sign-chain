'use client'

import React, { useState } from 'react'
import ProfileEdit from '../../components/ProfileEdit'
import KeyManagement from '../../components/KeyManagement'
import styles from '../../styles/ProfileTab.module.css'

export default function ProfilePage() {
  const [tab, setTab] = useState<'profile' | 'key'>('profile')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto">
        <div
          style={{ display: 'flex', gap: 16, marginTop: 48, marginBottom: 32 }}
        >
          <button
            onClick={() => setTab('profile')}
            className={`${styles['profile-tab']}${
              tab === 'profile' ? ' ' + styles.selected : ''
            }`}
          >
            프로필
          </button>
          <button
            onClick={() => setTab('key')}
            className={`${styles['profile-tab']}${
              tab === 'key' ? ' ' + styles.selected : ''
            }`}
          >
            개인키 백업/복구
          </button>
        </div>
        <div className="max-w-md mx-auto p-8 bg-white rounded-3xl shadow-2xl border-2 border-blue-100">
          {tab === 'profile' && <ProfileEdit />}
          {tab === 'key' && <KeyManagement />}
        </div>
      </div>
    </div>
  )
}
