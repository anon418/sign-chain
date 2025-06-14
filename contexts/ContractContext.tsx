'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'

interface Contract {
  _id: string
  title: string
  status: string
  createdAt: string
  signed?: boolean
  recipientEmail?: string
  uploaderId?: string
  recipientId?: string
  signature?: any
  deletedBy?: string[]
  received?: boolean
  filePath?: string
  expirationDate?: string
  senderEmail?: string
  qrCode?: string
}

interface ContractContextType {
  contracts: Contract[]
  loading: boolean
  refreshContracts: () => Promise<void>
}

const ContractContext = createContext<ContractContextType | undefined>(
  undefined
)

export function ContractProvider({ children }: { children: React.ReactNode }) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)

  const refreshContracts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/contract', { credentials: 'include' })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setContracts(data || [])
    } catch {
      setContracts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    async function safeRefresh() {
      if (ignore) return
      await refreshContracts()
    }
    safeRefresh()
    const interval = setInterval(safeRefresh, 10000)
    return () => {
      ignore = true
      clearInterval(interval)
    }
  }, [refreshContracts])

  return (
    <ContractContext.Provider value={{ contracts, loading, refreshContracts }}>
      {children}
    </ContractContext.Provider>
  )
}

export function useContractContext() {
  const ctx = useContext(ContractContext)
  if (!ctx)
    throw new Error('useContractContext must be used within a ContractProvider')
  return ctx
}
