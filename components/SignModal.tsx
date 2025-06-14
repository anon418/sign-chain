import React from 'react'
import ContractSignatureSection from './ContractSignatureSection'

interface SignModalProps {
  signContractId: string
  signContractHash: string
  onSigned: () => void
  signStatus: string
}

export default function SignModal({
  signContractId,
  signContractHash,
  onSigned,
  signStatus,
}: SignModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#0008',
        zIndex: 2200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          padding: 32,
          minWidth: 340,
          boxShadow: '0 2px 16px #0003',
          textAlign: 'center',
        }}
      >
        <h2>계약서 서명</h2>
        <ContractSignatureSection
          contractId={signContractId}
          contractHash={signContractHash}
          onSigned={onSigned}
        />
        {signStatus && (
          <div style={{ color: 'green', marginTop: 16 }}>{signStatus}</div>
        )}
      </div>
    </div>
  )
}
