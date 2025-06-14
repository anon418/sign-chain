import { useState, ChangeEvent } from 'react'
import { exportPrivateKey, importPrivateKey } from '../utils/indexedDB'
import { getDB, STORE_NAME } from '../utils/indexedDB'
import { decryptLocal } from '../utils/crypto'
import { FaCheckCircle } from 'react-icons/fa'

export default function KeyManagement() {
  const [backupStatus, setBackupStatus] = useState('')
  const [restoreStatus, setRestoreStatus] = useState('')
  const [password, setPassword] = useState('')

  // 개인키 내보내기(백업)
  const handleExportKey = async () => {
    setBackupStatus('')
    if (!password) {
      setBackupStatus('로그인 비밀번호를 입력하세요.')
      return
    }
    const encryptedUserId =
      localStorage.getItem('userId') || localStorage.getItem('email')
    console.log('[KeyManagement] encryptedUserId:', encryptedUserId)
    const userId = encryptedUserId ? await decryptLocal(encryptedUserId) : ''
    console.log('[KeyManagement] decrypted userId:', userId)
    const db = await getDB()
    const allKeys = await db.getAllKeys(STORE_NAME)
    console.log('[KeyManagement] IndexedDB allKeys:', allKeys)
    if (!userId) {
      setBackupStatus('userId가 없습니다. (로그인 상태 확인)')
      return
    }
    if (!allKeys.includes(userId)) {
      setBackupStatus('IndexedDB에 해당 userId로 저장된 개인키가 없습니다.')
      return
    }
    const encrypted = await db.get(STORE_NAME, userId)
    console.log('[KeyManagement] IndexedDB encrypted privateKey:', encrypted)
    const { exportPrivateKey } = await import('../utils/indexedDB')
    const json = await exportPrivateKey(userId)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(
      new Blob([json ?? ''], { type: 'application/json' })
    )
    a.download = `privateKey-backup-${userId}.json`
    a.click()
    setBackupStatus('개인키 백업 파일이 다운로드되었습니다.')
  }

  // 개인키 복구(복원)
  const handleImportKey = async (e: ChangeEvent<HTMLInputElement>) => {
    setRestoreStatus('')
    const file = e.target.files?.[0]
    if (!file) return
    if (!password) {
      setRestoreStatus('로그인 비밀번호를 입력하세요.')
      return
    }
    const reader = new FileReader()
    reader.onload = async (evt) => {
      const json = evt.target?.result as string
      try {
        const { userId } = JSON.parse(json)
        if (!userId) {
          setRestoreStatus('❌ 복구 실패: 파일이 올바르지 않음')
          return
        }
        const db = await getDB()
        const existing = await db.get(STORE_NAME, userId)
        const ok = await importPrivateKey(json)
        if (existing) {
          setRestoreStatus('✅ 개인키가 정상적으로 등록되어있습니다.')
        } else if (ok) {
          setRestoreStatus('✅ 개인키 복구 완료. IndexedDB에 저장되었습니다.')
        } else {
          setRestoreStatus('❌ 복구 실패: 파일이 올바르지 않음')
        }
      } catch (err) {
        setRestoreStatus('❌ 복구 실패: 파일이 올바르지 않음')
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
        내 개인키는 브라우저에 암호화되어 저장됩니다.
        <br />
        <b>백업:</b> 비밀번호 입력 후 백업 버튼을 누르면 파일이 다운로드됩니다.
        <br />
        <b>복구:</b> 비밀번호 입력 후 백업 파일을 선택하면 복구됩니다.
      </div>
      <div style={{ marginBottom: 8 }}>
        <input
          type="password"
          placeholder="전자서명용 비밀번호(회원가입 시 입력)"
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
          <span style={{ display: 'block', marginBottom: 4 }}>
            개인키 복구(가져오기)
          </span>
          <input
            type="file"
            accept="application/json"
            onChange={handleImportKey}
            style={{ display: 'block', width: '100%' }}
          />
        </label>
      </div>
      {restoreStatus === '✅ 개인키가 정상적으로 등록되어있습니다.' ? (
        <div
          style={{
            maxWidth: 400,
            margin: '40px auto',
            padding: 20,
            border: '1px solid #eee',
            borderRadius: 12,
            background: '#fafbfc',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              color: 'green',
              fontWeight: 500,
              fontSize: 15,
              padding: '8px 0',
            }}
          >
            ✅ 개인키가 정상적으로 등록되어있습니다.
          </div>
        </div>
      ) : backupStatus && backupStatus.includes('다운로드') ? (
        <div
          style={{
            maxWidth: 400,
            margin: '40px auto',
            padding: 20,
            border: '1px solid #eee',
            borderRadius: 12,
            background: '#fafbfc',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              color: 'green',
              fontWeight: 500,
              fontSize: 15,
              padding: '8px 0',
            }}
          >
            ✅ 개인키 백업 파일이 다운로드되었습니다.
          </div>
        </div>
      ) : (
        <>
          {restoreStatus && (
            <div
              style={{
                marginTop: 8,
                color: restoreStatus.startsWith('✅') ? 'green' : 'red',
                display: 'flex',
                alignItems: 'center',
                fontWeight: 600,
                fontSize: 16,
              }}
            >
              {restoreStatus.startsWith('✅') && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#4caf50',
                    marginRight: 8,
                  }}
                >
                  <FaCheckCircle style={{ color: '#fff', fontSize: 16 }} />
                </span>
              )}
              {restoreStatus}
            </div>
          )}
        </>
      )}
    </div>
  )
}
