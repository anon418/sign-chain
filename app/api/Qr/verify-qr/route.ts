import { NextRequest, NextResponse } from 'next/server'
import { connectDBForApp } from '../../../../lib/dbConnect'
import Contract from '../../../../models/Contract'
import Log from '../../../../models/Log'
import mongoose from 'mongoose'

export async function POST(req: NextRequest) {
  await connectDBForApp()
  try {
    const body = await req.json()
    const { contractId, qrCode } = body
    console.log('[QR VERIFY] contractId:', contractId, typeof contractId)
    console.log('[QR VERIFY] qrCode:', qrCode, typeof qrCode)
    // contractId와 qrCode가 모두 일치하는 계약만 인증
    if (!contractId || !qrCode) {
      return NextResponse.json(
        { message: 'contractId와 qrCode가 필요합니다.', success: false },
        { status: 400 }
      )
    }
    let objectId
    try {
      objectId = new mongoose.Types.ObjectId(contractId)
    } catch (e) {
      return NextResponse.json(
        { message: 'contractId 형식이 올바르지 않습니다.', success: false },
        { status: 400 }
      )
    }
    const contract = await Contract.findOne({
      _id: objectId,
      'signature.qrCode': qrCode.trim(),
    })
    console.log('[QR VERIFY] contract:', contract)
    if (contract && contract.signature) {
      console.log(
        '[QR VERIFY] contract.signature.qrCode:',
        contract.signature.qrCode
      )
    }
    if (!contract) {
      return NextResponse.json(
        { message: 'QR 코드 인증 실패: 올바른 QR이 아닙니다.', success: false },
        { status: 400 }
      )
    }
    let logData = {
      contractId: contract._id,
      filePath: contract.filePath || '',
      encapsulation: 'qr',
      tag: 'qr_verified',
      hash: '',
      filename: contract.title || '',
      qrCode: qrCode,
      verified: true,
      timestamp: new Date(),
      previousHash: '',
    }
    // Find previous log for this contract
    let previousHash = ''
    if (contract) {
      const lastLog = await Log.findOne({ contractId: contract._id }).sort({
        _id: -1,
      })
      previousHash = lastLog ? lastLog.hash : ''
    }
    logData.previousHash = previousHash
    try {
      await Log.create(logData)
    } catch (e) {
      // 로그 기록 실패 시 무시
    }
    return NextResponse.json({ message: 'QR 코드 인증 성공', success: true })
  } catch (error: any) {
    console.error('QR 코드 검증 오류:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
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
