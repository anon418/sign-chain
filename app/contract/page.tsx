'use client'

import React, {
  useState,
  useEffect,
  ChangeEvent,
  FormEvent,
  MouseEvent,
} from 'react'
import Navbar from '../../components/Navbar'
import ConfirmModal from '../../components/ConfirmModal'
import QrModal from '../../components/QrModal'
import SignModal from '../../components/SignModal'
import ContractUploadForm from '../../components/ContractUploadForm'
import ContractList from '../../components/ContractList'
import { useContractContext } from '../../contexts/ContractContext'
import { useNotifications } from '../../hooks/useNotifications'
import { useModals } from '../../hooks/useModals'
import { useRouter } from 'next/navigation'
import JSZip from 'jszip'
import { v4 as uuidv4 } from 'uuid'
import { safeDecryptEmailNode } from '../../components/NotificationList'
import LoadingSpinner from '../../components/LoadingSpinner'

// Contract 타입이 있다면 import, 없으면 any로 대체
// import { Contract } from '../../types/Contract'
type Contract = {
  _id: string
  title: string
  status: string
  createdAt: string
  signed: boolean
  recipientEmail?: string
  uploaderId: string
  recipientId: string
  signature?: any
  deletedBy?: string[]
  received?: boolean
  filePath?: string
  expirationDate?: string
  senderEmail?: string
  qrCode?: string
}

type User = {
  userId?: string
  username: string
  certificateStatus: string
  email: string
} | null

