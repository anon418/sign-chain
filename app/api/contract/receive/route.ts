import { NextRequest, NextResponse } from 'next/server'
import { connectDBForApp } from '../../../../lib/dbConnect'
import Contract from '../../../../models/Contract'
import jwt from 'jsonwebtoken'
import { ContractStatus } from '../../../../constants/contractStatus'

async function getUserFromRequest(req: NextRequest) {
  const cookie = req.cookies.get('token')?.value
  if (!cookie || !process.env.JWT_SECRET) return null
  try {
    return jwt.verify(cookie, process.env.JWT_SECRET)
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  return PATCH(req)
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}

export async function PATCH(req: NextRequest) {
  await connectDBForApp()
  const user = await getUserFromRequest(req)
  if (!user)
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { contractId, received, status, deleted } = body
  if (!contractId)
    return NextResponse.json(
      { message: 'contractId required' },
      { status: 400 }
    )
  const contract = await Contract.findById(contractId)
  if (!contract)
    return NextResponse.json({ message: 'Contract not found' }, { status: 404 })
  if (typeof received === 'boolean') contract.received = received
  if (status) contract.status = status
  // 거부(취소) 시 무조건 rejected
  if (received === false) contract.status = ContractStatus.Rejected
  // 송신자/수신자 모두 deletedBy에 포함되면 완전 삭제
  let userId = typeof user === 'string' ? user : user.id || user.sub || ''
  if (body.deletedBy) {
    contract.deletedBy = Array.from(
      new Set([...(contract.deletedBy || []), userId.toString()])
    )
    // 수신자가 수신함에서 삭제(휴지통) 시
    if (body.deletedBy && userId === String(contract.recipientId)) {
      contract.deletedBy = Array.from(
        new Set([...(contract.deletedBy || []), userId.toString()])
      )
      // signed면 상태 그대로, uploaded(미서명)면 rejected 처리
      if (contract.status !== ContractStatus.Signed) {
        contract.status = ContractStatus.Rejected
        contract.received = false
      }
      // 송신자+수신자 모두 삭제 시 완전 삭제
      if (
        contract.deletedBy.map(String).includes(String(contract.uploaderId)) &&
        contract.deletedBy.map(String).includes(String(contract.recipientId))
      ) {
        await Contract.findByIdAndDelete(contractId)
        return NextResponse.json({ message: '계약서 완전 삭제' })
      }
    }
  }
  // PATCH: 수신자가 계약을 삭제하거나 회원탈퇴 시 rejected 처리
  if (typeof deleted === 'boolean' && deleted === true) {
    contract.status = ContractStatus.Rejected
    await contract.save()
    // 송신자 알림은 생성하지 않음
    return NextResponse.json({
      message: '수신자가 계약을 삭제하여 거부 처리됨',
      status: ContractStatus.Rejected,
    })
  }
  await contract.save()
  return NextResponse.json({
    message: 'Contract updated',
    received: contract.received,
    status: contract.status,
    deletedBy: contract.deletedBy,
  })
}
