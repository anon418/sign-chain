import React, { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { loadPrivateKey } from '../utils/indexedDB'
import forge from 'node-forge'
import { decryptLocal } from '../utils/crypto'

interface Props {
  contractId: string
  contractHash: string
  onSigned?: () => void
  canSign?: boolean
}

const ContractSignatureSection: React.FC<Props> = ({
  contractId,
  contractHash,
  onSigned,
  canSign = true,
}) => {
  const sigCanvas = useRef<SignatureCanvas>(null)
  const [signer, setSigner] = useState('')
  const [status, setStatus] = useState('')
  const [signImageHash, setSignImageHash] = useState('')

  const handleClear = () => {
    sigCanvas.current?.clear()
    setSignImageHash('')
  }

  const handleEnd = () => {
    const signImage = sigCanvas.current?.toDataURL()
    if (signImage) {
      setSignImageHash(signImage)
    }
  }

  const handleSign = async () => {
    // 1. 계약서 정보 조회 및 만료 체크
    const res = await fetch(`/api/contract/${contractId}`)
    const contract = await res.json()
    if (new Date(contract.expirationDate) < new Date()) {
      console.log('계약서 만료:', contract.expirationDate)
      setStatus('계약서가 만료되었습니다. 서명할 수 없습니다.')
      return
    }
    if (!signer) {
      setStatus('서명자 이름을 입력하세요.')
      return
    }
    if (!signImageHash) {
      setStatus('손글씨 서명을 입력하세요.')
      return
    }
    const encryptedUserId = localStorage.getItem('userId') || ''
    const userId = encryptedUserId ? await decryptLocal(encryptedUserId) : ''
    const password = prompt('비밀번호를 입력하세요') || ''
    const privateKeyPem = await loadPrivateKey(userId, password)
    console.log('서명에 사용할 개인키:', privateKeyPem)
    if (!privateKeyPem) {
      setStatus('개인키를 찾을 수 없습니다.')
      return
    }
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem)
    // 계약서 해시값 서명
    const md1 = forge.md.sha256.create()
    md1.update(contractHash, 'utf8')
    const fileSignature = forge.util.encode64(privateKey.sign(md1))
    // 손글씨 해시값 서명
    const md2 = forge.md.sha256.create()
    md2.update(signImageHash, 'utf8')
    const signImageSignature = forge.util.encode64(privateKey.sign(md2))
    console.log('계약서 해시값:', contractHash)
    console.log('손글씨 해시값:', signImageHash)
    console.log('계약서 해시 서명:', fileSignature)
    console.log('손글씨 해시 서명:', signImageSignature)
    // 서버로 전송
    const patchRes = await fetch(`/api/contract/${contractId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileSignature,
        signImageSignature,
        contractHash,
        signImageHash,
        signer,
      }),
    })
    if (patchRes.ok) {
      setStatus('서명 성공!')
      console.log('서명 성공! uploaded → signed 상태 변경')
      sigCanvas.current?.clear()
      setSigner('')
      setSignImageHash('')
      if (onSigned) onSigned()
    } else {
      setStatus('서명 실패')
    }
  }

  return (
    <div
      style={{
        margin: '32px 0',
        padding: 32,
        background: '#f8fafd',
        borderRadius: 16,
        boxShadow: '0 2px 8px #0001',
        minWidth: 480,
      }}
    >
      <h3 style={{ marginBottom: 20, fontSize: 26 }}>✍️ 계약서 서명</h3>
      <input
        type="text"
        placeholder="서명자 이름"
        value={signer}
        onChange={(e) => setSigner(e.target.value)}
        style={{
          padding: '12px',
          width: '100%',
          marginBottom: '16px',
          fontSize: 18,
        }}
      />
      <SignatureCanvas
        penColor="black"
        canvasProps={{ width: 1000, height: 400, className: 'sigCanvas' }}
        ref={sigCanvas}
        backgroundColor="#f0f0f0"
        onEnd={handleEnd}
      />
      <div
        style={{
          marginTop: '16px',
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={handleClear}
          style={{
            padding: '12px 24px',
            backgroundColor: '#757575',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: 18,
          }}
        >
          지우기
        </button>
        <button
          onClick={handleSign}
          style={{
            padding: '12px 24px',
            backgroundColor: '#8bc34a',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: canSign ? 'pointer' : 'not-allowed',
            fontSize: 18,
          }}
          disabled={!canSign}
        >
          서명 제출
        </button>
      </div>
      {status && <p style={{ marginTop: '16px', fontSize: 18 }}>{status}</p>}
    </div>
  )
}

export default ContractSignatureSection
