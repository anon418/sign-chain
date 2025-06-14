import React, { useRef, useState, useEffect } from 'react'
import ReceivedContractCard from './ReceivedContractCard'
import ReceivedContractModal from './ReceivedContractModal'
import dynamic from 'next/dynamic'
import { pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
const Document = dynamic(
  () => import('react-pdf').then((mod) => mod.Document),
  { ssr: false }
)
const Page = dynamic(() => import('react-pdf').then((mod) => mod.Page), {
  ssr: false,
})
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

interface ReceivedContractListProps {
  contracts: any[]
  loading: boolean
}

export default function ReceivedContractList({
  contracts,
  loading,
}: ReceivedContractListProps) {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [isMobile, setIsMobile] = React.useState(false)
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [previewType, setPreviewType] = useState<
    'pdf' | 'txt' | 'other' | null
  >(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [txtContent, setTxtContent] = useState('')
  const [numPages, setNumPages] = useState(1)
  const [pageNumber, setPageNumber] = useState(1)
  const [showErrorModal, setShowErrorModal] = useState(false)

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 600)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ESC/←/→ 키 이벤트 처리
  useEffect(() => {
    if (!previewType) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewType(null)
        setPreviewUrl(null)
      }
      if (previewType === 'pdf') {
        if (e.key === 'ArrowRight' && pageNumber < numPages)
          setPageNumber(pageNumber + 1)
        if (e.key === 'ArrowLeft' && pageNumber > 1)
          setPageNumber(pageNumber - 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [previewType, pageNumber, numPages])

  const handlePreview = async (c: any) => {
    const ext = c.filename ? c.filename.split('.').pop()?.toLowerCase() : ''
    setPageNumber(1)
    if (ext === 'pdf' || ext === 'docx') {
      // 복호화된 파일을 서버에서 받아 Blob URL로 미리보기
      const res = await fetch(`/api/contract/${c._id}/preview`)
      if (!res.ok) {
        setShowErrorModal(true)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      setPreviewType(ext)
      setTxtContent('')
      setShowModal(false)
    } else if (ext === 'txt') {
      const res = await fetch(c.filePath)
      const text = await res.text()
      setTxtContent(text)
      setPreviewType('txt')
      setPreviewUrl(c.filePath)
      setShowModal(false)
    } else {
      setPreviewType('other')
      setPreviewUrl(null)
      setShowModal(false)
    }
  }

  return (
    <div>
      {/* 검색/필터 UI */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: isMobile ? 12 : 24,
          alignItems: 'center',
          flexDirection: isMobile ? 'column' : 'row',
        }}
      >
        <input
          type="text"
          placeholder="제목 또는 보낸사람 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            padding: isMobile ? '8px 8px' : '8px 14px',
            borderRadius: 6,
            border: '1px solid #ddd',
            fontSize: isMobile ? 14 : 15,
            width: isMobile ? '100%' : undefined,
            marginBottom: isMobile ? 8 : 0,
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          style={{
            padding: isMobile ? '8px 8px' : '8px 14px',
            borderRadius: 6,
            border: '1px solid #ddd',
            fontSize: isMobile ? 14 : 15,
            width: isMobile ? '100%' : undefined,
          }}
        >
          <option value="all">전체 상태</option>
          <option value="signed">서명 완료</option>
          <option value="pending_signature">서명 대기</option>
          <option value="uploaded">업로드됨</option>
          <option value="expired">만료</option>
        </select>
      </div>
      {/* 목록 렌더링 */}
      {loading ? (
        <div style={{ color: '#888' }}>불러오는 중...</div>
      ) : contracts.length === 0 ? (
        <div style={{ color: '#888' }}>수신한 계약서가 없습니다.</div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexWrap: isMobile ? 'nowrap' : 'wrap',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 12 : 24,
          }}
        >
          {contracts
            .filter(
              (c: any) =>
                (search === '' ||
                  c.title.toLowerCase().includes(search.toLowerCase()) ||
                  c.senderEmail.toLowerCase().includes(search.toLowerCase())) &&
                (statusFilter === 'all'
                  ? true
                  : statusFilter === 'expired'
                  ? c.status === 'expired' ||
                    new Date(c.expirationDate) < new Date()
                  : c.status === statusFilter)
            )
            .map((c: any, idx: number, arr: any[]) => (
              <ReceivedContractCard
                key={c._id}
                contract={c}
                refEl={(el: any) => (cardRefs.current[idx] = el)}
                focusedIdx={focusedIdx}
                idx={idx}
                arr={arr}
                setFocusedIdx={setFocusedIdx}
                handlePreview={handlePreview}
                isMobile={isMobile}
              />
            ))}
        </div>
      )}
      {/* 미리보기 모달 */}
      {previewType && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.25)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => {
            setPreviewType(null)
            setPreviewUrl(null)
            setTxtContent('')
          }}
          tabIndex={0}
          aria-modal="true"
          role="dialog"
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              minWidth: 320,
              maxWidth: 700,
              width: '90vw',
              boxShadow: '0 4px 24px #0002',
              textAlign: 'center',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
              미리보기
            </div>
            {previewType === 'pdf' && (
              <div
                style={{
                  width: '100%',
                  maxWidth: 600,
                  height: 600,
                  maxHeight: 600,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  margin: '0 auto',
                  background: '#fff',
                  borderRadius: 8,
                  display: 'block',
                }}
              >
                <Document
                  file={previewUrl}
                  loading="PDF 불러오는 중..."
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                >
                  <Page pageNumber={pageNumber} width={550} />
                </Document>
                <div
                  style={{
                    marginTop: 12,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <button
                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                    disabled={pageNumber === 1}
                    aria-label="이전 페이지"
                  >
                    ◀
                  </button>
                  <span>
                    {pageNumber} / {numPages}
                  </span>
                  <button
                    onClick={() =>
                      setPageNumber((p) => Math.min(numPages, p + 1))
                    }
                    disabled={pageNumber === numPages}
                    aria-label="다음 페이지"
                  >
                    ▶
                  </button>
                </div>
                <div style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
                  (←, → 키로 페이지 이동, ESC로 닫기)
                </div>
              </div>
            )}
            {previewType === 'txt' && (
              <pre
                style={{
                  textAlign: 'left',
                  background: '#f4f4f4',
                  padding: 16,
                  borderRadius: 8,
                  maxHeight: 500,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {txtContent}
              </pre>
            )}
            {previewType === 'other' && (
              <div style={{ color: '#888' }}>
                미리보기를 지원하지 않는 파일 형식입니다.
              </div>
            )}
            <button
              style={{ marginTop: 20 }}
              onClick={() => {
                setPreviewType(null)
                setPreviewUrl(null)
                setTxtContent('')
              }}
              aria-label="미리보기 닫기"
            >
              닫기
            </button>
          </div>
        </div>
      )}
      {/* 상세 모달 */}
      <ReceivedContractModal
        contract={selected}
        show={showModal}
        onClose={() => setShowModal(false)}
      />
      {showErrorModal && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.25)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowErrorModal(false)}
          tabIndex={0}
          aria-modal="true"
          role="dialog"
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              minWidth: 320,
              maxWidth: 700,
              width: '90vw',
              boxShadow: '0 4px 24px #0002',
              textAlign: 'center',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
              오류
            </div>
            <div style={{ color: '#888' }}>
              미리보기를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.
            </div>
            <button
              style={{ marginTop: 20 }}
              onClick={() => setShowErrorModal(false)}
              aria-label="닫기"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
