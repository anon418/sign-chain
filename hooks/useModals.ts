import { useState } from 'react'

export function useModals() {
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)
  // ... 기타 모달 상태

  return {
    showConfirmModal,
    setShowConfirmModal,
    showQrModal,
    setShowQrModal,
    showSignModal,
    setShowSignModal,
    // ...
  }
}
