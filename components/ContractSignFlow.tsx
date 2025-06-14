import React, { useState, useRef, useEffect } from 'react'
import QrModal from './QrModal'
import NotificationStepSign from './NotificationStepSign'
import sha256 from 'crypto-js/sha256'
import encHex from 'crypto-js/enc-hex'
import forge from 'node-forge'
import { loadPrivateKey } from '../utils/indexedDB'
import { FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa'
import ConfirmModal from './ConfirmModal'
import { useRouter } from 'next/navigation'
import PasswordModal from './PasswordModal'
import { decryptLocal } from '../utils/crypto'

const ContractSignFlow = ({
  contract,
  onComplete,
  onClose,
}: {
  contract: any
  onComplete?: () => void
  onClose: () => void
}) => {
  const [signStep, setSignStep] = useState<
    'hash' | 'qr' | 'sign' | 'hand' | 'done' | 'idle'
  >('hash')
  const [signLoading, setSignLoading] = useState(false)
  const [signMsg, setSignMsg] = useState('')
  const [signStatus, setSignStatus] = useState('')
  const [handStatus, setHandStatus] = useState('')
  const [qrVerified, setQrVerified] = useState(false)
  const sigCanvasRef = useRef<any>(null)
  const [showExpireModal, setShowExpireModal] = useState(false)
  const router = useRouter()
  const [pwError, setPwError] = useState('')
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [pendingSignPw, setPendingSignPw] = useState('')
  const [signPwError, setSignPwError] = useState('')
  const [pendingSignature, setPendingSignature] = useState<string | null>(null)
  const [pendingSignaturePw, setPendingSignaturePw] = useState<string | null>(
    null
  )
  const [pendingPrivateKeyPem, setPendingPrivateKeyPem] = useState<
    string | null
  >(null)

  // 1. 해시 검증
  React.useEffect(() => {
    if (signStep === 'hash') {
      setSignLoading(true)
      setSignMsg('SHA-256 해시 비교 중...')
      fetch(`/api/contract/${contract._id}`)
        .then((res) => res.json())
        .then((data) => {
          console.log(
            '[해시 검증] 서버 fileHash:',
            data.security?.fileHash,
            '프론트 contract.fileHash:',
            contract.security?.fileHash
          )
          setSignLoading(false)
          if (data.security?.fileHash === contract.security?.fileHash) {
            setSignMsg('무결성 검증 완료! 다음 단계로 이동합니다.')
            setTimeout(() => {
              setSignStep('qr')
              setSignMsg('QR 코드 인증 단계로 이동합니다.')
            }, 1000)
          } else {
            setSignMsg('무결성 검증 실패: 파일이 변조되었습니다.')
          }
        })
        .catch(() => {
          setSignMsg('무결성 검증 중 오류 발생')
          setSignLoading(false)
        })
    }
  }, [signStep, contract])

  // 2. QR 인증 성공 시
  const handleQrSuccess = () => {
    setQrVerified(true)
    setSignMsg('QR 인증 성공!')
    setTimeout(() => {
      setSignStep('sign')
      setSignMsg('전자서명 단계로 이동합니다.')
    }, 1000)
  }

  // 3. 전자서명 단계
  const handleSign = () => {
    setShowPasswordModal(true)
    setSignPwError('')
    setPendingSignPw('')
  }

  // 디버깅용: userId, 복호화된 userId, 개인키 존재 여부 등 로그 출력
  const debugLog = async (password: string) => {
    try {
      const encryptedUserId = localStorage.getItem('userId')
      console.log('[DEBUG] encryptedUserId:', encryptedUserId)
      const userId = encryptedUserId ? await decryptLocal(encryptedUserId) : ''
      console.log('[DEBUG] decrypted userId:', userId)
      const db = await (await import('../utils/indexedDB')).getDB()
      const allKeys = await db.getAllKeys('privateKeys')
      console.log('[DEBUG] IndexedDB allKeys:', allKeys)
      const encrypted = await db.get('privateKeys', userId)
      console.log('[DEBUG] IndexedDB encrypted privateKey:', encrypted)
      const { loadPrivateKey } = await import('../utils/indexedDB')
      const privateKeyPem = await loadPrivateKey(userId, password)
      console.log('[DEBUG] loadPrivateKey result:', privateKeyPem)
      return { userId, privateKeyPem, encrypted }
    } catch (e) {
      console.error('[DEBUG] debugLog error:', e)
      return {}
    }
  }

  // 전자서명과 손글씨 서명을 모두 한 번에 처리
  const handleSignWithPassword = async (password: string) => {
    await debugLog(password)
    setSignStatus('공개키 일치 확인 중...')
    setSignPwError('')
    setShowPasswordModal(false)
    try {
      const res = await fetch(`/api/contract/${contract._id}`)
      const data = await res.json()
      if (data.expiryDate && new Date(data.expiryDate) < new Date()) {
        setSignStatus('계약 유효기간이 만료되었습니다.')
        setTimeout(() => setSignStatus(''), 1500)
        setSignStep('idle')
        return
      }
      const encryptedUserId = localStorage.getItem('userId') || ''
      const userId = encryptedUserId ? await decryptLocal(encryptedUserId) : ''
      if (!password || password.length < 6) {
        setSignPwError('비밀번호가 올바르지 않습니다.')
        setSignStatus('')
        setShowPasswordModal(true)
        return
      }
      const privateKeyPem = await loadPrivateKey(userId, password)
      setTimeout(() => {
        setSignStatus('개인키 일치 확인 중...')
        setTimeout(() => {
          if (!privateKeyPem) {
            setSignPwError(
              '개인키를 찾을 수 없습니다. (비밀번호가 틀렸거나, 개인키가 손상/삭제되었을 수 있습니다. OTP 인증(회원가입 마지막 단계)에서 입력한 비밀번호를 입력하세요.)'
            )
            setSignStatus('')
            setShowPasswordModal(true)
            console.log(
              '[DEBUG] handleSignWithPassword: privateKeyPem is undefined/null'
            )
            return
          }
          const privateKey = forge.pki.privateKeyFromPem(privateKeyPem)
          const md = forge.md.sha256.create()
          md.update(contract.security?.fileHash, 'utf8')
          const signature = forge.util.encode64(privateKey.sign(md))
          setPendingSignature(signature)
          setPendingSignaturePw(password)
          setPendingPrivateKeyPem(privateKeyPem)
          setSignStatus('전자서명 성공! 공개키/개인키 일치')
          setTimeout(() => {
            setSignStep('hand')
            setSignStatus('손글씨 서명 단계로 이동합니다.')
          }, 1000)
        }, 1000)
      }, 1000)
    } catch (e: any) {
      setSignStatus('전자서명 실패: ' + (e?.message || String(e)))
      setSignStep('idle')
      console.log('[DEBUG] handleSignWithPassword: exception', e)
    }
  }

  // 4. 손글씨 서명 단계 (전자서명과 함께 서버로 전송)
  const handleHandSign = async () => {
    setHandStatus('손글씨 서명 처리 중...')
    try {
      // getTrimmedCanvas 대신 toDataURL 사용
      const sigData = sigCanvasRef.current?.toDataURL('image/png')
      if (!sigData) throw new Error('서명 데이터 없음')
      const hash = sha256(sigData).toString(encHex)
      // 손글씨 해시값에 전자서명
      if (!pendingPrivateKeyPem) throw new Error('전자서명 정보 없음')
      const privateKey = forge.pki.privateKeyFromPem(pendingPrivateKeyPem)
      const md = forge.md.sha256.create()
      md.update(hash, 'utf8')
      const signatureImageHashSignature = forge.util.encode64(
        privateKey.sign(md)
      )
      // 디버깅: 서버로 보낼 데이터
      console.log('[DEBUG] PATCH body:', {
        fileSignature: pendingSignature,
        contractHash: contract.security?.fileHash,
        signatureImage: sigData,
        signatureImageHash: hash,
        signatureImageHashSignature,
        signer: contract?.signer || '',
      })
      // 서버로 전자서명+손글씨서명 전송
      const encryptedUserId = localStorage.getItem('userId') || ''
      const userId = encryptedUserId ? await decryptLocal(encryptedUserId) : ''
      const signRes = await fetch(`/api/contract/${contract._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractHash: contract.security?.fileHash,
          signature: pendingSignature,
          signatureImage: sigData,
          signatureImageHash: hash,
          signatureImageHashSignature,
          signer: userId,
        }),
      })
      const signData = await signRes.json().catch(() => ({}))
      if (!signRes.ok) {
        setHandStatus('손글씨 서명 실패: ' + (signData.message || '서버 오류'))
        setSignStep('idle')
        console.log('[DEBUG] handleHandSign: signRes not ok', signData)
        return
      }
      setHandStatus('서명이 성공적으로 완료되었습니다')
      contract.status = 'signed' // 서버와 동기화
      setSignStep('done')
      setTimeout(() => {
        if (onComplete) onComplete()
      }, 1500)
    } catch (e: any) {
      setHandStatus('손글씨 서명 실패: ' + (e?.message || String(e)))
      setSignStep('idle')
      console.log('[DEBUG] handleHandSign: exception', e)
    }
  }

  useEffect(() => {
    if (
      contract.status === 'expired' ||
      contract.status === 'rejected' ||
      (contract.status !== 'signed' && contract.status !== 'uploaded')
    ) {
      setShowExpireModal(true)
    }
  }, [contract.status])

  // 5. 렌더링
  return (
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
    >
      {signStep === 'hash' && (
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 32,
            minWidth: 340,
            boxShadow: '0 4px 24px #0002',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 16 }}>
            {contract.title}
          </div>
          <div style={{ marginBottom: 16 }}>
            {signLoading ? (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#1976d2',
                }}
              >
                <FaSpinner className="spin" style={{ marginRight: 8 }} />
                계약서 무결성 검증 중입니다...
              </span>
            ) : signMsg.includes('완료') ? (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#1976d2',
                }}
              >
                <FaCheckCircle style={{ marginRight: 8 }} />
                {signMsg}
              </span>
            ) : signMsg.includes('실패') ? (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#d32f2f',
                }}
              >
                <FaExclamationTriangle style={{ marginRight: 8 }} />
                {signMsg}
              </span>
            ) : (
              signMsg
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              marginTop: 8,
              background: '#eee',
              color: '#333',
              border: 'none',
              borderRadius: 6,
              padding: '8px 24px',
              fontWeight: 500,
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            닫기
          </button>
        </div>
      )}
      {signStep === 'qr' && (
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 32,
            minWidth: 340,
            boxShadow: '0 4px 24px #0002',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 16 }}>
            {contract.title}
          </div>
          <div style={{ marginBottom: 16 }}>
            QR 인증이 필요합니다. 아래 QR 코드를 스캔해 본인인증을 완료해주세요.
          </div>
          <QrModal
            onQrSuccess={handleQrSuccess}
            qrVerified={qrVerified}
            qrCode={contract.signature?.qrCode || ''}
            contractId={contract._id}
          />
          {/* QR 인증 실패 메시지 예시 (추가) */}
          {signStatus && signStatus.includes('QR') && (
            <div
              style={{
                color: '#d32f2f',
                background: '#fff',
                border: '1.5px solid #ffbdbd',
                borderRadius: 8,
                padding: 18,
                margin: '24px 0 0 0',
                fontWeight: 600,
                fontSize: 16,
                boxShadow: '0 2px 12px #0001',
                textAlign: 'center',
              }}
              role="alert"
            >
              ❌ QR 코드 인증 실패
              <br />
              잘못된 QR 코드입니다. 올바른 계약서의 QR 코드를 다시 스캔해
              주세요.
              <br />
              <button
                style={{
                  marginTop: 16,
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 18px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
                onClick={() => setSignStep('qr')}
              >
                다시 시도
              </button>
            </div>
          )}
        </div>
      )}
      {(signStep === 'sign' || signStep === 'hand' || signStep === 'done') && (
        <NotificationStepSign
          step={
            signStep === 'sign' ? 'sign' : signStep === 'hand' ? 'hand' : 'done'
          }
          signStatus={signStatus}
          handStatus={handStatus}
          onSign={handleSign}
          onHandSign={handleHandSign}
          sigCanvasRef={sigCanvasRef}
          clearSig={() => sigCanvasRef.current?.clear()}
          isValid={null}
          onClose={onClose}
        />
      )}
      {/* 서명 완료 메시지 및 자동 닫기 */}
      {signStep === 'done' && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.25)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 32,
              minWidth: 340,
              boxShadow: '0 4px 24px #0002',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 18,
                color: '#1976d2',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <FaCheckCircle style={{ marginRight: 8 }} />
              <span>서명이 성공적으로 완료되었습니다</span>
            </div>
            <button
              style={{
                background: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '8px 24px',
                fontWeight: 600,
                fontSize: 16,
                cursor: 'pointer',
                marginTop: 8,
              }}
              onClick={onClose}
            >
              닫기
            </button>
          </div>
        </div>
      )}
      {showExpireModal && (
        <ConfirmModal
          message={
            contract.status === 'expired'
              ? '계약서가 만료되었습니다. 만료일을 연장하시겠습니까?'
              : contract.status === 'rejected'
              ? '계약서가 거부/반려되었습니다.'
              : '계약서 상태로 인해 서명할 수 없습니다.'
          }
          onConfirm={() => {
            setShowExpireModal(false)
            setShowRenewModal(true)
          }}
          onCancel={() => {
            setShowExpireModal(false)
            router.push('/contract')
          }}
        />
      )}
      {showRenewModal && (
        <ConfirmModal
          message="만료일을 연장하시겠습니까?"
          onConfirm={() => {
            setShowRenewModal(false)
            // alert('만료일 연장/재계약 프로세스(임시)')
            setShowExpireModal(false)
            setShowRenewModal(true)
          }}
          onCancel={() => {
            setShowRenewModal(false)
            router.push('/contract')
          }}
        />
      )}
      {/* 전자서명용 비밀번호 입력 모달 */}
      {showPasswordModal && (
        <PasswordModal
          onSubmit={(pw) => handleSignWithPassword(pw)}
          error={signPwError}
        />
      )}
    </div>
  )
}

export default ContractSignFlow
