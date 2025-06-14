import { NextRequest, NextResponse } from 'next/server'
import { connectDBForApp } from '../../../../../lib/dbConnect'
import Contract from '../../../../../models/Contract'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import forge from 'node-forge'
import { ContractStatus } from '../../../../../constants/contractStatus'

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  await connectDBForApp()
  const contractId = context.params.id
  const contract = await Contract.findById(contractId)
  if (!contract) {
    return NextResponse.json({ message: 'Contract not found' }, { status: 404 })
  }
  // 만료일이 지났으면 DB에도 expired로 반영
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
      { status: 403 }
    )
  }
  let userId = ''
  const cookie = req.cookies.get('token')?.value
  if (!cookie || !process.env.JWT_SECRET) {
    return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 })
  }
  try {
    const decoded = require('jsonwebtoken').verify(
      cookie,
      process.env.JWT_SECRET
    )
    if (typeof decoded === 'object' && decoded !== null) {
      userId = decoded.id || decoded._id || decoded.userId || ''
    }
  } catch {
    return NextResponse.json(
      { message: '유효하지 않은 토큰입니다.' },
      { status: 401 }
    )
  }
  const previewDir = path.join(process.cwd(), 'previews')
  // 확장자 추정 (pdf, txt, docx)
  const exts = ['pdf', 'txt', 'docx']
  let found = false
  let previewPath = ''
  let ext = ''
  for (const e of exts) {
    const p = path.join(previewDir, `${contractId}.${e}`)
    if (existsSync(p)) {
      previewPath = p
      ext = e
      found = true
      break
    }
  }
  if (!found) {
    return NextResponse.json(
      { message: '미리보기 파일이 없습니다.' },
      { status: 404 }
    )
  }
  if (
    contract.status === 'rejected' &&
    userId === contract.recipientId?.toString()
  ) {
    return NextResponse.json(
      { message: '계약서가 반려되어 더 이상 열람할 수 없습니다.' },
      { status: 403 }
    )
  }
  try {
    const buf = readFileSync(previewPath)
    if (ext === 'txt' || ext === 'docx') {
      return NextResponse.json({
        preview: buf.toString('utf-8'),
        filename: `${contractId}.${ext}`,
      })
    } else if (ext === 'pdf') {
      return new Response(buf, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${contractId}.pdf"`,
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
        },
      })
    } else {
      return NextResponse.json(
        { message: '미리보기를 지원하지 않는 파일 형식입니다.' },
        { status: 400 }
      )
    }
  } catch (e) {
    return NextResponse.json(
      { message: '미리보기 파일 읽기 실패' },
      { status: 500 }
    )
  }
}
