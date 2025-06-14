import React, { useState, useEffect } from 'react'
import { FaDownload, FaRegImage } from 'react-icons/fa'
import PreviewContent from './PreviewContent'
import ContractSignFlow from './ContractSignFlow'
import ConfirmModal from './ConfirmModal'
import { useRouter } from 'next/navigation'

// PDF.js 워커 설정 (브라우저 환경에서만)
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { pdfjs } = require('react-pdf')
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
}

// 계약서 미리보기 모달 컴포넌트
const ContractPreviewModal = ({
  contract,
  onClose,
  type = 'received',
  onTitleClick,
}: {
  contract: any
  onClose: () => void
  type?: 'sent' | 'received'
  onTitleClick?: () => void
}) => {
  // step: 0=본문, 1=서명 확인
  const [step, setStep] = useState(0)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [docxHtml, setDocxHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSignFlow, setShowSignFlow] = useState(false)
  const [showExpireModal, setShowExpireModal] = useState(false)
  const router = useRouter()

  // 계약 상태별 미리보기/다운로드 가능 여부 계산
  const isExpired = contract.status === 'expired'
  const isRejected = contract.status === 'rejected'
  const isSent = type === 'sent'
  const isReceived = type === 'received'
  const isSigned = contract.status === 'signed'
  const canDownload =
    !isExpired && (isSent || (isReceived && isSigned && !isRejected))
  const canPreview = !isExpired && (isSent || (isReceived && !isRejected))

  // 만료/거부/미서명 시 안내 모달 표시
  useEffect(() => {
    if (!canPreview && (isExpired || (isRejected && isReceived))) {
      setShowExpireModal(true)
    }
  }, [canPreview, isExpired, isRejected, isReceived])

  // 미리보기 데이터 fetch
  useEffect(() => {
    if (!canPreview) {
      setError(
        isExpired
          ? '계약서가 만료되어 미리보기를 할 수 없습니다.'
          : isRejected
          ? '계약서가 거부/반려되어 미리보기를 할 수 없습니다.'
          : '미리보기를 할 수 없습니다.'
      )
      setLoading(false)
      return
    }
    setLoading(true)
    const fetchData = async () => {
      try {
        if (contract.title.endsWith('.pdf')) {
          const res = await fetch(`/api/contract/${contract._id}/preview`, {
            cache: 'no-store',
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(
              err.message || '미리보기 파일을 불러오지 못했습니다.'
            )
          }
          const blob = await res.blob()
          if (blob.size === 0) {
            setError('PDF 미리보기 파일이 비어 있습니다.')
            setLoading(false)
            return
          }
          setPdfUrl(URL.createObjectURL(blob))
          setFileContent(null)
        } else {
          const res = await fetch(`/api/contract/${contract._id}/preview`, {
            cache: 'no-store',
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(
              err.message || '미리보기 파일을 불러오지 못했습니다.'
            )
          }
          const data = await res.json()
          if (
            contract.title.endsWith('.txt') ||
            contract.title.endsWith('.docx')
          ) {
            setFileContent(data.preview)
            setPdfUrl(null)
          } else {
            setError('미리보기를 지원하지 않는 파일 형식입니다.')
          }
        }
        setLoading(false)
      } catch (e: any) {
        setError(e.message || '미리보기 파일을 불러오지 못했습니다.')
        setLoading(false)
      }
    }
    fetchData()
  }, [contract, step, canPreview])

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: 40,
        minWidth: 700,
        maxWidth: '90vw',
        boxShadow: '0 4px 32px #0002',
        textAlign: 'center',
        position: 'relative',
        fontFamily:
          'Noto Sans KR, Malgun Gothic, Apple SD Gothic Neo, sans-serif',
      }}
    >
      {/* 상단: 제목, 다운로드 버튼 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          maxWidth: '100%',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 0,
            flex: 1,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 28,
              maxWidth: 400,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              cursor: contract.status === 'uploaded' ? 'pointer' : 'default',
              textDecoration:
                contract.status === 'uploaded' ? 'underline' : 'none',
            }}
            title={contract.title}
            onClick={
              contract.status === 'uploaded' &&
              typeof onTitleClick === 'function'
                ? onTitleClick
                : undefined
            }
          >
            {(contract.title ?? '').length >= 27
              ? (contract.title ?? '').slice(0, 27) + '...'
              : contract.title}
            {contract.filename && (
              <span style={{ color: '#888', fontSize: 18, marginLeft: 8 }}>
                ({contract.filename.split('.').pop()?.toUpperCase()})
              </span>
            )}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* 전체보기/다운로드 아이콘 완전 삭제 - 아무것도 렌더링하지 않음 */}
        </div>
      </div>
      {/* 본문 미리보기/서명 확인 탭 */}
      <div
        style={{
          minHeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        {/* step: 0=본문, 1=서명 확인 */}
        {step === 1 ? (
          contract.signature?.signatureImageDigital ||
          contract.signatureImageDigital ? (
            <img
              src={
                contract.signature?.signatureImageDigital ||
                contract.signatureImageDigital
              }
              alt="서명 확인"
              style={{ width: 350, border: '1px solid #eee', borderRadius: 8 }}
            />
          ) : (
            (!contract.signed ||
              !(
                contract.signature?.signatureImageDigital ||
                contract.signatureImageDigital
              )) && (
              <div style={{ color: '#1976d2', fontSize: 18 }}>
                {type === 'received'
                  ? '아직 서명하지 않았습니다.'
                  : '수신자가 서명을 하지 않았습니다.'}
              </div>
            )
          )
        ) : error ? (
          <div
            style={{
              color: 'red',
              fontWeight: 500,
              fontSize: 18,
              margin: '32px 0',
            }}
          >
            {error}
          </div>
        ) : (
          <PreviewContent
            loading={loading}
            error={error}
            pdfUrl={pdfUrl}
            docxHtml={docxHtml}
            fileContent={fileContent}
            width={650}
            height={700}
          />
        )}
      </div>
      {/* 탭 버튼: 본문/서명 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 32,
          marginBottom: 24,
        }}
      >
        <button
          onClick={() => setStep(0)}
          disabled={step === 0}
          style={{
            fontSize: 18,
            padding: '10px 28px',
            borderRadius: 8,
            border: '1px solid #ccc',
            background: step === 0 ? '#1976d2' : '#fff',
            color: step === 0 ? '#fff' : '#333',
            cursor: step === 0 ? 'default' : 'pointer',
          }}
        >
          본문 미리보기
        </button>
        <button
          onClick={() => setStep(1)}
          disabled={step === 1}
          style={{
            fontSize: 18,
            padding: '10px 28px',
            borderRadius: 8,
            border: '1px solid #ccc',
            background: step === 1 ? '#1976d2' : '#fff',
            color: step === 1 ? '#fff' : '#333',
            cursor: step === 1 ? 'default' : 'pointer',
          }}
        >
          서명 확인
        </button>
      </div>
      {/* 서명 미완료 안내: 서명 이미지가 없고 signed가 false일 때만 */}
      {type === 'received' &&
        step === 1 &&
        !contract.signed &&
        !(
          contract.signature?.signatureImageDigital ||
          contract.signatureImageDigital
        ) && (
          <div style={{ color: '#1976d2', fontSize: 16, marginBottom: 12 }}>
            아직 서명하지 않았습니다.
          </div>
        )}
      {/* 닫기 버튼 */}
      <button
        style={{
          marginTop: 16,
          fontSize: 17,
          padding: '8px 32px',
          borderRadius: 8,
        }}
        onClick={onClose}
      >
        닫기
      </button>
      {/* 서명 플로우 모달 (필요시) */}
      {showSignFlow && (
        <ContractSignFlow
          contract={contract}
          onComplete={() => {
            setShowSignFlow(false)
            if (onClose) onClose()
          }}
          onClose={() => setShowSignFlow(false)}
        />
      )}
      {/* 만료/거부/미서명 안내 모달 */}
      {showExpireModal && (
        <ConfirmModal
          message={
            isExpired
              ? '계약서가 만료되었습니다. 만료일을 연장하시겠습니까?'
              : isRejected && isReceived
              ? '계약서가 반려되어 더 이상 열람할 수 없습니다.'
              : '미리보기를 할 수 없습니다.'
          }
          onConfirm={() => {
            setShowExpireModal(false)
            router.push('/contract')
          }}
          onCancel={() => {
            setShowExpireModal(false)
            router.push('/contract')
          }}
          confirmLabel="확인"
          cancelLabel="닫기"
        />
      )}
    </div>
  )
}

export default ContractPreviewModal
