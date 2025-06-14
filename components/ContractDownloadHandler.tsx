import React, { useState, useRef } from 'react'
import { FaDownload } from 'react-icons/fa'
import { decryptLocal } from '../utils/crypto'
import ConfirmModal from './ConfirmModal'
import forge from 'node-forge'

interface ContractDownloadHandlerProps {
  contract: {
    _id: string
    title: string
    status: string
  }
  type: 'sent' | 'received'
  onSign?: (contract: any) => void
}

const ContractDownloadHandler: React.FC<ContractDownloadHandlerProps> = ({
  contract,
  type,
  onSign,
}) => {
  const [showExpireModal, setShowExpireModal] = useState(false)
  const [showPasswordBox, setShowPasswordBox] = useState(false)
  const [password, setPassword] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const [integrityModal, setIntegrityModal] = useState<null | {
    msg: string
    onConfirm: () => void
  }>(null)
  const [showRenewModal, setShowRenewModal] = useState(false)

  // 다운로드 버튼 활성화 조건
  const canDownload =
    (type === 'sent' && contract.status !== 'expired') || // 송신자: 만료 상태가 아니면 활성화
    (type === 'received' && contract.status === 'signed') // 수신자: 서명 완료된 경우만 활성화

  // 다운로드 버튼 핸들러
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setDownloadError('')
    if (!canDownload) {
      // 수신자: 인증 전이면 무결성 검증 후 서명 플로우 시작
      if (type === 'received' && contract.status !== 'signed' && onSign) {
        // 무결성 검증 로직 (예시: 서버에 해시 검증 요청)
        try {
          const res = await fetch(
            `/api/contract/${contract._id}/verify-integrity`
          )
          const data = await res.json()
          if (data.valid) {
            setIntegrityModal({
              msg: '무결성 검증 성공: 계약서가 변조되지 않았습니다. 인증 및 서명을 진행합니다.',
              onConfirm: () => {
                setIntegrityModal(null)
                onSign(contract)
              },
            })
          } else {
            setIntegrityModal({
              msg: '무결성 검증 실패: 계약서가 변조되었을 수 있습니다!',
              onConfirm: () => setIntegrityModal(null),
            })
          }
        } catch {
          setIntegrityModal({
            msg: '무결성 검증 중 오류가 발생했습니다.',
            onConfirm: () => setIntegrityModal(null),
          })
        }
      } else {
        setShowExpireModal(true)
      }
      return
    }
    // signed 상태면 무결성 검증 건너뛰고 바로 다운로드 진행
    setShowPasswordBox(true)
    setTimeout(() => passwordInputRef.current?.focus(), 100)
  }

  const doDownload = async () => {
    console.log('[DEBUG] doDownload 함수 진입')
    setDownloading(true)
    setDownloadError('')
    try {
      if (!contract || !contract._id)
        throw new Error('계약 정보가 올바르지 않습니다.')
      if (!contract.title) throw new Error('파일명이 없습니다.')
      if (!password) throw new Error('비밀번호를 입력하세요.')
      // 디버깅 로그 추가
      console.log('[DEBUG] doDownload contract:', contract)
      console.log(
        '[DEBUG] doDownload contract._id:',
        String(contract._id ?? '')
      )
      console.log(
        '[DEBUG] doDownload contract.title:',
        String(contract.title ?? '')
      )
      console.log('[DEBUG] doDownload password:', password)
      const encryptedUserId = localStorage.getItem('userId')
      console.log('encryptedUserId:', encryptedUserId)
      if (encryptedUserId) {
        decryptLocal(encryptedUserId).then(console.log).catch(console.error)
      }
      if (!encryptedUserId) {
        console.error('[DEBUG] doDownload: localStorage에 userId 없음')
        alert(
          '내부 오류: 사용자 정보(userId)가 없습니다.\n로그아웃 후 다시 로그인해 주세요.'
        )
        setDownloadError(
          '내부 오류: 사용자 정보(userId)가 없습니다. 다시 로그인해 주세요.'
        )
        setDownloading(false)
        return
      }
      let userId = ''
      try {
        if (encryptedUserId) {
          userId = await decryptLocal(encryptedUserId)
          console.log('[DEBUG] doDownload 복호화된 userId:', userId)
        }
      } catch (e) {
        console.error('[DEBUG] doDownload userId 복호화 에러:', e)
        alert(
          '내부 오류: 사용자 정보 복호화에 실패했습니다.\n로그아웃 후 다시 로그인해 주세요.'
        )
        setDownloadError(
          '내부 오류: 사용자 정보 복호화 실패. 다시 로그인해 주세요.'
        )
        setDownloading(false)
        return
      }
      if (!userId) {
        console.error('[DEBUG] doDownload: 복호화된 userId 없음')
        alert(
          '내부 오류: 사용자 정보(userId)가 없습니다.\n로그아웃 후 다시 로그인해 주세요.'
        )
        setDownloadError(
          '내부 오류: 사용자 정보(userId)가 없습니다. 다시 로그인해 주세요.'
        )
        setDownloading(false)
        return
      }
      const { loadPrivateKey } = await import('../utils/indexedDB')
      const privateKeyPem = await loadPrivateKey(userId, password)
      console.log('[DEBUG] doDownload privateKeyPem:', privateKeyPem)
      if (!privateKeyPem) {
        console.warn(
          '[DEBUG] downloadContractFile privateKeyPem is undefined or empty!'
        )
        alert('개인키를 불러올 수 없습니다. 비밀번호를 확인하세요.')
        throw new Error('개인키를 불러올 수 없습니다.')
      }
      console.log(
        '[DEBUG] downloadContractFile - 복호화된 privateKeyPem (앞 50):',
        privateKeyPem.slice(0, 50)
      )
      console.log(
        '[DEBUG] downloadContractFile - 복호화된 privateKeyPem 길이:',
        privateKeyPem.length
      )
      // === 키 쌍 검증 추가 ===
      // 서버에서 공개키 받아오기
      let publicKeyFromDB = ''
      try {
        const res = await fetch(`/api/user/public-key?userId=${userId}`)
        if (!res.ok) throw new Error('공개키 조회 실패')
        const data = await res.json()
        publicKeyFromDB = data.publicKey
        console.log('[DEBUG] doDownload publicKeyFromDB:', publicKeyFromDB)
      } catch (e) {
        console.error('[DEBUG] doDownload 공개키 조회 에러:', e)
        throw new Error('서버에서 공개키를 불러올 수 없습니다.')
      }
      // 개인키로 공개키 추출 (디버그)
      let debugResult = debugExtractPublicKey(privateKeyPem)
      let publicKeyFromPrivate: string = debugResult.publicKeyPem ?? ''
      if (!debugResult.ok) {
        alert('개인키에서 공개키 추출 실패: ' + debugResult.reason)
        throw new Error('개인키에서 공개키 추출 실패: ' + debugResult.reason)
      }
      console.log(
        '[DEBUG] publicKeyFromPrivate (앞 50):',
        publicKeyFromPrivate.slice(0, 50)
      )
      console.log(
        '[DEBUG] publicKeyFromDB (앞 50):',
        publicKeyFromDB.slice(0, 50)
      )
      console.log(
        '[DEBUG] 공개키 일치 여부:',
        publicKeyFromPrivate === publicKeyFromDB
      )
      if (publicKeyFromPrivate !== publicKeyFromDB) {
        console.error(
          '[DEBUG] 키 쌍 불일치! 개인키에서 추출한 공개키:',
          publicKeyFromPrivate
        )
        console.error('[DEBUG] DB에 저장된 공개키:', publicKeyFromDB)
        throw new Error(
          '전자서명 키 쌍이 일치하지 않습니다. 키를 재등록하거나 복구해 주세요.'
        )
      }
      // === 기존 다운로드 로직 계속 ===
      // Base64 인코딩
      const privateKeyBase64 = btoa(privateKeyPem || '')
      const fetchHeaders = {
        'x-private-key': privateKeyBase64,
        'Content-Type': 'application/json',
      }
      console.log('[DEBUG] downloadContractFile fetch headers:', fetchHeaders)
      if (!privateKeyPem) throw new Error('개인키를 불러올 수 없습니다')
      // fetch 호출 try/catch로 감싸기
      let res
      try {
        console.log(
          '[DEBUG] doDownload fetch 호출 직전:',
          `/api/contract/${String(contract._id ?? '')}/download`
        )
        res = await fetch(
          `/api/contract/${String(contract._id ?? '')}/download`,
          {
            headers: fetchHeaders,
          }
        )
        console.log('[DEBUG] doDownload fetch 호출 성공:', res)
      } catch (err: any) {
        console.error('[DEBUG] doDownload fetch 함수 호출에서 예외 발생:', err)
        if (err instanceof Error && err.stack) {
          console.error('[DEBUG] doDownload fetch 예외 스택:', err.stack)
        }
        setDownloadError(err.message || '다운로드 실패')
        setDownloading(false)
        return
      }
      // fetch 응답 상태 로그
      console.log('[DEBUG] doDownload fetch response status:', res.status)
      console.log('[DEBUG] doDownload fetch response ok:', res.ok)
      if (!res.ok) {
        let errMsg = '다운로드 실패'
        try {
          const data = await res.json()
          errMsg = data.message || errMsg
          console.error('[DEBUG] doDownload fetch error response:', data)
        } catch (e) {
          console.error('[DEBUG] doDownload fetch error (not JSON):', e)
        }
        throw new Error(errMsg)
      }
      const blob = await res.blob()
      const filename = String(contract.title ?? '')
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
      setShowPasswordBox(false)
      setPassword('')
    } catch (err: any) {
      setDownloadError(err.message || '다운로드 실패')
      console.error('[DEBUG] doDownload 최상위 catch:', err)
      if (err instanceof Error && err.stack) {
        console.error('[DEBUG] doDownload 최상위 예외 스택:', err.stack)
      }
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <button
        title={
          contract.status === 'expired'
            ? '계약서가 만료되어 다운로드할 수 없습니다.'
            : type === 'received' && contract.status !== 'signed'
            ? '모든 인증 및 서명 완료 후 다운로드 가능'
            : '다운로드'
        }
        onClick={canDownload ? handleDownload : (e) => e.preventDefault()}
        style={{
          background: 'none',
          border: 'none',
          cursor: canDownload ? 'pointer' : 'not-allowed',
          padding: 4,
          borderRadius: 4,
          color: canDownload ? '#1976d2' : '#b0b8c1',
          opacity: canDownload ? 0.7 : 0.3,
          transition: 'all 0.2s',
        }}
        disabled={!canDownload}
        onMouseOver={(e) =>
          (e.currentTarget.style.opacity = canDownload ? '1' : '0.3')
        }
        onMouseOut={(e) =>
          (e.currentTarget.style.opacity = canDownload ? '0.7' : '0.3')
        }
      >
        <FaDownload className="clickable" size={16} />
      </button>

      {showExpireModal && (
        <ConfirmModal
          message={
            contract.status === 'expired'
              ? '계약서가 만료되었습니다. 만료일을 연장하시겠습니까?'
              : type === 'received' && contract.status !== 'signed'
              ? '모든 인증 및 서명 완료 후 다운로드 가능합니다.'
              : '다운로드할 수 없습니다.'
          }
          onConfirm={() => {
            setShowExpireModal(false)
            setShowRenewModal(true)
          }}
          onCancel={() => setShowExpireModal(false)}
        />
      )}

      {showPasswordBox && (
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
              padding: '40px 32px',
              minWidth: 320,
              maxWidth: '90vw',
              textAlign: 'center',
              fontSize: 18,
              color: '#222',
              fontWeight: 500,
              border: '2px solid #1976d2',
              letterSpacing: 0.5,
            }}
          >
            <div style={{ marginBottom: 18, fontSize: 20, fontWeight: 700 }}>
              계약서 복호화를 위한 비밀번호 입력
            </div>
            <input
              ref={passwordInputRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              style={{
                width: '90%',
                padding: '10px 12px',
                fontSize: 17,
                borderRadius: 8,
                border: '1px solid #bbb',
                marginBottom: 16,
                outline: 'none',
                letterSpacing: 1,
              }}
              autoFocus
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === 'Enter') doDownload()
              }}
              disabled={downloading}
            />
            <div style={{ color: '#d32f2f', minHeight: 24, marginBottom: 8 }}>
              {downloadError}
            </div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button
                onClick={() => {
                  console.log(
                    '[DEBUG] 비밀번호 확인 버튼 클릭, doDownload 호출'
                  )
                  doDownload()
                }}
                style={{
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: downloading ? 'not-allowed' : 'pointer',
                  opacity: downloading ? 0.6 : 1,
                }}
                disabled={downloading}
              >
                확인
              </button>
              <button
                onClick={() => {
                  setShowPasswordBox(false)
                  setPassword('')
                  setDownloadError('')
                }}
                style={{
                  background: '#eee',
                  color: '#1976d2',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: downloading ? 'not-allowed' : 'pointer',
                  opacity: downloading ? 0.6 : 1,
                }}
                disabled={downloading}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {integrityModal && (
        <ConfirmModal
          message={integrityModal.msg}
          onConfirm={integrityModal.onConfirm}
          onCancel={() => setIntegrityModal(null)}
        />
      )}
    </>
  )
}

