import { NextRequest, NextResponse } from 'next/server'
import { connectDBForApp } from '../../../../lib/dbConnect'
import Contract from '../../../../models/Contract'
import { readFileSync } from 'fs'
import path from 'path'
import forge from 'node-forge'
import Log from '../../../../models/Log'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { ContractStatus } from '../../../../constants/contractStatus'
import mongoose from 'mongoose'

const UPLOAD_DIR = 'uploads'

// 인증: 항상 string|null 반환
async function getUserFromRequest(req: NextRequest): Promise<string | null> {
  const cookie = req.cookies.get('token')?.value
  if (!cookie || !process.env.JWT_SECRET) return null
  try {
    const decoded = jwt.verify(cookie, process.env.JWT_SECRET)
    if (typeof decoded === 'object' && decoded !== null) {
      return (decoded._id || decoded.id || decoded.userId || null) as
        | string
        | null
    }
    return null
  } catch {
    return null
  }
}

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  await connectDBForApp()
  const userId = await getUserFromRequest(req)
  const id = context.params.id

  // ObjectId 유효성 검사
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { message: '잘못된 계약 ID입니다.' },
      { status: 400 }
    )
  }

  const contract = await Contract.findById(id)
  if (
    !contract ||
    (contract.deletedBy &&
      userId &&
      contract.deletedBy.map(String).includes(userId))
  ) {
    return NextResponse.json(
      { message: '계약서를 찾을 수 없습니다.' },
      { status: 404 }
    )
  }
  if (
    contract.expirationDate < new Date() &&
    contract.status !== ContractStatus.Expired
  ) {
    contract.status = ContractStatus.Expired
    await contract.save()
  }
  if (contract.status === ContractStatus.Expired) {
    return NextResponse.json(
      { message: '계약서가 만료되었습니다.' },
      { status: 400 }
    )
  }
  const filePath = contract.filePath
  const safeFilePath = contract.filePath.replace(/^[/\\]+/, '')
  const resolvedPath = path.resolve(UPLOAD_DIR, safeFilePath)
  let fileBuffer
  try {
    fileBuffer = readFileSync(resolvedPath)
  } catch (e) {
    return NextResponse.json(
      { message: '파일을 읽을 수 없습니다.' },
      { status: 500 }
    )
  }
  // 무결성 검증
  const fileHash = contract.security?.fileHash
  const hash = crypto
    .createHash('sha256')
    .update(fileBuffer as unknown as crypto.BinaryLike)
    .digest('hex')
  if (!fileHash || hash !== fileHash) {
    return NextResponse.json(
      { message: '무결성 검증 실패: 파일이 위변조되었습니다.' },
      { status: 400 }
    )
  }
  // 로그 기록 (view)
  const lastLog = await Log.findOne({ contractId: contract._id }).sort({
    _id: -1,
  })
  const previousHash = lastLog ? lastLog.hash : ''
  await Log.create({
    contractId: contract._id,
    filePath: contract.filePath,
    encapsulation: 'view',
    tag: 'contract',
    hash: hash,
    previousHash,
    filename: contract.title,
  })
  const fileBase64 = fileBuffer.toString('base64')
  // 메타데이터 로드(예시)
  let metadata = {}
  try {
    metadata = JSON.parse(
      readFileSync(filePath.replace(/\.enc$/, '-metadata.json'), 'utf8')
    )
  } catch {}
  return NextResponse.json({
    ...contract.toObject(),
    encryptedFileBase64: fileBase64,
    metadata,
  })
}

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  await connectDBForApp()
  const userId = await getUserFromRequest(req)
  if (!userId)
    return NextResponse.json({ message: '인증 필요' }, { status: 401 })
  const id = context.params.id

  // ObjectId 유효성 검사
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { message: '잘못된 계약 ID입니다.' },
      { status: 400 }
    )
  }

  const body = await req.json()
  const {
    contractHash,
    signature,
    signatureImage,
    signatureImageHash,
    signatureImageHashSignature,
    signer,
    status,
    rejectReason,
  } = body
  const contract = await Contract.findById(id)
  if (!contract)
    return NextResponse.json({ message: 'Contract not found' }, { status: 404 })
  if (
    contract.expirationDate < new Date() &&
    contract.status !== ContractStatus.Expired
  ) {
    contract.status = ContractStatus.Expired
    await contract.save()
  }
  if (contract.status === ContractStatus.Expired) {
    return NextResponse.json(
      { message: '계약서가 만료되었습니다.' },
      { status: 400 }
    )
  }
  // status 값 검증
  const allowedStatuses = [
    ContractStatus.Uploaded,
    ContractStatus.Signed,
    ContractStatus.Expired,
    ContractStatus.Rejected,
  ]
  if (status && !allowedStatuses.includes(status)) {
    return NextResponse.json(
      { message: '유효하지 않은 상태값입니다.' },
      { status: 400 }
    )
  }
  if (status === ContractStatus.Rejected) {
    contract.status = ContractStatus.Rejected
    await contract.save()
    const lastLog = await Log.findOne({ contractId: contract._id }).sort({
      _id: -1,
    })
    const previousHash = lastLog ? lastLog.hash : ''
    await Log.create({
      contractId: contract._id,
      filePath: contract.filePath,
      encapsulation: 'reject',
      tag: 'contract',
      hash: contract.security?.fileHash || '',
      previousHash,
      filename: contract.title,
    })
    return NextResponse.json({ message: 'Contract rejected' })
  }
  // 손글씨/전자서명 처리: 모든 값이 있을 때만 signed 처리
  if (
    contractHash &&
    signature &&
    signatureImage &&
    signatureImageHash &&
    signatureImageHashSignature &&
    signer
  ) {
    if (!contract.signature) contract.signature = { signed: false }
    contract.signature.signature = signature
    contract.signature.signatureImageDigital = signatureImage
    contract.signature.signatureImageHash = signatureImageHash
    contract.signature.signatureImageHashSignature = signatureImageHashSignature
    contract.signature.signed = true
    contract.signature.signer = signer
    contract.status = ContractStatus.Signed
    await contract.save()
    const lastLog = await Log.findOne({ contractId: contract._id }).sort({
      _id: -1,
    })
    const previousHash = lastLog ? lastLog.hash : ''
    await Log.create({
      contractId: contract._id,
      filePath: contract.filePath,
      encapsulation: 'hand-sign',
      tag: 'contract',
      hash: signatureImageHash || contract.security?.fileHash || '',
      previousHash,
      filename: contract.title,
    })
    return NextResponse.json({ message: 'Hand & digital signature saved' })
  } else if (status === ContractStatus.Uploaded) {
    contract.status = ContractStatus.Uploaded
    await contract.save()
    return NextResponse.json({ message: '상태가 업로드로 변경됨' })
  } else if (status === ContractStatus.Expired) {
    contract.status = ContractStatus.Expired
    await contract.save()
    return NextResponse.json({ message: '상태가 만료로 변경됨' })
  } else {
    return NextResponse.json(
      { message: '서명 데이터가 부족합니다.' },
      { status: 400 }
    )
  }
}

