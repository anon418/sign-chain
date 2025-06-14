import React from 'react'
import { FaTrashAlt } from 'react-icons/fa'

export default function ReceivedContractCard({
  contract,
  onClick,
  refEl,
  focusedIdx,
  idx,
  arr,
  setFocusedIdx,
  handlePreview,
  isMobile,
  onDelete,
}: any) {
  return (
    <div
      key={contract._id}
      ref={refEl}
      tabIndex={0}
      style={{
        border: '1px solid #eee',
        borderRadius: 10,
        padding: isMobile ? 14 : 20,
        width: isMobile ? '100%' : 340,
        background: '#fafbfc',
        boxShadow: '0 2px 8px #0001',
        cursor: 'pointer',
        outline: focusedIdx === idx ? '2px solid #1976d2' : 'none',
        margin: isMobile ? '0 auto' : undefined,
      }}
      onClick={onClick}
      onFocus={() => setFocusedIdx(idx)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick()
        if (e.key === 'ArrowRight' && idx < arr.length - 1)
          setFocusedIdx(idx + 1)
        if (e.key === 'ArrowLeft' && idx > 0) setFocusedIdx(idx - 1)
        if (e.key === 'ArrowDown' && idx + 2 < arr.length)
          setFocusedIdx(idx + 2)
        if (e.key === 'ArrowUp' && idx - 2 >= 0) setFocusedIdx(idx - 2)
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
        {contract.title}
      </div>
      <div style={{ fontSize: 14, color: '#1976d2', marginBottom: 4 }}>
        송신자: {contract.senderEmail}
      </div>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
        수신자: {contract.recipientEmail}
      </div>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
        업로드: {new Date(contract.createdAt).toLocaleString()}
      </div>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
        최종 처리: {new Date(contract.updatedAt).toLocaleString()}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color:
              contract.status === 'signed'
                ? '#009e3c'
                : contract.status === 'pending_signature'
                ? '#1976d2'
                : contract.status === 'uploaded'
                ? '#ff9800'
                : contract.status === 'expired' ||
                  new Date(contract.expirationDate) < new Date()
                ? '#fff'
                : contract.status === 'rejected'
                ? '#fff'
                : '#888',
            background:
              contract.status === 'signed'
                ? '#e6f9ed'
                : contract.status === 'pending_signature'
                ? '#e3f0ff'
                : contract.status === 'uploaded'
                ? '#fff7e6'
                : contract.status === 'expired' ||
                  new Date(contract.expirationDate) < new Date()
                ? '#ff5252'
                : contract.status === 'rejected'
                ? '#ff5252'
                : '#f4f4f4',
            borderRadius: 6,
            padding: '2px 10px',
            marginRight: 4,
          }}
          aria-label={`상태: ${contract.status}`}
        >
          {contract.status}
        </span>
        <span
          style={{
            fontSize: 12,
            color:
              new Date(contract.expirationDate) < new Date()
                ? '#ff5252'
                : '#888',
            fontWeight:
              new Date(contract.expirationDate) < new Date() ? 700 : 400,
          }}
        >
          만료일: {new Date(contract.expirationDate).toLocaleDateString()}
          {new Date(contract.expirationDate) < new Date() && ' (만료됨)'}
        </span>
      </div>
      <a
        href={contract.filePath}
        download
        style={{
          color: '#1976d2',
          fontWeight: 500,
          textDecoration: 'underline',
          fontSize: 15,
        }}
      >
        계약서 다운로드
      </a>
      <button
        style={{
          marginLeft: 8,
          background: '#eee',
          color: '#1976d2',
          border: 'none',
          borderRadius: 6,
          padding: '4px 12px',
          fontWeight: 500,
          fontSize: 14,
          cursor: 'pointer',
        }}
        onClick={(e) => {
          e.stopPropagation()
          handlePreview(contract)
        }}
        aria-label="미리보기"
      >
        미리보기
      </button>
      <button
        style={{
          marginLeft: 8,
          background: 'none',
          border: 'none',
          color: '#ff5252',
          cursor: 'pointer',
          fontSize: 20,
          display: 'inline-flex',
          alignItems: 'center',
          verticalAlign: 'middle',
        }}
        title="삭제"
        aria-label="삭제"
        onClick={(e) => {
          e.stopPropagation()
          console.debug('[DEBUG] 수신자 삭제 버튼 클릭:', contract._id)
          if (onDelete) onDelete(contract)
        }}
      >
        <FaTrashAlt />
      </button>
    </div>
  )
}
