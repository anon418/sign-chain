import React, { useEffect, useState } from 'react'

interface LogEntry {
  _id: string
  contractId: string
  filePath: string
  encapsulation: string
  tag: string
  hash: string
  previousHash?: string
  filename: string
  createdAt?: string
}

export default function LogChainViewer({ contractId }: { contractId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [chainValid, setChainValid] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/logs/${contractId}`)
        const data = await res.json()
        setLogs(data.logs)
        // 해시체인 검증
        let valid = true
        for (let i = 1; i < data.logs.length; i++) {
          if (data.logs[i].previousHash !== data.logs[i - 1].hash) {
            valid = false
            break
          }
        }
        setChainValid(valid)
      } catch (err) {
        setError('로그를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [contractId])

  return (
    <div
      style={{
        maxWidth: 600,
        margin: '40px auto',
        padding: 24,
        border: '1px solid #eee',
        borderRadius: 10,
        background: '#fafbfc',
      }}
    >
      <h2 style={{ fontSize: 20, marginBottom: 18 }}>로그 해시체인</h2>
      <button
        onClick={() => {
          const blob = new Blob([JSON.stringify(logs, null, 2)], {
            type: 'application/json',
          })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `contract-logchain-${contractId}.json`
          a.click()
          URL.revokeObjectURL(url)
        }}
        style={{
          marginBottom: 16,
          padding: '6px 14px',
          borderRadius: 6,
          background: '#1976d2',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        로그 내보내기(JSON)
      </button>
      {loading ? (
        <div style={{ color: '#888' }}>불러오는 중...</div>
      ) : error ? (
        <div style={{ color: 'red' }}>{error}</div>
      ) : logs.length === 0 ? (
        <div style={{ color: '#888' }}>로그가 없습니다.</div>
      ) : (
        <>
          {/* 해시체인 검증 결과 메시지 */}
          {chainValid === false && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.35)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  boxShadow: '0 4px 32px #0003',
                  padding: '48px 36px',
                  minWidth: 320,
                  maxWidth: '90vw',
                  textAlign: 'center',
                  fontSize: 20,
                  color: '#d32f2f',
                  fontWeight: 700,
                  border: '2px solid #d32f2f',
                  letterSpacing: 0.5,
                }}
              >
                ❌ 해시체인 검증 실패!
                <br />
                로그가 변조되었을 수 있습니다.
                <br />
                <span style={{ fontSize: 15, color: '#555', fontWeight: 400 }}>
                  관리자에게 문의하거나, 데이터의 신뢰성을 확인하세요.
                </span>
              </div>
            </div>
          )}
          <div
            style={{
              marginBottom: 16,
              fontWeight: 500,
              color: chainValid ? 'green' : 'red',
            }}
          >
            {chainValid === null
              ? '검증 중...'
              : chainValid
              ? '✅ 해시체인 무결성 검증: 이상 없음'
              : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {logs.map((log, idx) => (
              <div
                key={log._id}
                style={{
                  border: '1px solid #ccc',
                  borderRadius: 8,
                  padding: 14,
                  background: '#fff',
                }}
              >
                <div
                  style={{ fontSize: 13, color: '#1976d2', marginBottom: 4 }}
                >
                  #{idx + 1} {log.filename}
                </div>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>
                  <strong>타입:</strong> {log.encapsulation}
                  {log.createdAt && (
                    <span style={{ marginLeft: 10, color: '#888' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, wordBreak: 'break-all' }}>
                  <strong>Hash:</strong> {log.hash}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    wordBreak: 'break-all',
                    color: '#888',
                  }}
                >
                  <strong>Prev:</strong> {log.previousHash || '(없음)'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