export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  await connectDBForApp()
  const id = context.params.id

  // ObjectId 유효성 검사
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { message: '잘못된 계약 ID입니다.' },
      { status: 400 }
    )
  }

  const body = await req.json()
  const { fileData } = body
  const contract = await Contract.findById(id)
  if (!contract)
    return NextResponse.json({ message: 'Contract not found' }, { status: 404 })
  const fileHash = contract.security?.fileHash
  if (!fileHash) {
    return NextResponse.json(
      { message: '파일 해시 정보가 없습니다.' },
      { status: 500 }
    )
  }
  const md = forge.md.sha256.create()
  md.update(fileData, 'utf8')
  const receivedFileHash = md.digest().toHex()
  if (receivedFileHash !== fileHash) {
    return NextResponse.json(
      { message: 'Integrity check failed' },
      { status: 400 }
    )
  }
  return NextResponse.json({ message: 'Integrity check passed' })
}

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  await connectDBForApp()
  const userId = await getUserFromRequest(req)
  const id = context.params.id

  // ObjectId 유효성 검사
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { message: '잘못된 계약 ID입니다.' },
      { status: 400 }
    )
  }

  const contract = await Contract.findById(id)
  if (!contract)
    return NextResponse.json(
      { message: '계약서를 찾을 수 없습니다.' },
      { status: 404 }
    )
  if (!userId)
    return NextResponse.json({ message: '인증 필요' }, { status: 401 })
  if (contract.deletedBy && contract.deletedBy.map(String).includes(userId)) {
    return NextResponse.json({ message: '이미 삭제됨' })
  }
  contract.deletedBy = [...(contract.deletedBy || []), userId]
  if (
    contract.deletedBy.map(String).includes(String(contract.uploaderId)) &&
    contract.deletedBy.map(String).includes(String(contract.recipientId))
  ) {
    await Contract.findByIdAndDelete(id)
    return NextResponse.json({ message: '계약서 완전 삭제' })
  } else {
    await contract.save()
    return NextResponse.json({ message: 'soft delete 완료' })
  }
}
