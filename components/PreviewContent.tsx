import React, { useState } from 'react'
import dynamic from 'next/dynamic'

// PDF.js worker 경로 명시 (버전 일치)
import { pdfjs } from 'react-pdf'
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

const PDFDocument = dynamic(
  () => import('react-pdf').then((mod) => mod.Document),
  { ssr: false }
)
const PDFPage = dynamic(() => import('react-pdf').then((mod) => mod.Page), {
  ssr: false,
})

interface PreviewContentProps {
  loading: boolean
  error: string
  pdfUrl: string | null
  docxHtml?: string | null
  fileContent?: string | null
  width?: number
  height?: number
}

const PreviewContent: React.FC<PreviewContentProps> = ({
  loading,
  error,
  pdfUrl,
  docxHtml,
  fileContent,
  width = 650,
  height = 700,
}) => {
  const [pdfError, setPdfError] = useState<string | null>(null)

  if (loading) return <div>본문 불러오는 중...</div>
  if (error) return <div style={{ color: 'red' }}>{error}</div>
  if (pdfError) return <div style={{ color: 'red' }}>{pdfError}</div>
  if (pdfUrl) {
    return (
      <div
        style={{
          width,
          height,
          overflow: 'auto',
          background: '#f8f8f8',
          borderRadius: 8,
        }}
      >
        <PDFDocument
          file={pdfUrl}
          onLoadError={(err) => setPdfError('PDF 로드 실패: ' + err.message)}
          loading="PDF 불러오는 중..."
        >
          <PDFPage pageNumber={1} width={width - 32} height={undefined} />
        </PDFDocument>
      </div>
    )
  } else if (docxHtml) {
    return (
      <div
        style={{
          background: '#f8f8f8',
          padding: 16,
          borderRadius: 8,
          width,
          minHeight: height,
          maxHeight: height,
          overflow: 'auto',
          fontFamily:
            'Noto Sans KR, Malgun Gothic, Apple SD Gothic Neo, sans-serif',
        }}
        dangerouslySetInnerHTML={{ __html: docxHtml }}
      />
    )
  } else if (fileContent) {
    return (
      <pre
        style={{
          textAlign: 'left',
          maxHeight: height,
          minHeight: height,
          overflow: 'auto',
          background: '#f8f8f8',
          padding: 16,
          borderRadius: 8,
          width,
          fontFamily:
            'Noto Sans KR, Malgun Gothic, Apple SD Gothic Neo, sans-serif',
        }}
      >
        {fileContent}
      </pre>
    )
  }
  return null
}

export default PreviewContent
