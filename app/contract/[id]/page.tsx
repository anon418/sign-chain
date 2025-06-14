//계약 상세
'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import ContractSignatureSection from '../../../components/ContractSignatureSection'
import VerifyQR from '../../../components/VerifyQR'
const LogChainViewer = dynamic(
  () => import('../../../components/LogChainViewer'),
  { ssr: false }
)

interface Contract {
  _id: string
  title: string
  content: string
  hash: string
  createdAt: string
  signed: boolean
  signer?: string
  creator?: string
  filePath?: string
  expirationDate?: string
}

export default function ContractDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [contract, setContract] = useState<Contract | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [integrity, setIntegrity] = useState<'pending' | 'valid' | 'invalid'>(
    'pending'
  )
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [canSign, setCanSign] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // 상세 정보 fetch
  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/contract/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('계약서를 찾을 수 없습니다.')
        return res.json()
      })
      .then((data) => {
        setContract(data)
        setFileUrl(data.filePath || null)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [id])

  // 무결성 검증: 파일 다운로드 후 SHA-256 해시 비교
  useEffect(() => {
    if (!contract?.filePath) return
    setIntegrity('pending')
    setToast('해시값 생성 중...')
    fetch(contract.filePath)
      .then((res) => res.arrayBuffer())
      .then((buffer) => window.crypto.subtle.digest('SHA-256', buffer))
      .then((hashBuffer) => {
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
        if (hashHex === contract.hash) {
          setIntegrity('valid')
          setToast('✅ 해시값 검증 완료!')
        } else {
          setIntegrity('invalid')
          setToast('❌ 무결성 오류: 파일이 변조되었을 수 있습니다!')
        }
        setTimeout(() => setToast(null), 2000)
      })
      .catch(() => {
        setIntegrity('invalid')
        setToast('❌ 무결성 오류: 파일이 변조되었을 수 있습니다!')
        setTimeout(() => setToast(null), 2000)
      })
  }, [contract])

  // QR 인증 성공 핸들러
  const handleQrSuccess = () => {
    setCanSign(true)
    setToast('QR 인증 성공! 이제 서명할 수 있습니다.')
    setTimeout(() => setToast(null), 2000)
  }

  // 서명 완료 핸들러
  const handleSigned = () => {
    setToast('서명이 성공적으로 완료되었습니다!')
    setTimeout(() => setToast(null), 2000)
    // 필요시 재조회 등 추가
  }

  if (loading) return <div style={{ padding: 40 }}>불러오는 중...</div>
  if (error) return <div style={{ color: 'red', padding: 40 }}>{error}</div>
  if (!contract)
    return <div style={{ padding: 40 }}>계약 정보를 불러올 수 없습니다.</div>

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
      <h2 style={{ fontSize: 22, marginBottom: 18 }}>계약 상세</h2>
      <div style={{ marginBottom: 16 }}>
        <strong>제목:</strong> {contract.title}
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>작성일:</strong> {new Date(contract.createdAt).toLocaleString()}
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>상태:</strong>{' '}
        {contract.signed ? (
          <span style={{ color: 'green' }}>서명 완료</span>
        ) : (
          <span style={{ color: 'red' }}>서명 미완료</span>
        )}
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>작성자:</strong> {contract.creator || '-'}
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>서명자:</strong> {contract.signer || '-'}
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>내용:</strong>
        <div
          style={{
            background: '#fff',
            border: '1px solid #eee',
            borderRadius: 6,
            padding: 12,
            marginTop: 6,
          }}
        >
          {contract.content || <span style={{ color: '#aaa' }}>-</span>}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>해시:</strong>{' '}
        <span style={{ fontSize: 13, color: '#888' }}>{contract.hash}</span>
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>파일:</strong>{' '}
        {fileUrl ? (
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            다운로드
          </a>
        ) : (
          '-'
        )}
      </div>
      {/* 무결성 검증 결과 */}
      <div style={{ marginBottom: 16 }}>
        <strong>무결성 검증:</strong>{' '}
        {integrity === 'pending' ? (
          <span style={{ color: '#888' }}>검증 중...</span>
        ) : integrity === 'valid' ? (
          <span style={{ color: 'green' }}>✅ 무결성 이상 없음</span>
        ) : (
          <span style={{ color: 'red' }}>
            ❌ 무결성 오류: 파일이 변조되었을 수 있습니다!
          </span>
        )}
      </div>
      {/* QR 인증 섹션 */}
      {!canSign && (
        <div style={{ marginBottom: 24 }}>
          <VerifyQR contractId={contract._id} onSuccess={handleQrSuccess} />
        </div>
      )}
      {/* 서명 섹션 */}
      <ContractSignatureSection
        contractId={contract._id}
        contractHash={contract.hash}
        canSign={canSign}
        onSigned={handleSigned}
      />
      {/* 로그체인 이력 */}
      <LogChainViewer contractId={contract._id} />
      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        <button
          onClick={() => router.push('/contract')}
          style={{
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 18px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          목록으로
        </button>
      </div>
      {/* Toast 알림 */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#222',
            color: '#fff',
            padding: '12px 32px',
            borderRadius: 8,
            fontSize: 16,
            zIndex: 9999,
            boxShadow: '0 2px 8px #0003',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