// 개인키에서 공개키 추출 디버그 함수
function debugExtractPublicKey(privateKeyPem: string) {
  try {
    if (!privateKeyPem) {
      console.error('[DEBUG] PEM이 비어있음')
      return { ok: false, reason: 'PEM이 비어있음' }
    }
    if (!privateKeyPem.startsWith('-----BEGIN RSA PRIVATE KEY-----')) {
      console.error('[DEBUG] PEM 포맷 이상:', privateKeyPem.slice(0, 50))
      return { ok: false, reason: 'PEM 포맷 이상' }
    }
    let privateKey
    try {
      privateKey = forge.pki.privateKeyFromPem(privateKeyPem)
    } catch (e) {
      console.error('[DEBUG] forge.pki.privateKeyFromPem 실패:', e)
      return { ok: false, reason: 'forge.pki.privateKeyFromPem 실패', error: e }
    }
    let publicKeyPem
    try {
      // 항상 수동 생성
      const publicKey = forge.pki.rsa.setPublicKey(privateKey.n, privateKey.e)
      publicKeyPem = forge.pki.publicKeyToPem(publicKey)
    } catch (e) {
      console.error('[DEBUG] 공개키 추출 실패:', e)
      return { ok: false, reason: '공개키 추출 실패', error: e }
    }
    console.log('[DEBUG] 공개키 추출 성공:', publicKeyPem.slice(0, 50) + '...')
    return { ok: true, publicKeyPem }
  } catch (e) {
    console.error('[DEBUG] 예기치 못한 오류:', e)
    return { ok: false, reason: '예기치 못한 오류', error: e }
  }
}

