import { useState, ChangeEvent } from 'react'
import { exportPrivateKey, importPrivateKey } from '../utils/indexedDB'
import { getDB, STORE_NAME } from '../utils/indexedDB'
import { decryptLocal } from '../utils/crypto'

export default function KeyManagement() {
  const [backupStatus, setBackupStatus] = useState('')
  const [restoreStatus, setRestoreStatus] = useState('')
  const [password, setPassword] = useState('')

  const handleExportKey = async () => {
    setBackupStatus('')
    if (!password) {
      setBackupStatus('비밀번호를 입력하세요.')
      return
    }
    const encryptedUserId =
      localStorage.getItem('userId') || localStorage.getItem('email')
    const userId = encryptedUserId ? await decryptLocal(encryptedUserId) : ''
    const db = await getDB()
    const allKeys = await db.getAllKeys(STORE_NAME)
    if (!userId) {
      setBackupStatus('로그인 상태를 확인하세요.')
      return
    }
    if (!allKeys.includes(userId)) {
      setBackupStatus('개인키가 없습니다.')
      return
    }
    const json = await exportPrivateKey(userId)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(
      new Blob([json ?? ''], { type: 'application/json' })
    )
    a.download = `privateKey-backup-${userId}.json`
    a.click()
    setBackupStatus('✅ 백업 파일이 다운로드되었습니다.')
  }

  const handleImportKey = async (e: ChangeEvent<HTMLInputElement>) => {
    setRestoreStatus('')
    const file = e.target.files?.[0]
    if (!file) return
    if (!password) {
      setRestoreStatus('비밀번호를 입력하세요.')
      return
    }
    const reader = new FileReader()
    reader.onload = async (evt) => {
      const json = evt.target?.result as string
      try {
        const { userId } = JSON.parse(json)
        const encryptedUserId =
          localStorage.getItem('userId') || localStorage.getItem('email')
        const currentUserId = encryptedUserId
          ? await decryptLocal(encryptedUserId)
          : ''
        if (!userId || userId !== currentUserId) {
          setRestoreStatus('❌ 다른 계정의 백업 파일입니다.')
          return
        }
        const db = await getDB()
        const existing = await db.get(STORE_NAME, userId)
        const ok = await importPrivateKey(json)
        if (existing) {
          setRestoreStatus('✅ 이미 등록된 개인키입니다.')
        } else if (ok) {
          setRestoreStatus('✅ 개인키 복구 완료.')
        } else {
          setRestoreStatus('❌ 복구 실패: 올바르지 않은 파일입니다.')
        }
      } catch (err) {
        setRestoreStatus('❌ 복구 실패: 올바르지 않은 파일입니다.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div
      style={{
        maxWidth: 400,
        margin: '40px auto',
        padding: 24,
        border: '1px solid #eee',
        borderRadius: 10,
        background: '#fafbfc',
      }}
    >
      <h2 style={{ fontSize: 20, marginBottom: 18 }}>🔑 개인키 백업/복구</h2>
      <div style={{ marginBottom: 12, color: '#555', fontSize: 14 }}>
        개인키는 브라우저에 암호화 저장됩니다.
        <br />
        <b>백업:</b> 비밀번호 입력 후 백업 버튼 클릭
        <br />
        <b>복구:</b> 비밀번호 입력 후 백업 파일 선택
      </div>
      <div style={{ marginBottom: 8 }}>
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 4,
            border: '1px solid #ddd',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          onClick={handleExportKey}
          style={{
            padding: '10px 18px',
            flex: 1,
            background: '#2086c4',
            color: '#fff',
            border: '1.5px solid #2086c4',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 16,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#176ba0')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#2086c4')}
        >
          개인키 백업(내보내기)
        </button>
        <label style={{ flex: 1, display: 'block' }}>
          <span style={{ display: 'block', marginBottom: 4 }}> 개인키 복구(가져오기)</span>
          <input
            type="file"
            accept="application/json"
            onChange={handleImportKey}
            style={{ display: 'block', width: '100%' }}
          />
        </label>
      </div>

      {/* ✅ 성공 메시지 */}
      {(restoreStatus.startsWith('✅') || backupStatus.startsWith('✅')) && (
        <div
          style={{
            marginTop: 16,
            padding: '10px 14px',
            borderRadius: 8,
            background: '#e7f8ee',
            color: '#007a2f',
            fontWeight: 600,
            fontSize: 14,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={restoreStatus || backupStatus}
        >
          {restoreStatus || backupStatus}
        </div>
      )}

      {/* ❌ 실패 메시지 */}
      {(restoreStatus.startsWith('❌') || backupStatus.startsWith('❌')) && (
        <div
          style={{
            marginTop: 16,
            padding: '10px 14px',
            borderRadius: 8,
            background: '#fdecea',
            color: '#d93025',
            fontWeight: 600,
            fontSize: 14,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={restoreStatus || backupStatus}
        >
          {restoreStatus || backupStatus}
        </div>
      )}
    </div>
  )
}

