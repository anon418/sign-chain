'use client'
export const dynamic = 'force-dynamic'
import { useContractContext } from '../../contexts/ContractContext'
import ReceivedContractList from '../../components/ReceivedContractList'

export default function ReceivedContractsPage() {
  const { contracts, loading } = useContractContext()
  // 수신함 필터링: 받은 계약만
  const myEmail =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('userEmail')
      : ''
  const receivedContracts = (contracts || []).filter(
    (c) => c.recipientEmail === myEmail && c.received === true
  )
  return (
    <ReceivedContractList contracts={receivedContracts} loading={loading} />
  )
}