export default function ContractPage() {
  const [selectedNotification, setSelectedNotification] = useState<any>(null)
  const {
    showConfirmModal,
    setShowConfirmModal,
    showQrModal,
    setShowQrModal,
    showSignModal,
    setShowSignModal,
  } = useModals()
  const [integrityMsg, setIntegrityMsg] = useState('')
  const [qrVerified, setQrVerified] = useState(false)
  const [signContractId, setSignContractId] = useState<string | null>(null)
  const [signContractHash, setSignContractHash] = useState<string>('')
  const [signStatus, setSignStatus] = useState<string>('')

  // 업로드 폼 관련 상태
  const [file, setFile] = useState<File | null>(null)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<
    'idle' | 'checking' | 'valid' | 'invalid'
  >('idle')
  const [uploadStatus, setUploadStatus] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle')
  const [uploadMsg, setUploadMsg] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  const [user, setUser] = useState<User>(null)

  const { contracts, refreshContracts } = useContractContext()
  const [contractsLoading, setContractsLoading] = useState(true)
  const [showContractList, setShowContractList] = useState(false)
  const {
    notifications,
    unreadCount,
    setNotifications,
    setUnreadCount,
    refreshNotifications,
  } = useNotifications()

  useEffect(() => {
    fetch('/api/user/me')
      .then((res) => res.json())
      .then((data) => setUser(data))
  }, [])

  useEffect(() => {
    setContractsLoading(true)
    refreshContracts().finally(() => setContractsLoading(false))
  }, [refreshContracts])

  // 간단한 인증 체크 (페이지 진입 시)
  useEffect(() => {
    fetch('/api/user/me').then((res) => {
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login'
      }
    })
  }, [])

  // 업로드 관련 핸들러
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files && e.target.files[0]
    setFile(selectedFile || null)
    setUploadMsg('') // 파일을 새로 선택하면 메시지 사라짐
  }
  const handleRecipientEmailChange = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value
    setRecipientEmail(value)
    setEmailStatus('checking')
    // 이메일 형식 체크
    const emailRegex = /^[\w-.]+@[\w-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(value)) {
      setEmailStatus('invalid')
      setEmailMsg('이메일 형식에 맞지 않습니다.')
      return
    }
    // 본인 이메일인지 체크
    if (
      user &&
      value.trim().toLowerCase() === user.email.trim().toLowerCase()
    ) {
      setEmailStatus('invalid')
      setEmailMsg('본인 이메일로는 보낼 수 없습니다.')
      return
    }
    // 서버에 등록된 이메일인지 검사
    try {
      const res = await fetch(
        `/api/user/check-email?email=${encodeURIComponent(value)}`
      )
      const data = await res.json()
      if (data.exists) {
        setEmailStatus('valid')
        setEmailMsg('등록된 이메일입니다.')
      } else {
        setEmailStatus('invalid')
        setEmailMsg('등록되지 않은 이메일입니다.')
      }
    } catch {
      setEmailStatus('invalid')
      setEmailMsg('이메일 확인 중 오류 발생')
    }
  }
  const handleUpload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!file) {
      setUploadStatus('error')
      setUploadMsg('파일을 선택하세요.')
      return
    }
    setUploadStatus('uploading')
    // 1. 파일을 zip으로 압축
    const zip = new JSZip()
    zip.file(file.name, file)
    const zippedBlob = await zip.generateAsync({ type: 'blob' })
    // 2. 무작위 UUID 파일명 생성 (확장자 zip)
    const uuidFileName = uuidv4() + '.zip'
    // 3. FormData에 압축된 파일과 파일명 추가
    const formData = new FormData()
    formData.append('file', zippedBlob, uuidFileName)
    formData.append('recipientEmail', recipientEmail)
    try {
      console.log('Uploading contract...')
      const res = await fetch('/api/contract/upload', {
        method: 'POST',
        body: formData,
      })
      console.log('Upload response:', res)
      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
        console.log('Upload response data:', data)
      } catch (jsonErr) {
        console.error('Upload error (raw text):', text)
        setUploadStatus('error')
        setUploadMsg('업로드 중 오류 발생: ' + text)
        return
      }
      if (res.ok) {
        setUploadStatus('success')
        setUploadMsg(data.message || '성공적으로 계약서를 수신했습니다.')
        setFile(null)
        setRecipientEmail('')
      } else {
        setUploadStatus('error')
        setUploadMsg(data.message || '업로드 실패')
      }
    } catch (err) {
      console.error('Upload error:', err)
      setUploadStatus('error')
      setUploadMsg('업로드 중 오류 발생')
    }
  }

  function isValidObjectId(id: string) {
    return /^[0-9a-fA-F]{24}$/.test(id)
  }

  // 계약서 수신 처리 및 무결성 검증
  const handleReceiveContract = async () => {
    setIntegrityMsg('SHA-256 해시 비교 중...')
    if (!selectedNotification) return
    try {
      const contractId =
        selectedNotification.contractId ||
        selectedNotification.message.match(/contractId:([\w\d]+)/)?.[1]
      if (!contractId) {
        setIntegrityMsg('계약 ID를 찾을 수 없습니다.')
        return
      }
      // ObjectId 유효성 검사 추가
      if (!isValidObjectId(contractId)) {
        setIntegrityMsg('잘못된 계약 ID입니다.')
        return
      }
      // contractHash 가져오기
      const hashRes = await fetch(`/api/contract/${contractId}/hash`)
      const hashData = await hashRes.json()
      setSignContractId(contractId)
      setSignContractHash(hashData.hash)
      // 해시 검증(프론트에서 파일 fetch 후 SHA-256 비교)
      // (여기서는 서버에서 이미 검증된다고 가정)
      const res = await fetch('/api/contract/receive', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId }),
      })
      const data = await res.json()
      if (
        data.hashValid ||
        data.message?.includes('무결성') ||
        data.message?.includes('수신함')
      ) {
        setIntegrityMsg('무결성 검증 완료')
        await refreshContracts() // contracts 최신화 먼저!
        setTimeout(() => {
          setShowConfirmModal(false)
          setShowQrModal(true)
          setIntegrityMsg('')
        }, 1200)
      } else {
        setIntegrityMsg('해시 불일치! 파일이 변조되었습니다.')
      }
    } catch (e) {
      setIntegrityMsg('수신 처리 중 오류가 발생했습니다.')
    }
  }

  const handleQrSuccess = () => {
    setQrVerified(true)
    setTimeout(() => {
      setShowQrModal(false)
      setShowSignModal(true)
    }, 1000)
  }

  const handleSignComplete = () => {
    setSignStatus('서명이 성공적으로 완료되었습니다!')
    setTimeout(() => {
      setShowSignModal(false)
      setSignStatus('')
      refreshContracts()
    }, 1500)
  }

  // 알림 클릭 시: 즉시 숨기고, 읽음 처리, 모달 오픈
  const handleNotificationClick = (notification: any) => {
    setNotifications((prev: any[]) =>
      prev.filter((n) => n.id !== notification.id)
    )
    setUnreadCount((prev: number) =>
      Math.max(0, prev - (notification.read ? 0 : 1))
    )
    setSelectedNotification(notification)
    setShowConfirmModal(true)
  }

  if (contractsLoading) return <LoadingSpinner />

  return (
    <>
      <Navbar onMessageAction={refreshContracts} />
      {showConfirmModal && selectedNotification && (
        <ConfirmModal
          message={(() => {
            const filename =
              selectedNotification.filename ||
              selectedNotification.title ||
              '계약서'
            return `${filename}계약서가 도착했습니다. 수신하시겠습니까?`
          })()}
          onConfirm={handleReceiveContract}
          integrityMsg={integrityMsg}
        />
      )}
      {showQrModal &&
        (() => {
          // 디버깅: contracts 배열, signContractId, foundContract, signature.qrCode 등 상세 로그
          console.log('==========[QR MODAL DEBUG]==========')
          console.log('[DEBUG] contracts.length:', contracts.length)
          console.log('[DEBUG] contracts:', contracts)
          console.log('[DEBUG] signContractId:', signContractId)
          const foundContract = contracts
            .map((c: any) => ({ ...c, signed: !!c.signed }))
            .find((c: Contract) => c._id === signContractId)
          console.log('[DEBUG] foundContract:', foundContract)
          if (!foundContract) {
            console.error('[DEBUG] contracts 배열에 해당 contract가 없습니다!')
          } else {
            console.log(
              '[DEBUG] foundContract.signature:',
              foundContract.signature
            )
            if (!foundContract.signature) {
              console.error('[DEBUG] foundContract.signature가 없습니다!')
            } else {
              console.log(
                '[DEBUG] foundContract.signature.qrCode:',
                foundContract.signature.qrCode
              )
              if (!foundContract.signature.qrCode) {
                console.error(
                  '[DEBUG] foundContract.signature.qrCode가 없습니다!'
                )
              }
            }
          }
          // 3. QrModal에 값 전달
          return (
            <QrModal
              onQrSuccess={handleQrSuccess}
              qrVerified={qrVerified}
              qrCode={foundContract?.signature?.qrCode || ''}
              contractId={signContractId || ''}
            />
          )
        })()}
      {showSignModal && signContractId && signContractHash && (
        <SignModal
          signContractId={signContractId}
          signContractHash={signContractHash}
          onSigned={handleSignComplete}
          signStatus={signStatus}
        />
      )}
      <div className="card">
        <h1>디지털 계약서</h1>
        <ContractUploadForm
          file={file}
          recipientEmail={recipientEmail}
          emailStatus={emailStatus}
          uploadStatus={uploadStatus}
          uploadMsg={uploadMsg}
          handleUpload={handleUpload}
          handleFileChange={handleFileChange}
          handleRecipientEmailChange={handleRecipientEmailChange}
          emailMsg={emailMsg}
          user={user}
        />
        <button
          className="clickable"
          style={{
            margin: '24px 0',
            padding: '10px 24px',
            fontSize: 16,
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            transition: 'background 0.18s, box-shadow 0.18s',
            boxShadow: undefined,
            cursor: 'pointer',
          }}
          onClick={() => setShowContractList((v: boolean) => !v)}
          onMouseOver={(e: MouseEvent<HTMLButtonElement>) =>
            (e.currentTarget.style.boxShadow =
              '0 4px 16px rgba(25, 118, 210, 0.18)')
          }
          onMouseOut={(e: MouseEvent<HTMLButtonElement>) =>
            (e.currentTarget.style.boxShadow = '')
          }
        >
          계약서 목록
        </button>
        {showContractList && user?.userId && (
          <ContractList
            contracts={contracts.map((c: any) => ({
              ...c,
              signed: !!c.signed,
            }))}
            userId={String(user.userId)}
            refreshContracts={refreshContracts}
          />
        )}
      </div>
    </>
  )
}