// 다운로드 핵심 로직을 별도 함수로 분리
export async function downloadContractFile(
  contractId: string,
  contractTitle: string,
  password: string
) {
  // 디버깅 로그 추가
  console.log('[DEBUG] downloadContractFile contractId:', contractId)
  console.log('[DEBUG] downloadContractFile contractTitle:', contractTitle)
  console.log('[DEBUG] downloadContractFile password:', password)
  if (!contractId) throw new Error('계약 ID가 없습니다.')
  if (!contractTitle) throw new Error('파일명이 없습니다.')
  if (!password) throw new Error('비밀번호가 필요합니다.')
  const encryptedUserId = localStorage.getItem('userId')
  const userId = encryptedUserId ? await decryptLocal(encryptedUserId) : ''
  if (!userId) throw new Error('userId 없음')
  const { loadPrivateKey } = await import('../utils/indexedDB')
  const privateKeyPem = await loadPrivateKey(userId, password)
  if (!privateKeyPem) {
    console.warn(
      '[DEBUG] downloadContractFile privateKeyPem is undefined or empty!'
    )
    alert('개인키를 불러올 수 없습니다. 비밀번호를 확인하세요.')
    throw new Error('개인키를 불러올 수 없습니다.')
  }
  console.log(
    '[DEBUG] downloadContractFile - 복호화된 privateKeyPem (앞 50):',
    privateKeyPem.slice(0, 50)
  )
  console.log(
    '[DEBUG] downloadContractFile - 복호화된 privateKeyPem 길이:',
    privateKeyPem.length
  )
  // === 키 쌍 검증 추가 ===
  // 서버에서 공개키 받아오기
  let publicKeyFromDB = ''
  try {
    const res = await fetch(`/api/user/public-key?userId=${userId}`)
    if (!res.ok) throw new Error('공개키 조회 실패')
    const data = await res.json()
    publicKeyFromDB = data.publicKey
  } catch (e) {
    throw new Error('서버에서 공개키를 불러올 수 없습니다.')
  }
  // 개인키로 공개키 추출 (디버그)
  let debugResult = debugExtractPublicKey(privateKeyPem)
  let publicKeyFromPrivate: string = debugResult.publicKeyPem ?? ''
  if (!debugResult.ok) {
    alert('개인키에서 공개키 추출 실패: ' + debugResult.reason)
    throw new Error('개인키에서 공개키 추출 실패: ' + debugResult.reason)
  }
  console.log(
    '[DEBUG] publicKeyFromPrivate (앞 50):',
    publicKeyFromPrivate.slice(0, 50)
  )
  console.log('[DEBUG] publicKeyFromDB (앞 50):', publicKeyFromDB.slice(0, 50))
  console.log(
    '[DEBUG] 공개키 일치 여부:',
    publicKeyFromPrivate === publicKeyFromDB
  )
  if (publicKeyFromPrivate !== publicKeyFromDB) {
    console.error(
      '[DEBUG] 키 쌍 불일치! 개인키에서 추출한 공개키:',
      publicKeyFromPrivate
    )
    console.error('[DEBUG] DB에 저장된 공개키:', publicKeyFromDB)
    throw new Error(
      '전자서명 키 쌍이 일치하지 않습니다. 키를 재등록하거나 복구해 주세요.'
    )
  }
  // === 기존 다운로드 로직 계속 ===
  // Base64 인코딩
  const privateKeyBase64 = btoa(privateKeyPem || '')
  const fetchHeaders = {
    'x-private-key': privateKeyBase64,
    'Content-Type': 'application/json',
  }
  console.log('[DEBUG] downloadContractFile fetch headers:', fetchHeaders)
  if (!privateKeyPem) throw new Error('개인키를 불러올 수 없습니다')
  // fetch 호출 try/catch로 감싸기
  let res
  try {
    console.log(
      '[DEBUG] downloadContractFile fetch 호출 직전:',
      `/api/contract/${String(contractId ?? '')}/download`
    )
    res = await fetch(`/api/contract/${String(contractId ?? '')}/download`, {
      headers: fetchHeaders,
    })
    console.log('[DEBUG] downloadContractFile fetch 호출 성공:', res)
  } catch (err: any) {
    console.error(
      '[DEBUG] downloadContractFile fetch 함수 호출에서 예외 발생:',
      err
    )
    if (err instanceof Error && err.stack) {
      console.error('[DEBUG] downloadContractFile fetch 예외 스택:', err.stack)
    }
    throw err
  }
  // fetch 응답 상태 로그
  console.log('[DEBUG] downloadContractFile fetch response status:', res.status)
  console.log('[DEBUG] downloadContractFile fetch response ok:', res.ok)
  if (!res.ok) {
    let errMsg = '다운로드 실패'
    try {
      const data = await res.json()
      errMsg = data.message || errMsg
      console.error('[DEBUG] downloadContractFile fetch error response:', data)
    } catch (e) {
      console.error('[DEBUG] downloadContractFile fetch error (not JSON):', e)
    }
    throw new Error(errMsg)
  }
  const blob = await res.blob()
  const filename = String(contractTitle ?? '')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

export default ContractDownloadHandler
